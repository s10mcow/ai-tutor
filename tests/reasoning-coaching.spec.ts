import type { Page } from "@playwright/test";
import { test, expect } from "./fixture";

async function openActivity(page: Page) {
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
  await page.getByRole("button", { name: "Start an activity" }).click();
  await page
    .getByLabel("Your question")
    .fill("How can I share 24 pencils equally among 6 cups?");
  await page.getByRole("button", { name: "Ask Tutor", exact: true }).click();
  await expect(page.getByLabel("Your message")).toBeEnabled();
}

async function message(page: Page, text: string, purpose = "attempt") {
  await page.getByLabel("Message purpose").selectOption(purpose);
  await page.getByLabel("Your message").fill(text);
  await page
    .getByRole("button", {
      name: purpose === "attempt" ? "Share attempt" : "Send message",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Your message")).toBeEnabled();
}

test("reasons, alternatives and supplied evidence can revise an answer and challenge the Tutor", async ({
  page,
  tutor,
}) => {
  tutor.reply("What would you put in each cup, and why?");
  await openActivity(page);
  tutor.reply(
    "Four fits, but adding 24 and 6 does not explain equal sharing. How could you check six groups of four?",
  );
  await message(page, "4, because I added 24 and 6.");
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("does not explain equal sharing");
  tutor.reply(
    "Compare making six groups with subtracting six repeatedly. What stays the same?",
  );
  await page
    .getByRole("button", { name: "More coaching choices", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Compare another way", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("subtracting six repeatedly");
  tutor.reply(
    "Those six groups use 24 pencils. What would you change about your earlier reason?",
  );
  await message(
    page,
    "My drawing shows six groups of four, using all 24 pencils.",
    "evidence",
  );
  tutor.reply(
    "That revised reason checks the total and equal groups. It is useful evidence, not a mastery label.",
  );
  await message(
    page,
    "I changed my mind: six times four is 24, not 24 plus 6.",
  );
  tutor.reply(
    "You are right to question that. If I said six groups of four make 30, I was wrong: they make 24. Let’s use the corrected total.",
  );
  await message(
    page,
    "You said six groups of four make 30. My six groups add up to 24. Please check that claim.",
    "challenge",
  );
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("I was wrong");
  const context = tutor.requests.at(-1)!;
  expect(context.actions.map((action) => action.intent)).toEqual([
    "question",
    "attempt",
    "alternative",
    "evidence",
    "attempt",
    "challenge",
  ]);
  expect(context.actions[1].text).toBe("4, because I added 24 and 6.");
  expect(context.actions[3].text).toContain("six groups of four");
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("I changed my mind");
  await expect(
    page.getByRole("region", { name: "Current problem" }),
  ).toContainText("24 pencils");
});

test.describe("reasoning through the metered Sol boundary", () => {
  test.use({
    controlledTutorEnabled: false,
    modelEnvironment: {
      TUTOR_OPENAI_FIXTURE_URL: "fixture",
      TUTOR_FIXTURE_ALLOWANCE_NANO_USD: "8000000000",
    },
  });
  test("coached reasons and a distinct fresh attempt reach Sol and settle the shared allowance", async ({
    page,
    openai,
    tutor,
  }) => {
    openai.reply("How could you check six equal groups?");
    await openActivity(page);
    openai.reply(
      "Four fits the total, but adding does not explain equal sharing. What would six groups show?",
    );
    await message(page, "4 because I added 24 and 6.");
    openai.reply(
      "Share 15 buttons equally among 3 bags. How many in each, and why?",
    );
    await page
      .getByRole("button", { name: "More coaching choices", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Fresh challenge", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "Fresh challenge" }),
    ).toContainText("15 buttons");
    openai.reply("How did you check that all bags have an equal share?");
    await message(page, "5 because three groups of five make 15.");
    const sent = openai.requests.at(-1)!.body;
    expect(sent.model).toBe("gpt-6.1-sol");
    expect(sent.tools).toEqual([]);
    expect(JSON.stringify(sent.input)).toContain("24 pencils");
    expect(JSON.stringify(sent.input)).toContain("4 because I added 24 and 6.");
    expect(JSON.stringify(sent.input)).toContain("[fresh]");
    expect(JSON.stringify(sent.input)).toContain("15 buttons");
    expect(sent.input.at(-1).content).toBe(
      "[attempt] 5 because three groups of five make 15.",
    );
    expect(sent.instructions).not.toContain("4 because I added 24 and 6.");
    expect(
      (await (await page.request.get("/api/model-access")).json())
        .settledNanoUsd,
    ).toBe("92000000");
    expect(tutor.requests).toHaveLength(0);
  });
});

test("a break saves the draft and question through restart and profile switching without a Tutor call", async ({
  page,
  tutor,
  app,
  browser,
}, testInfo) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  tutor.reply("What could help you check equal groups?");
  await openActivity(page);
  await page
    .getByLabel("My scratchpad")
    .fill("Six circles; four dots in each. Not finished.");
  await page.getByLabel("Message purpose").selectOption("evidence");
  await page.getByLabel("Your message").fill("My drawing shows");
  const family = await (await page.request.get("/api/family")).json();
  const endpoint = `/api/learners/${family.selectedLearnerId}/session`;
  const before = (await (await page.request.get(endpoint)).json()).session;
  await page.getByRole("button", { name: "Take a break", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Activity paused");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: testInfo.outputPath("paused-laptop.png"),
    fullPage: false,
  });
  expect(tutor.requests).toHaveLength(1);
  await app.restart();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Resume activity", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("My scratchpad")).toHaveValue(
    "Six circles; four dots in each. Not finished.",
  );
  const paused = (await (await page.request.get(endpoint)).json()).session;
  expect(paused.expiresAt).toBe(before.expiresAt);
  expect(paused.actions).toEqual(before.actions);
  const blocked = await page.request.post(`${endpoint}/${before.id}`, {
    headers: { origin: app.url },
    data: {
      id: "during-break",
      intent: "attempt",
      text: "Do not send while paused",
    },
  });
  expect(blocked.status()).toBe(409);
  const skyId = family.learners.find(
    (learner: { name: string }) => learner.name === "Sky",
  ).id;
  expect(
    (
      await page.request.post(`/api/learners/${skyId}/session/${before.id}`, {
        headers: { origin: app.url },
        data: { intent: "resume" },
      })
    ).status(),
  ).toBe(404);
  const guest = await browser.newContext({ baseURL: app.url });
  expect(
    (
      await guest.request.post(`${endpoint}/${before.id}`, {
        headers: { origin: app.url },
        data: { intent: "resume" },
      })
    ).status(),
  ).toBe(401);
  await guest.close();
  await page.getByRole("button", { name: "Switch Learner" }).click();
  await page.getByRole("button", { name: "Open Sky’s workspace" }).click();
  await expect(
    page.getByRole("button", { name: "Resume activity", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Six circles; four dots in each. Not finished."),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Switch Learner" }).click();
  await page.getByRole("button", { name: "Open River’s workspace" }).click();
  await page
    .getByRole("button", { name: "Resume activity", exact: true })
    .click();
  await expect(page.getByLabel("Your message")).toHaveValue("My drawing shows");
  await expect(page.getByLabel("Message purpose")).toHaveValue("evidence");
  await expect(page.getByLabel("My scratchpad")).toHaveValue(
    "Six circles; four dots in each. Not finished.",
  );
  tutor.reply("Use your drawing to check the total.");
  await message(
    page,
    "My drawing shows six equal groups of four dots.",
    "evidence",
  );
  expect(tutor.requests).toHaveLength(2);
  await page.getByRole("button", { name: "End activity", exact: true }).click();
  expect((await page.request.get(`${endpoint}/${before.id}`)).status()).toBe(
    404,
  );
});

test("continued confusion can change the approach and a fresh challenge keeps the coached work distinct", async ({
  page,
  tutor,
}, testInfo) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  tutor.reply("Try making six equal groups.");
  await openActivity(page);
  tutor.reply(
    "For example, 12 beads shared among three jars gives four in each.",
  );
  await page
    .getByRole("button", { name: "Show an example", exact: true })
    .click();
  await expect(page.getByLabel("Your message")).toBeEnabled();
  tutor.reply(
    "Let’s change from jars to a drawing: put one dot in each of two boxes. What could come next?",
  );
  await message(page, "I still don't get it.");
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("two boxes");
  tutor.reply(
    "We can use just four counters and two spaces. Put one counter in each space; stop there.",
  );
  await message(page, "I don't know what to do next.");
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("four counters");
  tutor.reply(
    "A different way: draw two spaces on paper and move pretend counters between them.",
  );
  await page
    .getByRole("button", { name: "More coaching choices", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Explain differently", exact: true })
    .click();
  await expect(page.getByLabel("Your message")).toBeEnabled();
  tutor.reply(
    "Start smaller: share two counters between two spaces. You may also take a break.",
  );
  await page
    .getByRole("button", { name: "More coaching choices", exact: true })
    .click();
  await page.getByRole("button", { name: "Start easier", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("Start smaller");
  tutor.reply(
    "Share 15 buttons equally among 3 bags. How many in each, and how could you check? Try your own way first.",
  );
  await page
    .getByRole("button", { name: "More coaching choices", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Fresh challenge", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Fresh challenge" }),
  ).toContainText("15 buttons");
  await expect(
    page.getByRole("region", { name: "Current problem" }),
  ).toContainText("24 pencils");
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Fresh challenge" }),
  ).toContainText("15 buttons");
  tutor.reply("How does your check show every bag has the same amount?");
  await message(page, "5 in each: three fives make 15.");
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("Fresh challenge attempt");
  const context = tutor.requests.at(-1)!;
  expect(context.actions.slice(-4).map((action) => action.intent)).toEqual([
    "different",
    "easier",
    "fresh",
    "attempt",
  ]);
  expect(context.actions.at(-2)?.reply).toContain("15 buttons");
  expect(context.actions.at(-1)?.text).toBe("5 in each: three fives make 15.");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: testInfo.outputPath("fresh-challenge-laptop.png"),
    fullPage: false,
  });
});
