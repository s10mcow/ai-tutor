import type { Page } from "@playwright/test";
import sharp from "sharp";
import { test, expect } from "./fixture";

async function setup(page: Page, email = "parent@example.test") {
  await page.goto("/");
  await page.getByRole("button", { name: "Set up family access" }).click();
  await page.getByLabel("Parent email").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("fictional-password-123");
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
const reflection =
  "I used overlapping blue shapes to make my paper landscape feel quiet. Next I want to try orange.";
const description = "The Tutor sees a blue mountain with a white sun.";
async function attachArt(
  page: Page,
  openai: { reply: (text: string) => void },
) {
  await page.getByRole("button", { name: "Paper art", exact: true }).click();
  openai.reply(JSON.stringify({ readable: true, description }));
  await page.getByLabel("Workbook or artwork picture").setInputFiles({
    name: "fictional-landscape.png",
    mimeType: "image/png",
    buffer: await sharp(
      Buffer.from(
        '<svg width="600" height="300"><rect width="100%" height="100%" fill="#b5dbe8"/><path d="M0 300L200 50L430 300Z" fill="#5276a6"/><path d="M200 300L440 90L600 300Z" fill="#315277"/><circle cx="500" cy="50" r="20" fill="white"/></svg>',
      ),
    )
      .png()
      .toBuffer(),
  });
  await page.getByRole("button", { name: "Read picture", exact: true }).click();
  await expect(page.getByLabel("Check the picture description")).toHaveValue(
    description,
  );
  await page
    .getByRole("button", { name: "Confirm picture", exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: "Attached art picture" }),
  ).toBeVisible();
  const family = await (await page.request.get("/api/family")).json();
  const base = `/api/learners/${family.selectedLearnerId}`;
  const source = (await (await page.request.get(`${base}/session`)).json())
    .session;
  return {
    family,
    base,
    source,
    imagePath: `${base}/session/${source.id}/images/${source.images[0].id}`,
  };
}
async function choosePicture(page: Page) {
  await page.getByRole("button", { name: "Save Learning evidence" }).click();
  const choice = page.getByRole("checkbox", {
    name: "Keep this art picture",
    exact: true,
  });
  await expect(choice).not.toBeChecked();
  await choice.check();
  await page.getByLabel("Entry title").fill("My quiet landscape");
  await expect(
    page.getByRole("button", { name: "Save to Portfolio", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("My reflection", { exact: true }).fill(reflection);
}
test.use({
  controlledTutorEnabled: false,
  modelEnvironment: {
    TUTOR_OPENAI_FIXTURE_URL: "fixture",
    TUTOR_FIXTURE_ALLOWANCE_NANO_USD: "16000000000",
  },
});

test("a Learner deliberately keeps a picture with their own reflection across source cleanup and a fresh visit", async ({
  page,
  openai,
  app,
  browser,
}, testInfo) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await setup(page);
  const { base, source, imagePath } = await attachArt(page, openai);
  const original = await (await page.request.get(imagePath)).body();
  expect(
    (await (await page.request.get(`${base}/portfolio`)).json()).entries,
  ).toEqual([]);
  await choosePicture(page);
  await expect(page.getByRole("dialog")).not.toContainText(description);
  await page.screenshot({
    path: testInfo.outputPath("picture-selection-laptop.png"),
  });
  await page
    .getByRole("button", { name: "Save to Portfolio", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Saved to your Portfolio",
  );
  expect(
    (
      await page.request.delete(imagePath, { headers: { origin: app.url } })
    ).status(),
  ).toBe(200);
  expect((await page.request.get(imagePath)).status()).toBe(404);
  expect(
    (
      await page.request.post(`${base}/session/${source.id}`, {
        headers: { origin: app.url },
        data: { intent: "end" },
      })
    ).status(),
  ).toBe(200);
  await page.goto("about:blank");
  await app.restart({ TUTOR_FIXTURE_ALLOWANCE_NANO_USD: "0" });
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
      .fill("fictional-password-123");
    await returning
      .getByRole("button", { name: "Sign in", exact: true })
      .click();
    await returning
      .getByRole("button", { name: "Open River’s workspace" })
      .click();
    await returning
      .getByRole("button", { name: "My Portfolio", exact: true })
      .click();
    await returning
      .getByRole("button", { name: "Open My quiet landscape", exact: true })
      .click();
    const entry = returning.getByRole("region", {
      name: "Selected Portfolio entry",
    });
    await expect(entry).toContainText(reflection);
    await expect(entry).not.toContainText(description);
    const picture = entry.getByRole("img", { name: "Saved art picture" });
    await expect(picture).toBeVisible();
    await expect
      .poll(() =>
        picture.evaluate((image: HTMLImageElement) => image.naturalWidth),
      )
      .toBe(600);
    const asset = await picture.getAttribute("src");
    expect(asset).not.toBe(imagePath);
    expect(await (await returning.request.get(asset!)).body()).toEqual(
      original,
    );
    await returning
      .getByRole("button", { name: "Show my parent", exact: true })
      .click();
    await expect(
      returning.getByRole("region", { name: "Entry to show my parent" }),
    ).toContainText(reflection);
    await returning.screenshot({
      path: testInfo.outputPath("picture-parent-laptop.png"),
    });
    expect(openai.requests).toHaveLength(1);
  } finally {
    await visit.close();
  }
});

test("a picture keeps the Learner’s own words when its reflection is revised", async ({
  page,
  openai,
  app,
}) => {
  await setup(page);
  const { base, source } = await attachArt(page, openai);
  const input = {
    id: "picture-reflection",
    sessionId: source.id,
    actionIds: [],
    imageIds: [source.images[0].id],
    title: "My quiet landscape",
    reflection,
  };
  expect(
    (
      await page.request.post(`${base}/portfolio`, {
        headers: { origin: app.url },
        data: input,
      })
    ).status(),
  ).toBe(200);
  await page.getByRole("button", { name: "My Portfolio", exact: true }).click();
  await page
    .getByRole("button", { name: "Open My quiet landscape", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Edit my reflection", exact: true })
    .click();
  await page.getByLabel("My reflection", { exact: true }).fill("   ");
  await expect(
    page.getByRole("button", { name: "Save reflection", exact: true }),
  ).toBeDisabled();
  expect(
    (
      await page.request.patch(`${base}/portfolio/${input.id}`, {
        headers: { origin: app.url },
        data: { reflection: "   " },
      })
    ).status(),
  ).toBe(400);
  const revised =
    "The overlapping shapes feel quiet because their blues are similar. I changed my mind about using orange.";
  await page.getByLabel("My reflection", { exact: true }).fill(revised);
  await page
    .getByRole("button", { name: "Save reflection", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Selected Portfolio entry" }),
  ).toContainText(revised);
  const replay = await page.request.post(`${base}/portfolio`, {
    headers: { origin: app.url },
    data: input,
  });
  expect(replay.status()).toBe(200);
  expect((await replay.json()).entry.reflection).toBe(revised);
  await expect(
    page.getByRole("img", { name: "Saved art picture" }),
  ).toBeVisible();
});

test("a failed picture transaction and a lost response recover with one complete saved entry", async ({
  page,
  openai,
  app,
}) => {
  await setup(page);
  const { base, source, imagePath } = await attachArt(page, openai);
  const original = await (await page.request.get(imagePath)).body();
  await choosePicture(page);
  // A real PostgreSQL commit failure after both entry and image inserts.
  await app.configureDatabase(`
    CREATE FUNCTION reject_picture_commit() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'fictional storage failure'; END; $$;
    CREATE CONSTRAINT TRIGGER reject_picture_commit AFTER INSERT ON portfolio_image
      DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION reject_picture_commit();
  `);
  const submission = page.waitForRequest(
    (request) =>
      request.method() === "POST" && request.url().endsWith("/portfolio"),
  );
  await page
    .getByRole("button", { name: "Save to Portfolio", exact: true })
    .click();
  const input = (await submission).postDataJSON();
  const entryPath = `${base}/portfolio/${input.id}`;
  const savedPicturePath = `${entryPath}/images/${source.images[0].id}`;
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "save wasn’t confirmed",
  );
  await expect(page.getByLabel("My reflection", { exact: true })).toHaveValue(
    reflection,
  );
  expect(
    (await (await page.request.get(`${base}/portfolio`)).json()).entries,
  ).toEqual([]);
  expect((await page.request.get(entryPath)).status()).toBe(404);
  expect((await page.request.get(savedPicturePath)).status()).toBe(404);
  expect(await (await page.request.get(imagePath)).body()).toEqual(original);
  await app.configureDatabase(
    "DROP TRIGGER reject_picture_commit ON portfolio_image; DROP FUNCTION reject_picture_commit();",
  );
  await page.route(
    "**/api/learners/*/portfolio",
    async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      expect(route.request().postDataJSON()).toEqual(input);
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      await route.abort("connectionreset");
    },
    { times: 1 },
  );
  await page.getByRole("button", { name: "Retry save", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "save wasn’t confirmed",
  );
  expect(
    (await (await page.request.get(`${base}/portfolio`)).json()).entries,
  ).toHaveLength(1);
  expect(await (await page.request.get(savedPicturePath)).body()).toEqual(
    original,
  );
  expect(
    (
      await page.request.post(`${base}/session/${source.id}`, {
        headers: { origin: app.url },
        data: { intent: "end" },
      })
    ).status(),
  ).toBe(200);
  await page.getByRole("button", { name: "Retry save", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Saved to your Portfolio",
  );
  const replay = await Promise.all(
    [1, 2].map(() =>
      page.request.post(`${base}/portfolio`, {
        headers: { origin: app.url },
        data: input,
      }),
    ),
  );
  expect(replay.map((response) => response.status())).toEqual([200, 200]);
  expect((await replay[0].json()).entry.images).toHaveLength(1);
  expect(
    (
      await page.request.post(`${base}/portfolio`, {
        headers: { origin: app.url },
        data: { ...input, imageIds: ["different-picture"] },
      })
    ).status(),
  ).toBe(409);
  expect(
    (await (await page.request.get(`${base}/portfolio`)).json()).entries,
  ).toHaveLength(1);
  await page.getByRole("button", { name: "My Portfolio", exact: true }).click();
  await page
    .getByRole("button", { name: "Open My quiet landscape", exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: "Saved art picture" }),
  ).toBeVisible();
  expect(openai.requests).toHaveLength(1);
});

test("Portfolio picture sources and direct URLs enforce family, Learner and entry ownership", async ({
  page,
  openai,
  app,
  browser,
}) => {
  await setup(page);
  const { family, base, source } = await attachArt(page, openai);
  const skyId = family.learners.find(
    (learner: { name: string }) => learner.name === "Sky",
  ).id;
  const sibling = `/api/learners/${skyId}`;
  const input = {
    id: "owned-picture",
    sessionId: source.id,
    actionIds: [],
    imageIds: [source.images[0].id],
    title: "River’s artwork",
    reflection,
  };
  const endpoint = `${base}/portfolio`;
  const saves = await Promise.all(
    [1, 2].map(() =>
      page.request.post(endpoint, {
        headers: { origin: app.url },
        data: input,
      }),
    ),
  );
  expect(saves.map((response) => response.status())).toEqual([200, 200]);
  const saved = (await saves[0].json()).entry;
  expect(saved.evidence).toEqual([]);
  expect(saved.images).toEqual([
    { id: source.images[0].id, kind: "art", width: 600, height: 300 },
  ]);
  const asset = `${endpoint}/${input.id}/images/${source.images[0].id}`;
  const allowed = await page.request.get(asset);
  expect(allowed.status()).toBe(200);
  expect(allowed.headers()).toMatchObject({
    "content-type": "image/jpeg",
    "cache-control": "private, no-store",
    "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'none'; sandbox",
  });
  expect(
    (
      await page.request.get(
        `${sibling}/portfolio/${input.id}/images/${source.images[0].id}`,
      )
    ).status(),
  ).toBe(404);
  expect(
    (
      await page.request.get(
        `${endpoint}/different-entry/images/${source.images[0].id}`,
      )
    ).status(),
  ).toBe(404);
  expect(
    (
      await page.request.get(`${endpoint}/${input.id}/images/missing-picture`)
    ).status(),
  ).toBe(404);
  for (const id of [input.id, "stolen-source"]) {
    expect(
      (
        await page.request.post(`${sibling}/portfolio`, {
          headers: { origin: app.url },
          data: { ...input, id },
        })
      ).status(),
    ).toBe(404);
  }
  const siblingSession = (
    await (
      await page.request.post(`${sibling}/session`, {
        headers: { origin: app.url },
        data: {},
      })
    ).json()
  ).session;
  expect(
    (
      await page.request.post(`${sibling}/portfolio`, {
        headers: { origin: app.url },
        data: {
          ...input,
          id: "sibling-source-substitution",
          sessionId: siblingSession.id,
        },
      })
    ).status(),
  ).toBe(404);
  for (const invalid of [
    { imageIds: [] },
    { imageIds: ["https://untrusted.example/picture.jpg"] },
    { imageIds: [source.images[0].id, source.images[0].id] },
    { imageIds: null },
    { reflection: "   " },
  ]) {
    expect(
      (
        await page.request.post(endpoint, {
          headers: { origin: app.url },
          data: { ...input, id: "invalid-picture", ...invalid },
        })
      ).status(),
    ).toBe(400);
  }
  expect(
    (
      await page.request.post(endpoint, {
        headers: { origin: "https://untrusted.example" },
        data: { ...input, id: "cross-origin-picture" },
      })
    ).status(),
  ).toBe(403);
  const other = await browser.newContext({ baseURL: app.url });
  try {
    expect((await other.request.get(asset)).status()).toBe(401);
    expect(
      (
        await other.request.post(endpoint, {
          headers: { origin: app.url },
          data: input,
        })
      ).status(),
    ).toBe(401);
    await setup(await other.newPage(), "other@example.test");
    expect((await other.request.get(asset)).status()).toBe(404);
    const stranger = await (await other.request.get("/api/family")).json();
    const strangerBase = `/api/learners/${stranger.selectedLearnerId}`;
    expect(
      (
        await other.request.get(
          `${strangerBase}/portfolio/${input.id}/images/${source.images[0].id}`,
        )
      ).status(),
    ).toBe(404);
    expect(
      (
        await other.request.post(`${strangerBase}/portfolio`, {
          headers: { origin: app.url },
          data: { ...input, id: "cross-family-source" },
        })
      ).status(),
    ).toBe(404);
  } finally {
    await other.close();
  }
  await page.getByRole("button", { name: "Switch Learner" }).click();
  await page.getByRole("button", { name: "Open Sky’s workspace" }).click();
  await page.getByRole("button", { name: "My Portfolio", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "My Portfolio", exact: true }),
  ).not.toContainText("River’s artwork");
  await expect(
    page.getByRole("img", { name: "Saved art picture" }),
  ).toHaveCount(0);
  expect(
    (await (await page.request.get(endpoint)).json()).entries,
  ).toHaveLength(1);
});

test.describe("Picture evidence after activity expiry", () => {
  test.use({ sessionRetentionSeconds: 12 });
  test("only the selected picture lasts and an explanation can accompany it without an extra reflection", async ({
    page,
    openai,
    app,
  }) => {
    await setup(page);
    const { base, source, imagePath } = await attachArt(page, openai);
    const original = await (await page.request.get(imagePath)).body();
    const explanation =
      "I overlapped blue triangles because the darker mountain should feel closer.";
    openai.reply("What choice did you make in your drawing?");
    await page.getByLabel("Your message").fill("Help me explain my drawing.");
    await page.getByRole("button", { name: "Ask Tutor", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Conversation" }),
    ).toContainText("What choice");
    openai.reply("Which edge gives you that feeling?");
    await page.getByLabel("Your message").fill(explanation);
    await page
      .getByRole("button", { name: "Share attempt", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "Conversation" }),
    ).toContainText("Which edge");
    await page.getByRole("button", { name: "Save Learning evidence" }).click();
    await page
      .getByRole("checkbox", { name: explanation, exact: true })
      .check();
    await expect(
      page.getByRole("checkbox", {
        name: "Keep this art picture",
        exact: true,
      }),
    ).not.toBeChecked();
    await page.getByLabel("Entry title").fill("Just my explanation");
    await page
      .getByRole("button", { name: "Save to Portfolio", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "Saved to your Portfolio",
    );
    await page.getByRole("button", { name: "Save Learning evidence" }).click();
    await page
      .getByRole("checkbox", { name: explanation, exact: true })
      .check();
    await page
      .getByRole("checkbox", { name: "Keep this art picture", exact: true })
      .check();
    await page.getByLabel("Entry title").fill("My picture and explanation");
    await page
      .getByRole("button", { name: "Save to Portfolio", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "Saved to your Portfolio",
    );
    const entries = (await (await page.request.get(`${base}/portfolio`)).json())
      .entries;
    const textEntry = entries.find(
      (entry: { title: string }) => entry.title === "Just my explanation",
    );
    const pictureEntry = entries.find(
      (entry: { title: string }) =>
        entry.title === "My picture and explanation",
    );
    expect(
      (
        await (
          await page.request.get(`${base}/portfolio/${textEntry.id}`)
        ).json()
      ).entry.images,
    ).toEqual([]);
    expect(
      (
        await page.request.get(
          `${base}/portfolio/${textEntry.id}/images/${source.images[0].id}`,
        )
      ).status(),
    ).toBe(404);
    await expect
      .poll(async () => (await page.request.get(imagePath)).status(), {
        timeout: 12000,
      })
      .toBe(404);
    // Reading the activity physically purges its expired temporary rows.
    expect(
      (await page.request.get(`${base}/session/${source.id}`)).status(),
    ).toBe(404);
    expect(
      (
        await page.request.post(`${base}/portfolio`, {
          headers: { origin: app.url },
          data: {
            id: "expired-picture",
            sessionId: source.id,
            actionIds: [],
            imageIds: [source.images[0].id],
            title: "Too late",
            reflection,
          },
        })
      ).status(),
    ).toBe(404);
    expect(
      await (
        await page.request.get(
          `${base}/portfolio/${pictureEntry.id}/images/${source.images[0].id}`,
        )
      ).body(),
    ).toEqual(original);
    await page
      .getByRole("button", { name: "My Portfolio", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Open My picture and explanation",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("region", { name: "Selected Portfolio entry" }),
    ).toContainText(explanation);
    await expect(
      page.getByRole("img", { name: "Saved art picture" }),
    ).toBeVisible();
    expect(openai.requests).toHaveLength(3);
  });
});
