import type { Page } from "@playwright/test";
import { test, expect } from "./fixture";

async function openWorkspace(
  page: Page,
  email = "parent@example.test",
  names = ["River", "Sky"],
) {
  await page.goto("/");
  await page.getByRole("button", { name: "Set up family access" }).click();
  await page.getByLabel("Parent email").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Fictional-parent-password-42");
  await page.getByLabel("Family setup code").fill("fictional-family-invite");
  await page.getByRole("button", { name: "Create family account" }).click();
  for (const name of names) {
    await page.getByLabel("Learner name").fill(name);
    await page.getByRole("button", { name: "Add Learner" }).click();
    await expect(
      page.getByRole("button", { name: `Open ${name}’s workspace` }),
    ).toBeVisible();
  }
  await page
    .getByRole("button", { name: `Open ${names[0]}’s workspace` })
    .click();
}

async function ask(
  page: Page,
  question = "How can I share 24 pencils equally among 6 cups?",
) {
  await page.getByRole("button", { name: "Start an activity" }).click();
  await page.getByLabel("Your question").fill(question);
  await page.getByRole("button", { name: "Ask Tutor", exact: true }).click();
}

test("a Learner starts a typed activity and sees a small step beside their question", async ({
  page,
  tutor,
}, testInfo) => {
  tutor.reply(
    "Let’s take one small step. Draw 6 cups. How could you give each cup the same number of pencils?",
  );
  await openWorkspace(page);
  await ask(page);
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("Scripted Tutor preview");
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("Draw 6 cups");
  await expect(
    page.getByRole("region", { name: "Current problem" }),
  ).toContainText("24 pencils");
  await expect(page.getByLabel("My scratchpad")).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("typed-coaching.png"),
    fullPage: true,
  });
});

