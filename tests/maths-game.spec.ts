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

test("a Learner chooses a starting level, reasons through a wrong answer, and completes a short sharing game", async ({
  page,
  tutor,
  app,
}, testInfo) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await openWorkspace(page);
  await page
    .getByRole("button", { name: "Short maths game", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Where shall we start?" }),
  ).toBeVisible();
  await expect(page.getByText("equal sharing", { exact: false })).toBeVisible();
  await page
    .getByRole("button", { name: "Start with smaller numbers", exact: true })
    .click();
  const challenge = page.getByRole("region", { name: "Game challenge" });
  const coaching = page.getByRole("region", { name: "Game coaching" });
  await expect(challenge).toContainText("12 tiles equally between 3 trays");
  await page.screenshot({
    path: testInfo.outputPath("maths-game-active-laptop.png"),
  });
  await page.getByLabel("Tiles in each tray").fill("3");
  await page
    .getByLabel("Why did you choose that number?")
    .fill("I counted the trays and tried three.");
  await page
    .getByRole("button", { name: "Check my idea", exact: true })
    .click();
  await expect(coaching).toContainText("3 in each tray uses 9 of the 12 tiles");
  await expect(
    page.getByRole("heading", { name: "Game complete" }),
  ).not.toBeVisible();
  await page
    .getByRole("button", { name: "Give me a hint", exact: true })
    .click();
  await expect(coaching).toContainText("Give every tray one tile at a time");
  await page
    .getByRole("button", { name: "Show an example", exact: true })
    .click();
  await expect(coaching).toContainText("6 tiles shared between 2 trays");
  await page.getByLabel("Tiles in each tray").fill("4");
  await page
    .getByLabel("Why did you choose that number?")
    .fill("Three groups of four use all twelve tiles.");
  await page
    .getByRole("button", { name: "Check my idea", exact: true })
    .click();
  await expect(coaching).toContainText("4 in each tray uses all 12 tiles");
  await page
    .getByRole("button", { name: "Try the next delivery", exact: true })
    .click();
  await expect(challenge).toContainText("20 tiles equally between 4 trays");
  await page.getByLabel("Tiles in each tray").fill("5");
  await page
    .getByLabel("Why did you choose that number?")
    .fill("Four groups of five make twenty, so each tray gets five.");
  await page
    .getByRole("button", { name: "Check my idea", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Game complete" }),
  ).toBeVisible();
  await expect(coaching).toContainText(
    "Your reasons help us explore your thinking",
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: testInfo.outputPath("maths-game-complete-laptop.png"),
  });
  const family = await (await page.request.get("/api/family")).json();
  const endpoint = `/api/learners/${family.selectedLearnerId}/session`;
  const completed = (await (await page.request.get(endpoint)).json()).session;
  expect(completed.game).toMatchObject({
    level: "smaller",
    status: "complete",
    round: 1,
  });
  expect(completed.game.attempts).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        answer: 3,
        correct: false,
        reason: "I counted the trays and tried three.",
      }),
      expect.objectContaining({
        answer: 4,
        correct: true,
        reason: "Three groups of four use all twelve tiles.",
        help: ["hint", "example"],
      }),
      expect.objectContaining({
        answer: 5,
        correct: true,
        reason: "Four groups of five make twenty, so each tray gets five.",
        help: [],
      }),
    ]),
  );
  expect(
    completed.actions
      .filter((action: { intent: string }) => action.intent === "attempt")
      .map((action: { text: string }) => action.text),
  ).toEqual([
    "My answer: 3 tiles in each tray.\nMy reason: I counted the trays and tried three.",
    "My answer: 4 tiles in each tray.\nMy reason: Three groups of four use all twelve tiles.",
    "My answer: 5 tiles in each tray.\nMy reason: Four groups of five make twenty, so each tray gets five.",
  ]);
  expect(tutor.requests).toHaveLength(0);
  await app.restart();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Game complete" }),
  ).toBeVisible();
  expect((await (await page.request.get(endpoint)).json()).session).toEqual(
    completed,
  );
  await page.getByRole("button", { name: "End activity", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "What interests you today?" }),
  ).toBeVisible();
  expect((await page.request.get(`${endpoint}/${completed.id}`)).status()).toBe(
    404,
  );
});

