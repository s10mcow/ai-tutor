import type { Page } from "@playwright/test";
import { test, expect } from "./fixture";

async function openWorkspace(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Set up family access" }).click();
  await page.getByLabel("Parent email").fill("parent@example.test");
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

test("a Learner discovers separate activities and launches biking with its purpose in the Tutor context", async ({
  page,
  tutor,
  app,
}, testInfo) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await openWorkspace(page);
  await expect(
    page.getByRole("heading", { name: "What interests you today?" }),
  ).toBeVisible();
  for (const name of [
    "Biking exploration",
    "Workbook maths",
    "Paper art",
    "AI literacy",
  ]) {
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  }
  await page.screenshot({
    path: testInfo.outputPath("activity-choices-laptop.png"),
  });
  await page
    .getByRole("button", { name: "Biking exploration", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Current problem" }),
  ).toContainText("Explore what makes a bike ride feel different");
  tutor.reply(
    "Compare a familiar smooth trail with a rough one. What do you notice about the ride?",
  );
  await page
    .getByLabel("Your question")
    .fill("Why does a rocky trail feel so different?");
  await page.getByRole("button", { name: "Ask Tutor", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("familiar smooth trail");
  const family = await (await page.request.get("/api/family")).json();
  const endpoint = `/api/learners/${family.selectedLearnerId}/session`;
  const current = (await (await page.request.get(endpoint)).json()).session;
  const anotherChoice = await page.request.post(endpoint, {
    headers: { origin: app.url },
    data: { activity: { kind: "art" } },
  });
  expect(anotherChoice.status()).toBe(200);
  expect((await anotherChoice.json()).session).toEqual(current);
  for (const activity of [
    { kind: "unavailable" },
    { kind: "custom", interest: " " },
    { kind: "custom", interest: "x".repeat(121) },
  ]) {
    expect(
      (
        await page.request.post(endpoint, {
          headers: { origin: app.url },
          data: { activity },
        })
      ).status(),
    ).toBe(400);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: testInfo.outputPath("active-biking-laptop.png"),
  });
  expect(tutor.requests[0]).toMatchObject({
    activity: {
      kind: "biking",
      title: "Biking exploration",
      purpose:
        "Explore what makes a bike ride feel different. Ask a question about trails, bikes, or the experience of riding.",
    },
  });
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Current problem" }),
  ).toContainText("Biking exploration");
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("familiar smooth trail");
});

test("a Learner declines a maths connection without losing the biking question or earlier thinking", async ({
  page,
  tutor,
}) => {
  await openWorkspace(page);
  await page
    .getByRole("button", { name: "Biking exploration", exact: true })
    .click();
  tutor.reply(
    "Would you like to connect this to maths, or stay with how riding feels?",
  );
  await page
    .getByLabel("Your question")
    .fill("What makes riding over roots feel different?");
  await page.getByRole("button", { name: "Ask Tutor", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("connect this to maths");
  await page
    .getByLabel("My scratchpad")
    .fill("I notice the bumps more when I sit down.");
  tutor.reply(
    "We can stay with biking. Describe what you notice in your arms and legs on a bumpy trail.",
  );
  await page
    .getByRole("button", { name: "Keep this about biking", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("stay with biking");
  await expect(
    page.getByRole("region", { name: "Current problem" }),
  ).toContainText("riding over roots");
  await expect(page.getByLabel("My scratchpad")).toHaveValue(
    "I notice the bumps more when I sit down.",
  );
  expect(tutor.requests[1].sessionId).toBe(tutor.requests[0].sessionId);
  expect(tutor.requests[1].actions.at(-1)?.text).toBe(
    "Please keep this about biking. I do not want a maths connection.",
  );
  tutor.reply("Let’s compare your two observations about the bumps.");
  await page
    .getByLabel("Your message")
    .fill("My legs feel softer when I stand up.");
  await page
    .getByRole("button", { name: "Share attempt", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("two observations");
  expect(tutor.requests[2].actions[1].text).toContain(
    "I do not want a maths connection",
  );
  await page.getByRole("button", { name: "End activity", exact: true }).click();
  await page.getByRole("button", { name: "Paper art", exact: true }).click();
  tutor.reply(
    "Choose two colours on paper. What mood does each colour suggest to you?",
  );
  await page
    .getByLabel("Your question")
    .fill("How could my painting feel calm?");
  await page.getByRole("button", { name: "Ask Tutor", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("two colours on paper");
  expect(tutor.requests[3]).toMatchObject({ activity: { kind: "art" } });
  expect(tutor.requests[3].sessionId).not.toBe(tutor.requests[0].sessionId);
  expect(tutor.requests[3].actions).toHaveLength(1);
});

test("Learners can replace suggestions with a new interest and choose independently without changing profiles", async ({
  page,
  tutor,
}) => {
  await openWorkspace(page);
  await page
    .getByRole("button", {
      name: "None of these — something else",
      exact: true,
    })
    .click();
  await page.getByLabel("What are you curious about?").fill("how bread rises");
  await page
    .getByRole("button", { name: "Explore this interest", exact: true })
    .click();
  await expect(page.getByLabel("Your question")).toHaveValue(
    "I am curious about how bread rises. Help me choose a small activity to try, with a concrete first step.",
  );
  tutor.reply(
    "Try comparing a pinch of yeast in two cups: one with sugar and one without. What do you predict you might notice? We can choose another idea if you prefer.",
  );
  await page.getByRole("button", { name: "Ask Tutor", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("one with sugar and one without");
  expect(tutor.requests[0]).toMatchObject({
    activity: { kind: "custom", interest: "how bread rises" },
  });
  await page.getByRole("button", { name: "Switch Learner" }).click();
  await page.getByRole("button", { name: "Open Sky’s workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "What interests you today?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).not.toContainText("bread");
  await page.getByRole("button", { name: "AI literacy", exact: true }).click();
  tutor.reply(
    "Pick a claim from an AI answer. What evidence would let you check whether it is true?",
  );
  await page
    .getByLabel("Your question")
    .fill("Can AI sound sure and still be wrong?");
  await page.getByRole("button", { name: "Ask Tutor", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("Pick a claim");
  expect(tutor.requests[1]).toMatchObject({
    activity: { kind: "ai-literacy" },
  });
  expect(JSON.stringify(tutor.requests[1])).not.toContain("bread");
  await page.getByRole("button", { name: "Switch Learner" }).click();
  await page.getByRole("button", { name: "Open River’s workspace" }).click();
  await expect(
    page.getByRole("region", { name: "Current problem" }),
  ).toContainText("how bread rises");
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("one with sugar and one without");
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).not.toContainText("Pick a claim");
});