test("hints, examples, attempts, pace requests and a correction continue one activity", async ({
  page,
  tutor,
}) => {
  tutor.reply("Draw 6 cups. What could you put in each one?");
  await openWorkspace(page);
  await ask(page);
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("Draw 6 cups");
  tutor.reply("Hint: imagine giving each cup one pencil at a time.");
  await page
    .getByRole("button", { name: "Give me a hint", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("one pencil at a time");
  tutor.reply("Example: 12 beads shared among 3 jars gives 4 in each jar.");
  await page
    .getByRole("button", { name: "Show an example", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("12 beads");
  tutor.reply(
    "You tried 4 in each cup. How could multiplication check your idea?",
  );
  await page
    .getByLabel("Your message")
    .fill("I think 4 because 6 groups of 4 make 24.");
  await page
    .getByRole("button", { name: "Share attempt", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("multiplication check");
  tutor.reply("We can slow down. Let’s focus on just one cup.");
  await page
    .getByRole("button", { name: "More coaching choices", exact: true })
    .click();
  await page.getByRole("button", { name: "Slow down", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("just one cup");
  tutor.reply(
    "Take your time trying independently. Tell me your reasoning when you’re ready.",
  );
  await page
    .getByRole("button", { name: "More coaching choices", exact: true })
    .click();
  await page.getByRole("button", { name: "Let me try", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("trying independently");
  tutor.reply(
    "Thanks for correcting the question. With 30 pencils and 6 cups, what would change?",
  );
  await page.getByLabel("Message purpose").selectOption("correction");
  await page
    .getByLabel("Your message")
    .fill("It is 30 pencils shared among 6 cups, not 24.");
  await page
    .getByRole("button", { name: "Correct question", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Current problem" }),
  ).toContainText("30 pencils");
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("what would change");
  tutor.reply(
    "Your new attempt uses the corrected number. How did you check it?",
  );
  await page
    .getByLabel("Your message")
    .fill("5 in each cup, because 6 times 5 is 30.");
  await page
    .getByRole("button", { name: "Share attempt", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("corrected number");
  const context = tutor.requests.at(-1)!;
  expect(new Set(tutor.requests.map((request) => request.sessionId)).size).toBe(
    1,
  );
  expect(context.problem).toContain("30 pencils");
  expect(context.actions.map((action) => action.intent)).toEqual([
    "question",
    "hint",
    "example",
    "attempt",
    "slower",
    "independent",
    "correction",
    "attempt",
  ]);
  expect(context.actions[3].text).toContain("6 groups of 4");
  expect(context.actions[2].reply).toContain("12 beads");
});

test("a failed reply keeps the Learner input after reload and retries without duplicating turns", async ({
  page,
  tutor,
  app,
}) => {
  tutor.fail();
  await openWorkspace(page);
  await ask(page);
  await expect(
    page.getByRole("region", { name: "Conversation" }).getByRole("alert"),
  ).toContainText("couldn’t reply");
  await expect(
    page.getByRole("region", { name: "Conversation" }).getByRole("alert"),
  ).toContainText("service");
  const question = "How can I share 24 pencils equally among 6 cups?";
  await expect(page.getByLabel("Your message")).toHaveValue(question);
  await app.restart();
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Conversation" }).getByRole("alert"),
  ).toContainText("couldn’t reply");
  await expect(page.getByLabel("Your message")).toHaveValue(question);
  const release = tutor.hold(
    "Let’s start with 6 empty cups and share one pencil at a time.",
  );
  try {
    await page
      .getByRole("button", { name: "Retry reply", exact: true })
      .click();
    await expect.poll(() => tutor.requests.length).toBe(2);
    const family = await (await page.request.get("/api/family")).json();
    const endpoint = `/api/learners/${family.selectedLearnerId}/session`;
    const current = (await (await page.request.get(endpoint)).json()).session;
    const action = current.actions[0];
    const duplicate = await page.request.post(`${endpoint}/${current.id}`, {
      data: { id: action.id, intent: action.intent, text: action.text },
      headers: { origin: app.url },
    });
    expect(duplicate.status()).toBe(200);
    expect((await duplicate.json()).session.actions).toHaveLength(1);
    expect(tutor.requests).toHaveLength(2);
    release();
    await expect(
      page.getByRole("region", { name: "Conversation" }),
    ).toContainText("6 empty cups");
    const replay = await page.request.post(`${endpoint}/${current.id}`, {
      data: { id: action.id, intent: action.intent, text: action.text },
      headers: { origin: app.url },
    });
    expect(replay.status()).toBe(200);
    expect((await replay.json()).session.actions).toHaveLength(1);
    expect(tutor.requests).toHaveLength(2);
    const changedReplay = await page.request.post(`${endpoint}/${current.id}`, {
      data: { id: action.id, intent: "question", text: "A different question" },
      headers: { origin: app.url },
    });
    expect(changedReplay.status()).toBe(409);
    await page.reload();
    await expect(
      page.getByRole("region", { name: "Conversation" }),
    ).toContainText("6 empty cups");
    await expect(
      page
        .getByRole("region", { name: "Conversation" })
        .getByText(question, { exact: true }),
    ).toHaveCount(1);
  } finally {
    release();
  }
});

test.describe("temporary activity context", () => {
  test.use({ sessionRetentionSeconds: 5 });
  test("ending or expiry removes the activity instead of making a conversation archive", async ({
    page,
    tutor,
    app,
  }) => {
    tutor.reply("Try drawing the cups first.");
    await openWorkspace(page);
    await ask(page);
    await expect(
      page.getByRole("region", { name: "Conversation" }),
    ).toContainText("drawing the cups");
    const family = await (await page.request.get("/api/family")).json();
    const endpoint = `/api/learners/${family.selectedLearnerId}/session`;
    const first = (await (await page.request.get(endpoint)).json()).session;
    await page
      .getByRole("button", { name: "End activity", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Start an activity" }),
    ).toBeVisible();
    expect((await page.request.get(`${endpoint}/${first.id}`)).status()).toBe(
      404,
    );
    await page.reload();
    await expect(
      page.getByRole("region", { name: "Conversation" }),
    ).not.toContainText("drawing the cups");
    tutor.reply("A fresh activity starts with your new question.");
    await ask(page, "How could I split 10 counters into two groups?");
    await expect(
      page.getByRole("region", { name: "Conversation" }),
    ).toContainText("fresh activity");
    const second = (await (await page.request.get(endpoint)).json()).session;
    expect(second.id).not.toBe(first.id);
    expect(second.actions).toHaveLength(1);
    await expect
      .poll(
        async () =>
          (await page.request.get(`${endpoint}/${second.id}`)).status(),
        { timeout: 10000 },
      )
      .toBe(404);
    const expiredSend = await page.request.post(`${endpoint}/${second.id}`, {
      headers: { origin: app.url },
      data: {
        id: "expired-question",
        intent: "question",
        text: "Bring it back",
      },
    });
    expect(expiredSend.status()).toBe(404);
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Start an activity" }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Conversation" }),
    ).not.toContainText("fresh activity");
    expect(tutor.requests).toHaveLength(2);
  });
});

test("reload resumes a pending reply and switching Learners keeps late replies in the original workspace", async ({
  page,
  tutor,
}) => {
  const release = tutor.hold(
    "River’s step: draw six cups before sharing the pencils.",
  );
  try {
    await openWorkspace(page);
    await ask(page);
    await expect.poll(() => tutor.requests.length).toBe(1);
    const originalId = tutor.requests[0].sessionId;
    await page.reload();
    await expect(page.getByRole("status")).toContainText("Tutor is thinking");
    await expect(
      page.getByRole("region", { name: "Current problem" }),
    ).toContainText("24 pencils");
    await page.getByRole("button", { name: "Switch Learner" }).click();
    await page.getByRole("button", { name: "Open Sky’s workspace" }).click();
    await expect(
      page.getByRole("region", { name: "Conversation" }),
    ).not.toContainText("pencils");
    tutor.reply("Sky’s step: sketch two shapes and compare their sides.");
    await ask(page, "What makes a triangle different from a square?");
    await expect(
      page.getByRole("region", { name: "Conversation" }),
    ).toContainText("sketch two shapes");
    release();
    const family = await (await page.request.get("/api/family")).json();
    const riverId = family.learners.find(
      (learner: { name: string }) => learner.name === "River",
    ).id;
    await expect
      .poll(
        async () =>
          (
            await (
              await page.request.get(
                `/api/learners/${riverId}/session/${originalId}`,
              )
            ).json()
          ).session.actions[0].status,
      )
      .toBe("complete");
    await expect(
      page.getByRole("region", { name: "Conversation" }),
    ).not.toContainText("six cups");
    await page.reload();
    await expect(
      page.getByRole("region", { name: "Current problem" }),
    ).toContainText("triangle");
    await expect(
      page.getByRole("region", { name: "Conversation" }),
    ).not.toContainText("six cups");
    await page.getByRole("button", { name: "Switch Learner" }).click();
    await page.getByRole("button", { name: "Open River’s workspace" }).click();
    await expect(
      page.getByRole("region", { name: "Conversation" }),
    ).toContainText("six cups");
    await expect(
      page.getByRole("region", { name: "Conversation" }),
    ).not.toContainText("two shapes");
    expect(tutor.requests).toHaveLength(2);
  } finally {
    release();
  }
});

test("session reads, submissions and ending require the owning family and matching Learner", async ({
  page,
  browser,
  app,
  tutor,
}) => {
  tutor.reply("This private step belongs to River’s activity.");
  await openWorkspace(page);
  await ask(page);
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("private step");
  const family = await (await page.request.get("/api/family")).json();
  const riverId = family.selectedLearnerId;
  const skyId = family.learners.find(
    (learner: { name: string }) => learner.name === "Sky",
  ).id;
  const endpoint = `/api/learners/${riverId}/session`;
  const session = (await (await page.request.get(endpoint)).json()).session;
  const message = {
    id: "unauthorized-attempt",
    intent: "attempt",
    text: "Read my sibling’s problem",
  };
  const stranger = await browser.newContext({ baseURL: app.url });
  try {
    for (const route of [endpoint, `${endpoint}/${session.id}`]) {
      expect((await stranger.request.get(route)).status()).toBe(401);
      expect(
        (
          await stranger.request.post(route, {
            data: message,
            headers: { origin: app.url },
          })
        ).status(),
      ).toBe(401);
    }
    const foreignPage = await stranger.newPage();
    await openWorkspace(foreignPage, "other@example.test", ["Fern"]);
    for (const route of [endpoint, `${endpoint}/${session.id}`]) {
      const read = await foreignPage.request.get(route);
      expect(read.status()).toBe(404);
      expect(await read.text()).not.toContain("pencils");
      expect(
        (
          await foreignPage.request.post(route, {
            data: message,
            headers: { origin: app.url },
          })
        ).status(),
      ).toBe(404);
    }
    expect(
      (
        await foreignPage.request.post(`${endpoint}/${session.id}`, {
          data: { intent: "end" },
          headers: { origin: app.url },
        })
      ).status(),
    ).toBe(404);
    const siblingPath = `/api/learners/${skyId}/session/${session.id}`;
    expect((await page.request.get(siblingPath)).status()).toBe(404);
    expect(
      (
        await page.request.post(siblingPath, {
          data: message,
          headers: { origin: app.url },
        })
      ).status(),
    ).toBe(404);
    await page.request.post(siblingPath, {
      data: { intent: "end" },
      headers: { origin: app.url },
    });
    expect((await page.request.get(`${endpoint}/${session.id}`)).status()).toBe(
      200,
    );
    expect(
      (
        await page.request.post(`${endpoint}/${session.id}`, {
          data: message,
          headers: { origin: "https://untrusted.example" },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await page.request.post(`${endpoint}/${session.id}`, {
          data: { ...message, text: "x".repeat(2001) },
          headers: { origin: app.url },
        })
      ).status(),
    ).toBe(400);
    expect(tutor.requests).toHaveLength(1);
  } finally {
    await stranger.close();
  }
});

test("ending a pending activity cannot restore its reply into a new activity", async ({
  page,
  tutor,
}) => {
  const release = tutor.hold("Old activity reply that must stay cleared.");
  try {
    await openWorkspace(page);
    await ask(page);
    await expect.poll(() => tutor.requests.length).toBe(1);
    await page.reload();
    await expect(page.getByRole("status")).toContainText("Tutor is thinking");
    await page
      .getByRole("button", { name: "End activity", exact: true })
      .click();
    tutor.reply("Fresh step: count the sides of your new shape.");
    await ask(page, "How many sides does a pentagon have?");
    await expect(
      page.getByRole("region", { name: "Conversation" }),
    ).toContainText("count the sides");
    release();
    await page.reload();
    await expect(
      page.getByRole("region", { name: "Conversation" }),
    ).toContainText("count the sides");
    await expect(
      page.getByRole("region", { name: "Conversation" }),
    ).not.toContainText("Old activity");
    await expect(
      page.getByRole("region", { name: "Current problem" }),
    ).toContainText("pentagon");
  } finally {
    release();
  }
});

test.describe("closed provider gate", () => {
  test.use({ controlledTutorEnabled: false });
  test("unconfigured Tutor access preserves the question without an external fallback", async ({
    page,
    tutor,
  }) => {
    await openWorkspace(page);
    await ask(page);
    await expect(
      page.getByRole("region", { name: "Conversation" }).getByRole("alert"),
    ).toContainText("couldn’t reply");
    await expect(page.getByLabel("Your message")).toHaveValue(
      "How can I share 24 pencils equally among 6 cups?",
    );
    await page
      .getByRole("button", { name: "Retry reply", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "Conversation" }).getByRole("alert"),
    ).toContainText("couldn’t reply");
    expect(tutor.requests).toHaveLength(0);
    await page
      .getByRole("button", { name: "End activity", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Start an activity" }),
    ).toBeVisible();
  });
});