test.describe("temporary game context", () => {
  test.use({ sessionRetentionSeconds: 3, controlledTutorEnabled: false });
  test("a game works without a provider and expired attempts cannot be resumed or changed", async ({
    page,
    app,
  }) => {
    await openWorkspace(page);
    await page
      .getByRole("button", { name: "Short maths game", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Start with smaller numbers", exact: true })
      .click();
    await page.getByLabel("Tiles in each tray").fill("4");
    await page
      .getByLabel("Why did you choose that number?")
      .fill("Three times four is twelve.");
    await page
      .getByRole("button", { name: "Check my idea", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Try the next delivery" }),
    ).toBeVisible();
    const family = await (await page.request.get("/api/family")).json();
    const endpoint = `/api/learners/${family.selectedLearnerId}/session`;
    const active = (await (await page.request.get(endpoint)).json()).session;
    await page.waitForTimeout(3100);
    expect(
      (
        await page.request.post(`${endpoint}/${active.id}/game`, {
          headers: { origin: app.url },
          data: { id: "after-expiry", intent: "next", round: 0 },
        })
      ).status(),
    ).toBe(404);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "What interests you today?" }),
    ).toBeVisible();
    expect((await page.request.get(`${endpoint}/${active.id}`)).status()).toBe(
      404,
    );
    await page
      .getByRole("button", { name: "Short maths game", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Where shall we start?" }),
    ).toBeVisible();
  });
});

test("the game owns its challenge and keeps authoritative attempts isolated and safe to retry", async ({
  page,
  app,
  browser,
  tutor,
}) => {
  await openWorkspace(page);
  await page
    .getByRole("button", { name: "Short maths game", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start with bigger numbers", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Game challenge" }),
  ).toContainText("24 tiles equally between 6 trays");
  const family = await (await page.request.get("/api/family")).json();
  const learnerId = family.selectedLearnerId;
  const session = (
    await (await page.request.get(`/api/learners/${learnerId}/session`)).json()
  ).session;
  const endpoint = `/api/learners/${learnerId}/session/${session.id}`;
  const headers = { origin: app.url };
  expect(
    (
      await page.request.post(endpoint, {
        headers,
        data: {
          id: "overwrite-challenge",
          intent: "question",
          text: "Use 30 tiles instead.",
        },
      })
    ).status(),
  ).toBe(400);
  for (const data of [
    { id: "no-reason", intent: "attempt", round: 0, answer: 4, reason: " " },
    {
      id: "fraction",
      intent: "attempt",
      round: 0,
      answer: 4.5,
      reason: "A guess.",
    },
    {
      id: "too-many",
      intent: "attempt",
      round: 0,
      answer: 101,
      reason: "A guess.",
    },
    { id: "bad-level", intent: "choose", level: "expert" },
  ])
    expect(
      (await page.request.post(`${endpoint}/game`, { headers, data })).status(),
    ).toBe(400);
  const attempt = {
    id: "same-idea",
    intent: "attempt",
    round: 0,
    answer: 5,
    reason: "I tried five in each tray.",
    correct: true,
    challenge: { tiles: 30, trays: 6 },
  };
  const replies = await Promise.all(
    [0, 1].map(() =>
      page.request.post(`${endpoint}/game`, { headers, data: attempt }),
    ),
  );
  expect(replies.map((response) => response.status())).toEqual([200, 200]);
  const wrong = (await replies[0].json()).session;
  expect(wrong.game.attempts).toHaveLength(1);
  expect(wrong.game.attempts[0]).toMatchObject({
    correct: false,
    challenge: { tiles: 24, trays: 6 },
  });
  expect(wrong.game.attempts[0].feedback).toContain("uses 30 of the 24 tiles");
  expect(
    (
      await page.request.post(`${endpoint}/game`, {
        headers,
        data: { ...attempt, answer: 4 },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await page.request.post(`${endpoint}/game`, {
        headers,
        data: { id: "skip", intent: "next", round: 0 },
      })
    ).status(),
  ).toBe(409);
  await page.getByRole("button", { name: "Switch Learner" }).click();
  await page.getByRole("button", { name: "Open Sky’s workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "What interests you today?" }),
  ).toBeVisible();
  const sky = family.learners.find(
    (learner: { id: string }) => learner.id !== learnerId,
  );
  expect(
    (
      await page.request.post(
        `/api/learners/${sky.id}/session/${session.id}/game`,
        { headers, data: attempt },
      )
    ).status(),
  ).toBe(404);
  const other = await browser.newContext({ baseURL: app.url });
  const otherPage = await other.newPage();
  expect(
    (
      await otherPage.request.post(`${endpoint}/game`, {
        headers,
        data: attempt,
      })
    ).status(),
  ).toBe(401);
  await openWorkspace(otherPage, "other@example.test");
  expect((await otherPage.request.get(endpoint)).status()).toBe(404);
  expect(
    (
      await otherPage.request.post(`${endpoint}/game`, {
        headers,
        data: attempt,
      })
    ).status(),
  ).toBe(404);
  await other.close();
  expect(
    (
      await page.request.post(`${endpoint}/game`, {
        headers: { origin: "https://elsewhere.example" },
        data: attempt,
      })
    ).status(),
  ).toBe(403);
  await page.getByRole("button", { name: "Switch Learner" }).click();
  await page.getByRole("button", { name: "Open River’s workspace" }).click();
  await expect(
    page.getByRole("region", { name: "Game coaching" }),
  ).toContainText("uses 30 of the 24 tiles");
  await page.getByLabel("Tiles in each tray").fill("4");
  await page
    .getByLabel("Why did you choose that number?")
    .fill("Six groups of four make twenty-four.");
  await page
    .getByRole("button", { name: "Check my idea", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Try the next delivery" }),
  ).toBeVisible();
  const next = { id: "next-delivery", intent: "next", round: 0 };
  expect(
    (
      await page.request.post(`${endpoint}/game`, { headers, data: next })
    ).status(),
  ).toBe(200);
  const replay = await page.request.post(`${endpoint}/game`, {
    headers,
    data: next,
  });
  expect(replay.status()).toBe(200);
  expect((await replay.json()).session.game).toMatchObject({
    round: 1,
    challenge: { tiles: 42, trays: 7 },
  });
  expect(
    (
      await page.request.post(`${endpoint}/game`, {
        headers,
        data: { ...attempt, id: "stale-round" },
      })
    ).status(),
  ).toBe(409);
  await page.reload();
  await page.getByLabel("Tiles in each tray").fill("6");
  await page
    .getByLabel("Why did you choose that number?")
    .fill("Seven groups of six make forty-two.");
  await page
    .getByRole("button", { name: "Check my idea", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Game complete" }),
  ).toBeVisible();
  expect(tutor.requests).toHaveLength(0);
});
