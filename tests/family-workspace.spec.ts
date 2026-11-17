import type { Page } from "@playwright/test";
import { test, expect } from "./fixture";

async function setUpFamily(
  page: Page,
  email = "parent@example.test",
  learners = ["River", "Sky"],
) {
  await page.goto("/");
  await page.getByRole("button", { name: "Set up family access" }).click();
  await page.getByLabel("Parent email").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Fictional-parent-password-42");
  await page.getByLabel("Family setup code").fill("fictional-family-invite");
  await page.getByRole("button", { name: "Create family account" }).click();
  await expect(
    page.getByRole("heading", { name: "Who’s learning today?" }),
  ).toBeVisible();
  for (const name of learners) {
    await page.getByLabel("Learner name").fill(name);
    await page.getByRole("button", { name: "Add Learner" }).click();
    await expect(
      page.getByRole("button", { name: `Open ${name}’s workspace` }),
    ).toBeVisible();
  }
}

test("a parent establishes a family and two Learners without child email accounts", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("parent-access.png"),
    fullPage: true,
  });
  await setUpFamily(page);
  await page.screenshot({
    path: testInfo.outputPath("learner-picker.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Open River’s workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "River’s learning workspace" }),
  ).toBeVisible();
  await expect(
    page.getByText("Fictional-data preview", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("learner-workspace.png"),
    fullPage: true,
  });
  if (process.env.TEST_APP_MODE === "services") {
    expect(
      (
        await page.request.post("/eve/v1/session", {
          data: { message: "Fictional preview check" },
        })
      ).status(),
    ).toBe(401);
    expect(
      (await page.request.get("/eve/v1/session/unowned/stream")).status(),
    ).toBe(401);
  }
});

