import type { Page } from "@playwright/test";
import { test, expect } from "./fixture";

async function openWorkspace(page: Page, email = "parent@example.test") {
  await page.goto("/");
  await page.getByRole("button", { name: "Set up family access" }).click();
  await page.getByLabel("Parent email").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Fictional-parent-password-42");
  await page.getByLabel("Family setup code").fill("fictional-family-invite");
  await page.getByRole("button", { name: "Create family account" }).click();
  for (const name of ["River", "Sky"]) {
    await page.getByLabel("Learner name").fill(name);
    await page.getByRole("button", { name: "Add Learner" }).click();
    await expect(
      page.getByRole("button", { name: `Open ${name}’s workspace` }),
    ).toBeVisible();
  }
  await page.getByRole("button", { name: "Open River’s workspace" }).click();
}
const attempt = "I tried 4 in each cup because 6 groups of 4 make 24.";
const reflection =
  "I first guessed 3. Drawing the groups helped me check my idea.";

async function writeAttempt(
  page: Page,
  tutor: { reply: (text: string) => void },
) {
  tutor.reply("Draw six cups and try sharing the pencils.");
  await page.getByRole("button", { name: "Start an activity" }).click();
  await page
    .getByLabel("Your question")
    .fill("How can I share 24 pencils among 6 cups?");
  await page.getByRole("button", { name: "Ask Tutor", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("Draw six cups");
  tutor.reply("A polished Tutor explanation is not your own explanation.");
  await page.getByLabel("Your message").fill(attempt);
  await page
    .getByRole("button", { name: "Share attempt", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("polished Tutor explanation");
}

async function chooseEvidence(page: Page) {
  await page.getByRole("button", { name: "Save Learning evidence" }).click();
  await page.getByRole("checkbox", { name: attempt, exact: true }).check();
  await page.getByLabel("Entry title").fill("My pencil experiment");
  await page.getByLabel("My reflection").fill(reflection);
}

test("a Learner saves only selected written work and their own reflection", async ({
  page,
  tutor,
}, testInfo) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await openWorkspace(page);
  await writeAttempt(page, tutor);
  await chooseEvidence(page);
  await expect(
    page.getByRole("checkbox", {
      name: "How can I share 24 pencils among 6 cups?",
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Save to Portfolio", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Saved to your Portfolio",
  );
  await page.getByRole("button", { name: "My Portfolio", exact: true }).click();
  await page
    .getByRole("button", { name: "Open My pencil experiment", exact: true })
    .click();
  const entry = page.getByRole("region", { name: "Selected Portfolio entry" });
  await expect(entry).toContainText(attempt);
  await expect(entry).toContainText(reflection);
  await expect(entry).not.toContainText("polished Tutor explanation");
  await expect(entry).not.toContainText("How can I share 24");
  await expect(page.getByRole("region", { name: "Conversation" })).toHaveCount(
    0,
  );
  await page.screenshot({ path: testInfo.outputPath("portfolio-laptop.png") });
});

test("a lost save response retries once after activity end and survives a fresh visit with the Tutor unavailable", async ({
  page,
  tutor,
  app,
  browser,
}) => {
  await openWorkspace(page);
  await writeAttempt(page, tutor);
  await chooseEvidence(page);
  let savedInput:
    | {
        id: string;
        sessionId: string;
        actionIds: string[];
        title: string;
        reflection: string;
      }
    | undefined;
  await page.route(
    "**/api/learners/*/portfolio",
    async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      savedInput = route.request().postDataJSON();
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      await route.abort("connectionreset");
    },
    { times: 1 },
  );
  await page
    .getByRole("button", { name: "Save to Portfolio", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "save wasn’t confirmed",
  );
  const family = await (await page.request.get("/api/family")).json();
  const learnerId = family.selectedLearnerId;
  const endpoint = `/api/learners/${learnerId}/portfolio`;
  await page.request.post(
    `/api/learners/${learnerId}/session/${savedInput!.sessionId}`,
    { headers: { origin: app.url }, data: { intent: "end" } },
  );
  await page.getByRole("button", { name: "Retry save", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Saved to your Portfolio",
  );
  const replays = await Promise.all(
    [1, 2].map(() =>
      page.request.post(endpoint, {
        headers: { origin: app.url },
        data: savedInput,
      }),
    ),
  );
  expect(replays.map((response) => response.status())).toEqual([200, 200]);
  expect(
    (await (await page.request.get(endpoint)).json()).entries,
  ).toHaveLength(1);
  expect(
    (
      await page.request.post(endpoint, {
        headers: { origin: app.url },
        data: {
          ...savedInput,
          reflection: "A different save under the same ID",
        },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await page.request.get(
        `/api/learners/${learnerId}/session/${savedInput!.sessionId}`,
      )
    ).status(),
  ).toBe(404);
  await app.restart();
  const returnVisit = await browser.newContext({ baseURL: app.url });
  try {
    const returning = await returnVisit.newPage();
    await returning.goto("/");
    await returning.getByLabel("Parent email").fill("parent@example.test");
    await returning
      .getByLabel("Password", { exact: true })
      .fill("Fictional-parent-password-42");
    await returning
      .getByRole("button", { name: "Sign in", exact: true })
      .click();
    await returning
      .getByRole("button", { name: "Open River’s workspace" })
      .click();
    await returning.getByRole("button", { name: "Start an activity" }).click();
    await returning.getByLabel("Your question").fill("What can I learn today?");
    await returning
      .getByRole("button", { name: "Ask Tutor", exact: true })
      .click();
    await expect(
      returning
        .getByRole("region", { name: "Conversation" })
        .getByRole("alert"),
    ).toContainText("couldn’t reply");
    await returning
      .getByRole("button", { name: "My Portfolio", exact: true })
      .click();
    await expect(
      returning.getByRole("button", {
        name: "Open My pencil experiment",
        exact: true,
      }),
    ).toHaveCount(1);
    await returning
      .getByRole("button", { name: "Open My pencil experiment", exact: true })
      .click();
    await expect(
      returning.getByRole("region", { name: "Selected Portfolio entry" }),
    ).toContainText(reflection);
    await expect(
      returning.getByRole("region", { name: "Selected Portfolio entry" }),
    ).toContainText(attempt);
    expect(tutor.requests).toHaveLength(3);
  } finally {
    await returnVisit.close();
  }
});

test("a Learner revises their own reflection and deliberately shows one entry to their parent", async ({
  page,
  tutor,
}, testInfo) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await openWorkspace(page);
  await writeAttempt(page, tutor);
  await chooseEvidence(page);
  await page.screenshot({
    path: testInfo.outputPath("evidence-selection-laptop.png"),
  });
  await page
    .getByRole("button", { name: "Save to Portfolio", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Saved to your Portfolio",
  );
  await page.getByRole("button", { name: "My Portfolio", exact: true }).click();
  await page
    .getByRole("button", { name: "Open My pencil experiment", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Edit my reflection", exact: true })
    .click();
  const revised =
    "I checked a second way: 4 + 4 + 4 + 4 + 4 + 4 = 24.\nI want to try five cups next.";
  await page.getByLabel("My reflection", { exact: true }).fill(revised);
  await page
    .getByRole("button", { name: "Save reflection", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Selected Portfolio entry" }),
  ).toContainText(revised);
  await page.reload();
  await page.getByRole("button", { name: "My Portfolio", exact: true }).click();
  await page
    .getByRole("button", { name: "Open My pencil experiment", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Selected Portfolio entry" }),
  ).toContainText(revised);
  await expect(
    page.getByRole("region", { name: "Selected Portfolio entry" }),
  ).not.toContainText(reflection);
  await page
    .getByRole("button", { name: "Show my parent", exact: true })
    .click();
  const shown = page.getByRole("region", { name: "Entry to show my parent" });
  await expect(shown).toContainText(attempt);
  await expect(shown).toContainText(revised);
  await expect(shown).not.toContainText("polished Tutor explanation");
  await expect(
    page.getByRole("button", { name: "Edit my reflection", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath("show-parent-laptop.png"),
  });
  expect(tutor.requests).toHaveLength(2);
});

test("Portfolio reads, source references, saves and edits enforce the intended family and Learner", async ({
  page,
  tutor,
  app,
  browser,
}) => {
  await openWorkspace(page);
  await writeAttempt(page, tutor);
  const family = await (await page.request.get("/api/family")).json();
  const riverId = family.selectedLearnerId;
  const skyId = family.learners.find(
    (learner: { name: string }) => learner.name === "Sky",
  ).id;
  const endpoint = `/api/learners/${riverId}/portfolio`;
  const source = (
    await (await page.request.get(`/api/learners/${riverId}/session`)).json()
  ).session;
  const input = {
    id: "river-written-work",
    sessionId: source.id,
    actionIds: [source.actions.at(-1).id],
    title: "River’s selected idea",
    reflection,
  };
  const saves = await Promise.all(
    [1, 2].map(() =>
      page.request.post(endpoint, {
        headers: { origin: app.url },
        data: input,
      }),
    ),
  );
  expect(saves.map((response) => response.status())).toEqual([200, 200]);
  const entry = (await saves[0].json()).entry;
  expect((await saves[1].json()).entry.id).toBe(entry.id);
  expect(entry.evidence).toEqual([
    { actionId: source.actions.at(-1).id, text: attempt, intent: "attempt" },
  ]);
  const direct = `${endpoint}/${entry.id}`;
  const sibling = `/api/learners/${skyId}/portfolio`;
  expect((await page.request.get(`${sibling}/${entry.id}`)).status()).toBe(404);
  expect(
    (
      await page.request.post(sibling, {
        headers: { origin: app.url },
        data: input,
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await page.request.post(sibling, {
        headers: { origin: app.url },
        data: { ...input, id: "new-sibling-save" },
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await page.request.patch(`${sibling}/${entry.id}`, {
        headers: { origin: app.url },
        data: { reflection: "Sibling overwrite" },
      })
    ).status(),
  ).toBe(404);
  const siblingSession = (
    await (
      await page.request.post(`/api/learners/${skyId}/session`, {
        headers: { origin: app.url },
        data: {},
      })
    ).json()
  ).session;
  expect(
    (
      await page.request.post(sibling, {
        headers: { origin: app.url },
        data: {
          ...input,
          id: "stolen-source-action",
          sessionId: siblingSession.id,
        },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.post(endpoint, {
        headers: { origin: "https://untrusted.example" },
        data: { ...input, id: "cross-origin-save" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.patch(direct, {
        headers: { origin: "https://untrusted.example" },
        data: { reflection: "Cross origin edit" },
      })
    ).status(),
  ).toBe(403);
  for (const invalid of [
    { actionIds: [] },
    { actionIds: ["missing-action"] },
    { actionIds: [source.actions[0].id] },
    { actionIds: [input.actionIds[0], input.actionIds[0]] },
    { reflection: "x".repeat(4001) },
    { title: "x".repeat(101) },
  ]) {
    expect(
      (
        await page.request.post(endpoint, {
          headers: { origin: app.url },
          data: { ...input, id: "invalid-new-save", ...invalid },
        })
      ).status(),
    ).toBe(400);
  }
  expect(
    (
      await page.request.patch(direct, {
        headers: { origin: app.url },
        data: { reflection: "x".repeat(4001) },
      })
    ).status(),
  ).toBe(400);
  await page.getByRole("button", { name: "Switch Learner" }).click();
  await page.getByRole("button", { name: "Open Sky’s workspace" }).click();
  await page.getByRole("button", { name: "My Portfolio", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "My Portfolio", exact: true }),
  ).toContainText("first idea");
  await expect(
    page.getByRole("region", { name: "My Portfolio", exact: true }),
  ).not.toContainText(attempt);
  const other = await browser.newContext({ baseURL: app.url });
  try {
    expect((await other.request.get(endpoint)).status()).toBe(401);
    expect((await other.request.get(direct)).status()).toBe(401);
    const stranger = await other.newPage();
    await openWorkspace(stranger, "other@example.test");
    expect((await other.request.get(endpoint)).status()).toBe(404);
    expect((await other.request.get(direct)).status()).toBe(404);
    expect(
      (
        await other.request.post(endpoint, {
          headers: { origin: app.url },
          data: input,
        })
      ).status(),
    ).toBe(404);
    expect(
      (
        await other.request.patch(direct, {
          headers: { origin: app.url },
          data: { reflection: "Other family edit" },
        })
      ).status(),
    ).toBe(404);
    const otherFamily = await (await other.request.get("/api/family")).json();
    expect(
      (
        await other.request.post(
          `/api/learners/${otherFamily.selectedLearnerId}/portfolio`,
          {
            headers: { origin: app.url },
            data: { ...input, id: "cross-family-source" },
          },
        )
      ).status(),
    ).toBe(404);
  } finally {
    await other.close();
  }
  expect((await (await page.request.get(direct)).json()).entry.reflection).toBe(
    reflection,
  );
  expect(
    (await (await page.request.get(endpoint)).json()).entries,
  ).toHaveLength(1);
});

test("switching Learners during an unconfirmed save never shows or reassigns the original entry", async ({
  page,
  tutor,
}) => {
  await openWorkspace(page);
  await writeAttempt(page, tutor);
  await chooseEvidence(page);
  const family = await (await page.request.get("/api/family")).json();
  let release!: () => void;
  let committed = false;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    "**/api/learners/*/portfolio",
    async (route) => {
      const response = await route.fetch();
      committed = response.ok();
      await held;
      await route.fulfill({ response });
    },
    { times: 1 },
  );
  try {
    await page
      .getByRole("button", { name: "Save to Portfolio", exact: true })
      .click();
    await expect.poll(() => committed).toBe(true);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Close", exact: true })
      .click();
    await page.getByRole("button", { name: "Switch Learner" }).click();
    await page.getByRole("button", { name: "Open Sky’s workspace" }).click();
    await page
      .getByRole("button", { name: "My Portfolio", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "My Portfolio", exact: true }),
    ).toContainText("first idea");
    release();
    await page.reload();
    await page
      .getByRole("button", { name: "My Portfolio", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "My Portfolio", exact: true }),
    ).not.toContainText(attempt);
    expect(
      (
        await (
          await page.request.get(
            `/api/learners/${family.selectedLearnerId}/portfolio`,
          )
        ).json()
      ).entries,
    ).toHaveLength(1);
    await page.getByRole("button", { name: "Switch Learner" }).click();
    await page.getByRole("button", { name: "Open River’s workspace" }).click();
    await page
      .getByRole("button", { name: "My Portfolio", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Open My pencil experiment", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "Selected Portfolio entry" }),
    ).toContainText(reflection);
  } finally {
    release();
  }
});

test.describe("Portfolio when the Tutor cannot reply", () => {
  test.use({ sessionRetentionSeconds: 5 });
  test("saving a failed-reply attempt and reading expired-session evidence need no further provider access", async ({
    page,
    tutor,
    app,
  }) => {
    await openWorkspace(page);
    tutor.reply("What do you notice when you fold a square diagonally?");
    await page.getByRole("button", { name: "Start an activity" }).click();
    await page
      .getByLabel("Your question")
      .fill("What shapes can I make by folding paper?");
    await page.getByRole("button", { name: "Ask Tutor", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Conversation" }),
    ).toContainText("fold a square diagonally");
    tutor.fail();
    await page
      .getByLabel("Your message")
      .fill("My discovery: folding a square makes two equal triangles.");
    await page
      .getByRole("button", { name: "Share attempt", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "Conversation" }).getByRole("alert"),
    ).toContainText("couldn’t reply");
    await page.getByRole("button", { name: "Save Learning evidence" }).click();
    await page
      .getByRole("checkbox", {
        name: "My discovery: folding a square makes two equal triangles.",
        exact: true,
      })
      .check();
    await page.getByLabel("Entry title").fill("Folded shapes");
    await page
      .getByLabel("My reflection")
      .fill("The two halves match when I fold the paper.");
    await page
      .getByRole("button", { name: "Save to Portfolio", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "Saved to your Portfolio",
    );
    const family = await (await page.request.get("/api/family")).json();
    const base = `/api/learners/${family.selectedLearnerId}`;
    const source = (await (await page.request.get(`${base}/session`)).json())
      .session;
    await expect
      .poll(
        async () =>
          (await page.request.get(`${base}/session/${source.id}`)).status(),
        { timeout: 10000 },
      )
      .toBe(404);
    expect(
      (
        await page.request.post(`${base}/portfolio`, {
          headers: { origin: app.url },
          data: {
            id: "expired-new-save",
            sessionId: source.id,
            actionIds: [source.actions.at(-1).id],
            title: "Too late",
            reflection: "",
          },
        })
      ).status(),
    ).toBe(404);
    await page
      .getByRole("button", { name: "My Portfolio", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Open Folded shapes", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "Selected Portfolio entry" }),
    ).toContainText("two equal triangles");
    expect(tutor.requests).toHaveLength(2);
  });
});
