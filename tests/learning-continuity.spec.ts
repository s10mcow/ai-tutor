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
const notes = {
  interest: "I am curious about how bread rises.",
  helpfulApproach: "Drawing two cups helped me compare my ideas.",
  nextStep: "Compare yeast in a cup with sugar and a cup without sugar.",
};
async function exchange(page: Page, tutor: { reply: (text: string) => void }) {
  await page.getByRole("button", { name: "Start an activity" }).click();
  tutor.reply("What could you compare in two cups?");
  await page
    .getByLabel("Your question")
    .fill("Why does bread rise? Unselected conversation detail.");
  await page.getByRole("button", { name: "Ask Tutor", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("compare in two cups");
}
async function saveNotes(page: Page, screenshotPath?: string) {
  await page
    .getByRole("button", { name: "Remember for next time", exact: true })
    .click();
  await page.getByLabel("An interest I mentioned").fill(notes.interest);
  await page
    .getByLabel("An approach that helped me")
    .fill(notes.helpfulApproach);
  await page.getByLabel("A possible next step").fill(notes.nextStep);
  if (screenshotPath) await page.screenshot({ path: screenshotPath });
  await page
    .getByRole("button", { name: "Save learning notes", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Learning notes saved");
}

test("a Learner keeps brief stated notes and resumes them on a fresh visit without the old conversation", async ({
  page,
  tutor,
  app,
  browser,
}, testInfo) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await openWorkspace(page);
  await exchange(page, tutor);
  await saveNotes(page, testInfo.outputPath("learning-note-dialog-laptop.png"));
  const family = await (await page.request.get("/api/family")).json();
  const base = `/api/learners/${family.selectedLearnerId}`;
  await page.getByRole("button", { name: "End activity", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Pick up where you left off?" }),
  ).toBeVisible();
  expect(
    (await (await page.request.get(`${base}/session`)).json()).session,
  ).toBeNull();
  expect(
    (await (await page.request.get(`${base}/portfolio`)).json()).entries,
  ).toEqual([]);
  const state = await page.context().storageState();
  await app.restart();
  const fresh = await browser.newContext({
    storageState: state,
    viewport: { width: 1366, height: 768 },
  });
  const returning = await fresh.newPage();
  await returning.goto(app.url);
  await expect(
    returning.getByRole("heading", { name: "Pick up where you left off?" }),
  ).toBeVisible();
  await expect(
    returning.getByRole("region", { name: "Learning continuity" }),
  ).toContainText(notes.nextStep);
  await returning.screenshot({
    path: testInfo.outputPath("return-visit-laptop.png"),
  });
  await returning
    .getByRole("button", { name: "Continue my next step", exact: true })
    .click();
  await expect(returning.getByLabel("Your question")).toHaveValue(
    notes.nextStep,
  );
  tutor.reply("What do you predict will change between those cups?");
  await returning
    .getByRole("button", { name: "Ask Tutor", exact: true })
    .click();
  await expect(
    returning.getByRole("region", { name: "Conversation" }),
  ).toContainText("predict will change");
  expect(tutor.requests.at(-1)).toMatchObject({
    learningNotes: { ...notes, origin: "learner-stated" },
  });
  expect(JSON.stringify(tutor.requests.at(-1))).not.toContain(
    "Unselected conversation detail",
  );
  expect(tutor.requests.at(-1)?.actions).toHaveLength(1);
  await fresh.close();
});

test("a Learner can decline the old next step, edit stated notes, and clear them before new coaching", async ({
  page,
  tutor,
}, testInfo) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await openWorkspace(page);
  await exchange(page, tutor);
  await saveNotes(page);
  await page.getByRole("button", { name: "End activity", exact: true }).click();
  await page
    .getByRole("button", { name: "Choose something new", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "What interests you today?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Paper art", exact: true }).click();
  tutor.reply("What colours might make your drawing feel calm?");
  await page
    .getByLabel("Your question")
    .fill("I want to try drawing waves instead.");
  await page.getByRole("button", { name: "Ask Tutor", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("drawing feel calm");
  expect(tutor.requests.at(-1)).toMatchObject({
    activity: { kind: "art" },
    learningNotes: notes,
  });
  await page
    .getByRole("button", { name: "Learning notes", exact: true })
    .click();
  await page
    .getByLabel("An interest I mentioned")
    .fill("I am trying drawing waves today.");
  await page.getByLabel("A possible next step").fill("");
  await page
    .getByRole("button", { name: "Save learning notes", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Learning notes saved");
  await page.reload();
  await page
    .getByRole("button", { name: "Learning notes", exact: true })
    .click();
  await expect(page.getByLabel("An interest I mentioned")).toHaveValue(
    "I am trying drawing waves today.",
  );
  await expect(page.getByLabel("A possible next step")).toHaveValue("");
  await page.screenshot({
    path: testInfo.outputPath("learning-notes-laptop.png"),
  });
  await page
    .getByRole("button", { name: "Clear learning notes", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Learning notes" }),
  ).toContainText("No notes saved yet");
  await page.getByRole("button", { name: "Learning", exact: true }).click();
  tutor.reply("Which line would you like to try next?");
  await page.getByLabel("Your message").fill("I drew a curved line.");
  await page
    .getByRole("button", { name: "Share attempt", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("try next");
  expect(tutor.requests.at(-1)).toMatchObject({ learningNotes: null });
});

test.describe("direct metered Tutor continuity", () => {
  test.use({
    controlledTutorEnabled: false,
    modelEnvironment: {
      TUTOR_OPENAI_FIXTURE_URL: "fixture",
      TUTOR_FIXTURE_ALLOWANCE_NANO_USD: "8000000000",
    },
  });
  test("direct Sol receives only this Learner’s stated notes as data and saved notes remain usable with no allowance", async ({
    page,
    openai,
    app,
  }) => {
    await openWorkspace(page);
    await exchange(page, openai);
    await saveNotes(page);
    await page
      .getByRole("button", { name: "End activity", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Continue my next step", exact: true })
      .click();
    openai.reply("What do you predict in each cup?");
    await page.getByRole("button", { name: "Ask Tutor", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Conversation" }),
    ).toContainText("predict in each cup");
    const request = openai.requests.at(-1)!.body;
    expect(JSON.parse(request.input[0].content)).toMatchObject({
      learningNotes: { ...notes, origin: "learner-stated" },
    });
    expect(JSON.stringify(request.input)).not.toContain(
      "Unselected conversation detail",
    );
    expect(request.instructions).toContain("not evidence of mastery");
    await page.getByRole("button", { name: "Switch Learner" }).click();
    await page.getByRole("button", { name: "Open Sky’s workspace" }).click();
    await expect(
      page.getByRole("heading", { name: "What interests you today?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Start an activity" }).click();
    openai.reply("What would you like to draw?");
    await page.getByLabel("Your question").fill("I like painting rivers.");
    await page.getByRole("button", { name: "Ask Tutor", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Conversation" }),
    ).toContainText("like to draw");
    expect(
      JSON.parse(openai.requests.at(-1)!.body.input[0].content).learningNotes,
    ).toBeNull();
    expect(JSON.stringify(openai.requests.at(-1)!.body)).not.toContain("bread");
    // Disconnect the development hot-reload client before restarting the server.
    await page.goto("about:blank");
    await app.restart({ TUTOR_FIXTURE_ALLOWANCE_NANO_USD: "0" });
    await page.goto(app.url);
    await page.getByRole("button", { name: "Switch Learner" }).click();
    await page.getByRole("button", { name: "Open River’s workspace" }).click();
    await page
      .getByRole("button", { name: "Learning notes", exact: true })
      .click();
    await expect(page.getByLabel("An interest I mentioned")).toHaveValue(
      notes.interest,
    );
    await page
      .getByLabel("An approach that helped me")
      .fill("Drawing one cup at a time helped me.");
    await page
      .getByRole("button", { name: "Save learning notes", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "Learning notes saved",
    );
    expect(openai.requests).toHaveLength(3);
  });
});

test("notes enforce the intended family, Learner, source activity, bounds and origin", async ({
  page,
  tutor,
  app,
  browser,
}) => {
  await openWorkspace(page);
  await exchange(page, tutor);
  await saveNotes(page);
  const family = await (await page.request.get("/api/family")).json();
  const riverId = family.selectedLearnerId;
  const skyId = family.learners.find(
    (item: { name: string }) => item.name === "Sky",
  ).id;
  const endpoint = `/api/learners/${riverId}/notes`;
  const sibling = `/api/learners/${skyId}/notes`;
  const source = (
    await (await page.request.get(`/api/learners/${riverId}/session`)).json()
  ).session;
  const input = { ...notes, sessionId: source.id };
  expect((await (await page.request.get(sibling)).json()).notes).toBeNull();
  expect(
    (
      await page.request.put(sibling, {
        headers: { origin: app.url },
        data: input,
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await page.request.put(sibling, {
        headers: { origin: app.url },
        data: notes,
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await page.request.post(`/api/learners/${skyId}/session`, {
        headers: { origin: app.url },
        data: { resume: true },
      })
    ).status(),
  ).toBe(404);
  for (const data of [
    { ...notes, interest: "x".repeat(241) },
    { ...notes, helpfulApproach: "x".repeat(241) },
    { ...notes, nextStep: "x".repeat(241) },
    { ...notes, interest: [] },
    { interest: "", helpfulApproach: "", nextStep: "" },
  ]) {
    expect(
      (
        await page.request.put(endpoint, { headers: { origin: app.url }, data })
      ).status(),
    ).toBe(400);
  }
  for (const method of ["put", "delete"] as const) {
    expect(
      (
        await page.request[method](endpoint, {
          headers: { origin: "https://untrusted.example" },
          data: input,
        })
      ).status(),
    ).toBe(403);
  }
  const other = await browser.newContext({ baseURL: app.url });
  try {
    expect((await other.request.get(endpoint)).status()).toBe(401);
    expect(
      (
        await other.request.put(endpoint, {
          headers: { origin: app.url },
          data: input,
        })
      ).status(),
    ).toBe(401);
    await openWorkspace(await other.newPage(), "other@example.test");
    expect((await other.request.get(endpoint)).status()).toBe(404);
    expect(
      (
        await other.request.put(endpoint, {
          headers: { origin: app.url },
          data: input,
        })
      ).status(),
    ).toBe(404);
    expect(
      (
        await other.request.delete(endpoint, { headers: { origin: app.url } })
      ).status(),
    ).toBe(404);
    const foreign = await (await other.request.get("/api/family")).json();
    expect(
      (
        await other.request.put(
          `/api/learners/${foreign.selectedLearnerId}/notes`,
          { headers: { origin: app.url }, data: input },
        )
      ).status(),
    ).toBe(404);
  } finally {
    await other.close();
  }
  await page.getByRole("button", { name: "End activity", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Pick up where you left off?" }),
  ).toBeVisible();
  expect(
    (
      await page.request.put(endpoint, {
        headers: { origin: app.url },
        data: input,
      })
    ).status(),
  ).toBe(404);
  const saved = (await (await page.request.get(endpoint)).json()).notes;
  expect(saved).toEqual({ ...notes, origin: "learner-stated" });
  expect(tutor.requests).toHaveLength(1);
});

test("switching Learners while a note edit is unconfirmed never transfers it to the sibling", async ({
  page,
  tutor,
  app,
}) => {
  await openWorkspace(page);
  await exchange(page, tutor);
  await saveNotes(page);
  const family = await (await page.request.get("/api/family")).json();
  const endpoint = `/api/learners/${family.selectedLearnerId}/notes`;
  await page
    .getByRole("button", { name: "Learning notes", exact: true })
    .click();
  await page
    .getByLabel("An interest I mentioned")
    .fill("River is curious about sourdough bubbles.");
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let committed!: () => void;
  const saved = new Promise<void>((resolve) => {
    committed = resolve;
  });
  await page.route(`**${endpoint}`, async (route) => {
    if (route.request().method() !== "PUT") return route.continue();
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    committed();
    await held;
    await route.fulfill({ response }).catch(() => {});
  });
  await page
    .getByRole("button", { name: "Save learning notes", exact: true })
    .click();
  await saved;
  await page.getByRole("button", { name: "Switch Learner" }).click();
  await page.getByRole("button", { name: "Open Sky’s workspace" }).click();
  release();
  await page
    .getByRole("button", { name: "Learning notes", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Learning notes" }),
  ).toContainText("No notes saved yet");
  await expect(
    page.getByRole("region", { name: "Learning notes" }),
  ).not.toContainText("sourdough");
  await page.getByRole("button", { name: "Learning", exact: true }).click();
  await page.getByRole("button", { name: "Start an activity" }).click();
  tutor.reply("Which colours are you choosing?");
  await page.getByLabel("Your question").fill("I would like to paint a river.");
  await page.getByRole("button", { name: "Ask Tutor", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("colours");
  expect(tutor.requests.at(-1)).toMatchObject({ learningNotes: null });
  expect(JSON.stringify(tutor.requests.at(-1))).not.toContain("bread");
  expect(JSON.stringify(tutor.requests.at(-1))).not.toContain("sourdough");
  expect((await (await page.request.get(endpoint)).json()).notes.interest).toBe(
    "River is curious about sourdough bubbles.",
  );
});

test("a paused maths game can keep Learner-stated next steps without a provider call", async ({
  page,
  tutor,
}) => {
  await openWorkspace(page);
  await page
    .getByRole("button", { name: "Short maths game", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start with smaller numbers", exact: true })
    .click();
  await page.getByLabel("Tiles in each tray").fill("3");
  await page
    .getByLabel("Why did you choose that number?")
    .fill("I tried counting one tray at a time.");
  await page
    .getByRole("button", { name: "Check my idea", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Game coaching" }),
  ).toContainText("3 in each tray uses 9");
  await page
    .getByRole("button", { name: "Remember for next time", exact: true })
    .click();
  await page
    .getByLabel("An approach that helped me")
    .fill("Moving one tile at a time helped me check.");
  await page
    .getByLabel("A possible next step")
    .fill("Try sharing the last three tiles.");
  await page
    .getByRole("button", { name: "Save learning notes", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Learning notes saved");
  await page.getByRole("button", { name: "End activity", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Learning continuity" }),
  ).toContainText("Try sharing the last three tiles.");
  expect(tutor.requests).toHaveLength(0);
});