test("a trusted browser returns to its selected Learner after reload and a new application process", async ({
  page,
  browser,
  app,
}) => {
  await setUpFamily(page);
  await page.getByRole("button", { name: "Open River’s workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "River’s learning workspace" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "River’s learning workspace" }),
  ).toBeVisible();
  const storageState = await page.context().storageState();
  await app.restart();
  const returning = await browser.newContext({
    storageState,
    baseURL: app.url,
  });
  const returnPage = await returning.newPage();
  await returnPage.goto("/");
  await expect(
    returnPage.getByRole("heading", { name: "River’s learning workspace" }),
  ).toBeVisible();
  await returnPage.getByRole("button", { name: "Switch Learner" }).click();
  await expect(
    returnPage.getByRole("button", { name: "Open Sky’s workspace" }),
  ).toBeVisible();
  await returning.close();
});

test("only an authenticated owning family can read or select a Learner", async ({
  page,
  browser,
  app,
}) => {
  await setUpFamily(page);
  const family = await (await page.request.get("/api/family")).json();
  const riverId = family.learners.find(
    (learner: { name: string }) => learner.name === "River",
  ).id;
  const ownWorkspace = await page.request.get(`/api/learners/${riverId}`);
  expect(ownWorkspace.status()).toBe(200);
  expect(await ownWorkspace.json()).toEqual({ id: riverId, name: "River" });

  const stranger = await browser.newContext({ baseURL: app.url });
  expect((await stranger.request.get("/api/family")).status()).toBe(401);
  expect(
    (await stranger.request.get(`/api/learners/${riverId}`)).status(),
  ).toBe(401);
  expect(
    (
      await stranger.request.post("/api/selection", {
        data: { learnerId: riverId },
        headers: { origin: app.url },
      })
    ).status(),
  ).toBe(401);
  const otherPage = await stranger.newPage();
  await setUpFamily(otherPage, "other@example.test", ["Fern"]);
  const foreignWorkspace = await otherPage.request.get(
    `/api/learners/${riverId}`,
  );
  expect(foreignWorkspace.status()).toBe(404);
  expect(await foreignWorkspace.text()).not.toContain("River");
  expect(
    (
      await otherPage.request.post("/api/selection", {
        data: { learnerId: riverId },
        headers: { origin: app.url },
      })
    ).status(),
  ).toBe(404);
  const otherFamily = await (
    await otherPage.request.get(
      `/api/family?familyId=${family.id ?? "manipulated"}`,
    )
  ).json();
  expect(
    otherFamily.learners.map((learner: { name: string }) => learner.name),
  ).toEqual(["Fern"]);
  expect(otherFamily.selectedLearnerId).toBeNull();
  await stranger.close();
});

test("switching Learners clears the prior draft while the selection request is pending", async ({
  page,
}) => {
  await setUpFamily(page);
  await page.getByRole("button", { name: "Open River’s workspace" }).click();
  await page.getByRole("button", { name: "Start an activity" }).click();
  await page.getByLabel("My scratchpad").fill("River’s temporary idea");
  let finishSelection!: () => void;
  const heldSelection = new Promise<void>((resolve) => {
    finishSelection = resolve;
  });
  await page.route("**/api/selection", async (route) => {
    const response = await route.fetch();
    if (route.request().postDataJSON().learnerId === null) await heldSelection;
    await route.fulfill({ response });
  });
  try {
    await page.getByRole("button", { name: "Switch Learner" }).click();
    await expect(page.getByLabel("My scratchpad")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Open Sky’s workspace" }),
    ).toBeDisabled();
  } finally {
    finishSelection();
  }
  await page.getByRole("button", { name: "Open Sky’s workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Sky’s learning workspace" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start an activity" }).click();
  await expect(page.getByLabel("My scratchpad")).toHaveValue("");
  await page.getByRole("button", { name: "Switch Learner" }).click();
  await page.getByRole("button", { name: "Open River’s workspace" }).click();
  await expect(page.getByLabel("My scratchpad")).toHaveValue("");
});

test("private invitations and real sign-in keep separate trusted browsers independent", async ({
  page,
  browser,
  app,
}) => {
  const anonymous = await browser.newContext({ baseURL: app.url });
  const uninvited = await anonymous.request.post("/api/auth/sign-up/email", {
    data: {
      name: "Fictional parent",
      email: "uninvited@example.test",
      password: "Fictional-parent-password-42",
    },
    headers: {
      origin: app.url,
      "x-family-setup-code": "fictional-family-invite",
    },
  });
  expect(uninvited.status()).toBe(403);
  const wrongCode = await anonymous.request.post("/api/auth/sign-up/email", {
    data: {
      name: "Fictional parent",
      email: "parent@example.test",
      password: "Fictional-parent-password-42",
    },
    headers: {
      origin: app.url,
      "x-family-setup-code": "not-the-correct-invitation",
    },
  });
  expect(wrongCode.status()).toBe(403);
  await anonymous.close();

  await setUpFamily(page);
  await page.getByRole("button", { name: "Open River’s workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "River’s learning workspace" }),
  ).toBeVisible();
  const secondDevice = await browser.newContext({ baseURL: app.url });
  const sibling = await secondDevice.newPage();
  await sibling.goto("/");
  await sibling.getByLabel("Parent email").fill("parent@example.test");
  await sibling
    .getByLabel("Password", { exact: true })
    .fill("Fictional-parent-password-42");
  await sibling.getByRole("button", { name: "Sign in", exact: true }).click();
  await sibling.getByRole("button", { name: "Open Sky’s workspace" }).click();
  await expect(
    sibling.getByRole("heading", { name: "Sky’s learning workspace" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "River’s learning workspace" }),
  ).toBeVisible();
  const csrf = await sibling.request.post("/api/selection", {
    data: { learnerId: null },
    headers: { origin: "https://untrusted.example" },
  });
  expect(csrf.status()).toBe(403);
  await sibling.getByRole("button", { name: "Sign out" }).click();
  await expect(
    sibling.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  expect((await sibling.request.get("/api/family")).status()).toBe(401);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "River’s learning workspace" }),
  ).toBeVisible();
  await secondDevice.close();
});
