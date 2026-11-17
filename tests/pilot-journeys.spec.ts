import type { Page } from "@playwright/test";
import sharp from "sharp";
import { test, expect } from "./fixture";

test.use({
  controlledTutorEnabled: false,
  modelEnvironment: {
    TUTOR_OPENAI_FIXTURE_URL: "fixture",
    TUTOR_FIXTURE_ALLOWANCE_NANO_USD: "16000000000",
  },
  viewport: { width: 1366, height: 768 },
  launchOptions: { args: ["--autoplay-policy=no-user-gesture-required"] },
});
async function setup(page: Page, name: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "Set up family access" }).click();
  await page.getByLabel("Parent email").fill("parent@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Fictional-parent-password-42");
  await page.getByLabel("Family setup code").fill("fictional-family-invite");
  await page.getByRole("button", { name: "Create family account" }).click();
  for (const learner of ["River", "Sky"]) {
    await page.getByLabel("Learner name").fill(learner);
    await page.getByRole("button", { name: "Add Learner" }).click();
    await expect(
      page.getByRole("button", { name: `Open ${learner}’s workspace` }),
    ).toBeVisible();
  }
  await page.getByRole("button", { name: `Open ${name}’s workspace` }).click();
}
async function picture(
  page: Page,
  openai: { reply: (text: string) => void },
  description: string,
  art = false,
) {
  const svg = art
    ? '<svg width="600" height="300"><rect width="600" height="300" fill="#9ed7da"/><path d="M0 300L200 50L430 300Z" fill="#5276a6"/><circle cx="500" cy="50" r="20" fill="white"/></svg>'
    : '<svg width="600" height="300"><rect width="600" height="300" fill="white"/><text x="20" y="90" font-size="28">24 pencils shared among 6 cups</text></svg>';
  openai.reply(JSON.stringify({ readable: true, description }));
  await page.getByLabel("Workbook or artwork picture").setInputFiles({
    name: "fictional-work.png",
    mimeType: "image/png",
    buffer: await sharp(Buffer.from(svg)).png().toBuffer(),
  });
  await page.getByRole("button", { name: "Read picture", exact: true }).click();
  await expect(page.getByLabel("Check the picture description")).toHaveValue(
    description,
  );
}
async function attempt(
  page: Page,
  openai: { reply: (text: string) => void },
  text: string,
  reply: string,
) {
  openai.reply(reply);
  await page.getByLabel("Message purpose").selectOption("attempt");
  await page.getByLabel("Your message").fill(text);
  await page
    .getByRole("button", { name: "Share attempt", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText(reply);
}

test("older fictional Learner corrects a workbook, tries a fresh challenge, and shows selected own work despite outage and exhausted allowance", async ({
  page,
  app,
  openai,
  browser,
}, testInfo) => {
  await setup(page, "River");
  await page
    .getByRole("button", { name: "Workbook maths", exact: true })
    .click();
  await picture(page, openai, "24 pencils shared among 8 cups");
  await page
    .getByLabel("Check the picture description")
    .fill("24 pencils shared among 6 cups");
  await page
    .getByRole("button", { name: "Confirm picture", exact: true })
    .click();
  await attempt(
    page,
    openai,
    "Four, because six groups of four use all 24 pencils.",
    "How could you check the total using your groups?",
  );
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
  const ownWork =
    "Five per bag, because three groups of five make 15 and no buttons remain.";
  await attempt(
    page,
    openai,
    ownWork,
    "Your explanation accounts for every button. What connects the two problems?",
  );
  const context = JSON.stringify(openai.requests.at(-1)!.body.input);
  expect(context).toContain("24 pencils shared among 6 cups");
  expect(context).not.toContain("24 pencils shared among 8 cups");
  expect(context).toContain("15 buttons");
  await page.screenshot({
    path: testInfo.outputPath("older-coaching-laptop.png"),
  });
  await page
    .getByRole("button", { name: "Remember for next time", exact: true })
    .click();
  await page
    .getByLabel("An approach that helped me")
    .fill("Drawing equal groups helped me check the total.");
  await page
    .getByLabel("A possible next step")
    .fill("Try sharing 18 counters into equal groups.");
  await page
    .getByRole("button", { name: "Save learning notes", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Learning notes saved");
  await page.getByRole("button", { name: "Save Learning evidence" }).click();
  await page
    .getByRole("checkbox", { name: "Keep this workbook picture", exact: true })
    .check();
  await page.getByRole("checkbox", { name: ownWork, exact: true }).check();
  await page.getByLabel("Entry title").fill("My equal groups discovery");
  await page
    .getByLabel("My reflection", { exact: true })
    .fill("I checked each group and then checked the whole amount.");
  await page
    .getByRole("button", { name: "Save to Portfolio", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved to your Portfolio" }),
  ).toBeVisible();
  const family = await (await page.request.get("/api/family")).json();
  const base = `/api/learners/${family.selectedLearnerId}`;
  const session = (await (await page.request.get(`${base}/session`)).json())
    .session;
  const entries = (await (await page.request.get(`${base}/portfolio`)).json())
    .entries;
  const entry = (
    await (await page.request.get(`${base}/portfolio/${entries[0].id}`)).json()
  ).entry;
  expect(entry.evidence.map((item: { text: string }) => item.text)).toEqual([
    ownWork,
  ]);
  const imagePath = `${base}/portfolio/${entry.id}/images/${entry.images[0].id}`;
  const imageBytes = await (await page.request.get(imagePath)).body();
  // A failure is recoverable, without erasing the deliberate save.
  openai.fail(503, "provider_unavailable");
  await page
    .getByRole("button", { name: "Give me a hint", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Conversation" }).getByRole("alert"),
  ).toContainText("couldn’t reply");
  expect((await page.request.get(imagePath)).status()).toBe(200);
  // A delayed result for River cannot arrive in Sky's workspace or memory.
  const release = openai.hold("River-only delayed coaching.");
  try {
    await page
      .getByRole("button", { name: "Retry reply", exact: true })
      .click();
    await expect.poll(() => openai.requests.length).toBe(6);
    await page.getByRole("button", { name: "Switch Learner" }).click();
    await page.getByRole("button", { name: "Open Sky’s workspace" }).click();
    release();
    await expect
      .poll(async () => {
        const current = await (
          await page.request.get(`${base}/session/${session.id}`)
        ).json();
        return current.session.actions.at(-1).status;
      })
      .toBe("complete");
    await expect(
      page.getByRole("heading", { name: "What interests you today?" }),
    ).toBeVisible();
    await expect(page.getByText("River-only delayed coaching.")).toHaveCount(0);
    await expect(
      page.getByText("Drawing equal groups helped me check the total."),
    ).toHaveCount(0);
    const sky = family.learners.find(
      (item: { name: string }) => item.name === "Sky",
    );
    expect(
      (
        await page.request.get(
          imagePath.replace(family.selectedLearnerId, sky.id),
        )
      ).status(),
    ).toBe(404);
    expect(
      (
        await page.request.get(
          `${base.replace(family.selectedLearnerId, sky.id)}/session/${session.id}`,
        )
      ).status(),
    ).toBe(404);
  } finally {
    release();
  }
  // Close temporary source, restart with no new allowance, and use a fresh authenticated browser.
  const ended = await page.request.post(`${base}/session/${session.id}`, {
    headers: { origin: app.url },
    data: { intent: "end" },
  });
  expect(ended.status()).toBe(200);
  expect(
    (
      await page.request.get(
        `${base}/session/${session.id}/images/${session.images[0].id}`,
      )
    ).status(),
  ).toBe(404);
  await page.goto("about:blank");
  await app.configureDatabase(
    "INSERT INTO model_operation (id, allowance_id, operation, price_policy, reserved_nano_usd, status) VALUES ('synthetic-pilot-liability', 'fixture-window', 'text', 'fixture-policy', 16000000000, 'usage_unknown')",
  );
  await app.restart();
  const visit = await browser.newContext({
    baseURL: app.url,
    viewport: { width: 1366, height: 768 },
  });
  try {
    const returning = await visit.newPage();
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
    await expect(
      returning.getByRole("region", { name: "Learning continuity" }),
    ).toContainText("18 counters");
    await returning
      .getByRole("button", { name: "My Portfolio", exact: true })
      .click();
    await returning
      .getByRole("button", {
        name: "Open My equal groups discovery",
        exact: true,
      })
      .click();
    await returning
      .getByRole("button", { name: "Show my parent", exact: true })
      .click();
    await expect(
      returning.getByRole("region", { name: "Entry to show my parent" }),
    ).toContainText(ownWork);
    expect(await (await returning.request.get(imagePath)).body()).toEqual(
      imageBytes,
    );
    expect(
      await (await returning.request.get("/api/model-access")).json(),
    ).toMatchObject({
      ready: false,
      reason: "allowance_exhausted",
      familyState: "setup",
    });
    await returning.screenshot({
      path: testInfo.outputPath("older-portfolio-laptop.png"),
    });
    const guest = await browser.newContext({ baseURL: app.url });
    expect((await guest.request.get(imagePath)).status()).toBe(401);
    await guest.close();
  } finally {
    await visit.close();
  }
});

async function microphone(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => {
        const context = new AudioContext({ sampleRate: 16000 });
        await context.resume();
        const destination = context.createMediaStreamDestination();
        const oscillator = context.createOscillator();
        oscillator.connect(destination);
        oscillator.start();
        for (const track of destination.stream.getTracks()) {
          const stop = track.stop.bind(track);
          track.stop = () => {
            stop();
            oscillator.stop();
            void context.close();
          };
        }
        return destination.stream;
      },
    });
  });
}

test("younger fictional Learner plays a short game, discusses paper art, and deliberately keeps a spoken picture reflection for a later visit", async ({
  page,
  app,
  openai,
  browser,
}, testInfo) => {
  await microphone(page);
  await setup(page, "Sky");
  await page
    .getByRole("button", { name: "Short maths game", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start with smaller numbers", exact: true })
    .click();
  await page.getByLabel("Tiles in each tray").fill("3");
  await page
    .getByLabel("Why did you choose that number?")
    .fill("I counted the three trays.");
  await page
    .getByRole("button", { name: "Check my idea", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Game coaching" }),
  ).toContainText("9 of the 12 tiles");
  await page
    .getByRole("button", { name: "Show an example", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Game coaching" }),
  ).toContainText("6 tiles shared between 2 trays");
  await page.getByLabel("Tiles in each tray").fill("4");
  await page
    .getByLabel("Why did you choose that number?")
    .fill("Three groups of four use all twelve tiles.");
  await page
    .getByRole("button", { name: "Check my idea", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Try the next delivery", exact: true })
    .click();
  await page.getByLabel("Tiles in each tray").fill("5");
  await page
    .getByLabel("Why did you choose that number?")
    .fill("Four groups of five make twenty.");
  await page
    .getByRole("button", { name: "Check my idea", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Game complete" }),
  ).toBeVisible();
  expect(openai.requests).toHaveLength(0);
  await page.getByRole("button", { name: "End activity", exact: true }).click();
  await page.getByRole("button", { name: "Paper art", exact: true }).click();
  await picture(
    page,
    openai,
    "A blue paper mountain under a white moon.",
    true,
  );
  await page
    .getByRole("button", { name: "Confirm picture", exact: true })
    .click();
  await attempt(
    page,
    openai,
    "I layered dark blue paper under a pale sky to make the mountain feel quiet.",
    "What changes when you place a lighter piece next to the mountain?",
  );
  await page
    .getByRole("button", { name: "Record a message", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Recording" }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Attached art picture" }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("younger-voice-art-laptop.png"),
  });
  openai.transcribe("I might try yellow paper beside the blue.");
  await page.waitForTimeout(400);
  await page
    .getByRole("button", { name: "Stop and transcribe", exact: true })
    .click();
  await expect(page.getByLabel("Review your transcription")).toHaveValue(
    "I might try yellow paper beside the blue.",
  );
  // Ordinary spoken input remains distinct from the new recording chosen for saving.
  await page
    .getByRole("button", { name: "Discard recording", exact: true })
    .click();
  await page.getByRole("button", { name: "Save Learning evidence" }).click();
  await page
    .getByRole("checkbox", { name: "Keep this art picture", exact: true })
    .check();
  await page.getByLabel("Entry title").fill("My quiet paper mountain");
  await page
    .getByRole("button", { name: "Record a reflection to keep", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Recording your reflection" }),
  ).toBeVisible();
  await page.waitForTimeout(1200);
  await page
    .getByRole("button", { name: "Stop and review reflection", exact: true })
    .click();
  await expect(page.getByLabel("Review spoken reflection")).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("younger-reflection-laptop.png"),
  });
  await page
    .getByRole("button", { name: "Save to Portfolio", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved to your Portfolio" }),
  ).toBeVisible();
  const family = await (await page.request.get("/api/family")).json();
  const base = `/api/learners/${family.selectedLearnerId}`;
  const entries = (await (await page.request.get(`${base}/portfolio`)).json())
    .entries;
  const entry = (
    await (await page.request.get(`${base}/portfolio/${entries[0].id}`)).json()
  ).entry;
  expect(entry.evidence).toEqual([]);
  expect(entry.reflection).toBe("");
  expect(entry.audio.durationSeconds).toBeGreaterThan(0.25);
  const audioPath = `${base}/portfolio/${entry.id}/audio`;
  const bytes = await (await page.request.get(audioPath)).body();
  const river = family.learners.find(
    (item: { name: string }) => item.name === "River",
  );
  expect(
    (
      await page.request.get(
        audioPath.replace(family.selectedLearnerId, river.id),
      )
    ).status(),
  ).toBe(404);
  expect(
    (
      await page.request.get(
        `${base.replace(family.selectedLearnerId, river.id)}/portfolio/${entry.id}`,
      )
    ).status(),
  ).toBe(404);
  expect(openai.requests).toHaveLength(3);
  await page.getByRole("button", { name: "End activity", exact: true }).click();
  await page.goto("about:blank");
  await app.restart({ TUTOR_OPENAI_FIXTURE_URL: "" });
  const returning = await browser.newContext({
    baseURL: app.url,
    storageState: await page.context().storageState(),
    viewport: { width: 1366, height: 768 },
  });
  try {
    const visit = await returning.newPage();
    await visit.goto("/");
    await visit
      .getByRole("button", { name: "My Portfolio", exact: true })
      .click();
    await visit
      .getByRole("button", {
        name: "Open My quiet paper mountain",
        exact: true,
      })
      .click();
    const audio = visit.getByLabel("Saved spoken reflection");
    await audio.evaluate(async (element: HTMLAudioElement) => {
      await element.play();
    });
    await expect
      .poll(() =>
        audio.evaluate((element: HTMLAudioElement) => element.currentTime),
      )
      .toBeGreaterThan(0);
    expect(await (await visit.request.get(audioPath)).body()).toEqual(bytes);
    await expect(
      visit.getByRole("img", { name: "Saved art picture" }),
    ).toBeVisible();
    await visit
      .getByRole("button", { name: "Show my parent", exact: true })
      .click();
    await expect(
      visit
        .getByRole("region", { name: "Entry to show my parent" })
        .getByLabel("Saved spoken reflection"),
    ).toBeVisible();
    await visit.screenshot({
      path: testInfo.outputPath("younger-portfolio-laptop.png"),
    });
    const guest = await browser.newContext({ baseURL: app.url });
    expect((await guest.request.get(audioPath)).status()).toBe(401);
    await guest.close();
    expect(openai.requests).toHaveLength(3);
  } finally {
    await returning.close();
  }
});
