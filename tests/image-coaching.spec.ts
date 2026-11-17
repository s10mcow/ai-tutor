import { applicationRetentionEvidence } from "./readiness-evidence";
import { test, expect } from "./fixture";
import sharp from "sharp";
import type { Page } from "@playwright/test";

async function setup(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Set up family access" }).click();
  await page.getByLabel("Parent email").fill("parent@example.test");
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
  await page
    .getByRole("button", { name: "Workbook maths", exact: true })
    .click();
  await expect(page.getByLabel("Workbook or artwork picture")).toBeVisible();
}
async function picture() {
  return {
    name: "fictional-workbook.png",
    mimeType: "image/png",
    buffer: await sharp(
      Buffer.from(
        '<svg width="600" height="300"><rect width="100%" height="100%" fill="white"/><text x="30" y="100" font-size="32">24 pencils in 6 cups</text></svg>',
      ),
    )
      .png()
      .toBuffer(),
  };
}
test.use({
  controlledTutorEnabled: false,
  modelEnvironment: {
    TUTOR_OPENAI_FIXTURE_URL: "fixture",
    TUTOR_FIXTURE_ALLOWANCE_NANO_USD: "16000000000",
  },
});
test("a picture over 4 MB is rejected before upload and a smaller replacement can be read", async ({
  page,
  openai,
}) => {
  await setup(page);
  const large = await sharp({
    create: { width: 1200, height: 1200, channels: 3, background: "white" },
  })
    .png({ compressionLevel: 0 })
    .toBuffer();
  expect(large.length).toBeGreaterThan(4_000_000);
  expect(large.length).toBeLessThan(4_500_000);
  const uploads: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/images/"))
      uploads.push(request.url());
  });
  await page.getByLabel("Workbook or artwork picture").setInputFiles({
    name: "large-workbook.png",
    mimeType: "image/png",
    buffer: large,
  });
  await page.getByRole("button", { name: "Read picture", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Activity picture" }).getByRole("alert"),
  ).toContainText("4 MB");
  expect(uploads).toHaveLength(0);
  expect(openai.requests).toHaveLength(0);
  openai.reply(
    JSON.stringify({ readable: true, description: "24 pencils in 6 cups" }),
  );
  await page
    .getByLabel("Workbook or artwork picture")
    .setInputFiles(await picture());
  await page.getByRole("button", { name: "Read picture", exact: true }).click();
  await expect(page.getByLabel("Check the picture description")).toHaveValue(
    "24 pencils in 6 cups",
  );
  expect(uploads).toHaveLength(1);
});

test("direct picture uploads enforce the 4 MB limit before normalization", async ({
  page,
  app,
  openai,
}) => {
  await setup(page);
  const family = await (await page.request.get("/api/family")).json();
  const base = `/api/learners/${family.selectedLearnerId}/session`;
  const session = (await (await page.request.get(base)).json()).session;
  const path = `${base}/${session.id}/images/size-boundary`;
  const large = await sharp({
    create: { width: 1200, height: 1200, channels: 3, background: "white" },
  })
    .png({ compressionLevel: 0 })
    .toBuffer();
  const headers = {
    origin: app.url,
    "content-type": "image/png",
    "x-picture-kind": "workbook",
  };
  const rejected = await page.request.post(path, { headers, data: large });
  expect(rejected.status()).toBe(413);
  expect((await rejected.json()).error).toContain("4 MB");
  expect((await (await page.request.get(base)).json()).session.images).toEqual(
    [],
  );
  expect(openai.requests).toHaveLength(0);
  const smaller = await picture();
  expect(
    (await page.request.post(path, { headers, data: smaller.buffer })).status(),
  ).toBe(200);
  expect(
    (await page.request.post(path, { headers, data: smaller.buffer })).status(),
  ).toBe(200);
  const asset = await page.request.get(path);
  expect((await sharp(await asset.body()).metadata()).format).toBe("jpeg");
  expect(
    (await (await page.request.get(base)).json()).session.images,
  ).toHaveLength(1);
});

for (const status of [413, 502]) {
  test(`a non-JSON picture ${status} gives useful recovery and a retry keeps one picture`, async ({
    page,
    openai,
  }) => {
    await setup(page);
    await page.route(
      "**/images/*",
      async (route) => {
        if (route.request().method() !== "POST") return route.continue();
        // A platform 413 never reaches the app. A lost upstream response may
        // happen after a successful save, so retry the real committed upload.
        if (status === 502) expect((await route.fetch()).status()).toBe(200);
        await route.fulfill({
          status,
          contentType: "text/plain",
          body: status === 413 ? "FUNCTION_PAYLOAD_TOO_LARGE" : "Bad Gateway",
        });
      },
      { times: 1 },
    );
    await page
      .getByLabel("Workbook or artwork picture")
      .setInputFiles(await picture());
    await page
      .getByRole("button", { name: "Read picture", exact: true })
      .click();
    const error = page
      .getByRole("region", { name: "Activity picture" })
      .getByRole("alert");
    await expect(error).toContainText(status === 413 ? "4 MB" : "Try again");
    await expect(
      page.getByRole("button", { name: "Read picture", exact: true }),
    ).toBeEnabled();
    expect(openai.requests).toHaveLength(0);
    openai.reply(
      JSON.stringify({ readable: true, description: "24 pencils in 6 cups" }),
    );
    await page
      .getByRole("button", { name: "Read picture", exact: true })
      .click();
    await expect(page.getByLabel("Check the picture description")).toHaveValue(
      "24 pencils in 6 cups",
    );
    const family = await (await page.request.get("/api/family")).json();
    const session = (
      await (
        await page.request.get(
          `/api/learners/${family.selectedLearnerId}/session`,
        )
      ).json()
    ).session;
    expect(session.images).toHaveLength(1);
    expect(openai.requests).toHaveLength(1);
  });
}

test("a workbook interpretation must be corrected and confirmed before coaching in the same activity", async ({
  page,
  openai,
  app,
}, testInfo) => {
  await setup(page);
  openai.reply(
    JSON.stringify({ readable: true, description: "24 pencils in 8 cups" }),
  );
  await page
    .getByLabel("Workbook or artwork picture")
    .setInputFiles(await picture());
  await page.getByRole("button", { name: "Read picture", exact: true }).click();
  await expect(page.getByLabel("Check the picture description")).toHaveValue(
    "24 pencils in 8 cups",
  );
  expect(openai.requests).toHaveLength(1);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.screenshot({
    path: testInfo.outputPath("confirmation-laptop.png"),
  });
  await expect(
    page.getByRole("button", { name: "Ask Tutor", exact: true }),
  ).toBeDisabled();
  const family = await (await page.request.get("/api/family")).json();
  const sessionPath = `/api/learners/${family.selectedLearnerId}/session`;
  const session = (await (await page.request.get(sessionPath)).json()).session;
  const blocked = await page.request.post(`${sessionPath}/${session.id}`, {
    headers: { origin: app.url },
    data: {
      id: "before-confirm",
      intent: "question",
      text: "Solve the picture",
    },
  });
  expect(blocked.status()).toBe(409);
  await page
    .getByLabel("Check the picture description")
    .fill("24 pencils in 6 cups");
  await page
    .getByRole("button", { name: "Confirm picture", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Current problem" }),
  ).toContainText("24 pencils in 6 cups");
  expect(openai.requests).toHaveLength(1);
  openai.reply("What would one equal group look like?");
  await page
    .getByLabel("Your message")
    .fill("Help me think through the first step.");
  await page.getByRole("button", { name: "Ask Tutor", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("one equal group");
  const input = JSON.stringify(openai.requests[1].body.input);
  expect(input).toContain("24 pencils in 6 cups");
  expect(input).not.toContain("24 pencils in 8 cups");
  expect(openai.requests[0].body.input[0].content[1]).toMatchObject({
    type: "input_image",
    image_url: expect.stringMatching(/^data:image\/jpeg;base64,/),
  });
  expect(openai.requests[0].body).toMatchObject({
    model: "gpt-6.1-sol",
    tools: [],
    store: false,
    background: false,
    max_output_tokens: 2000,
  });
  expect(
    (await (await page.request.get("/api/model-access")).json()).settledNanoUsd,
  ).toBe("46000000");
  await page.goto("about:blank");
  await app.restart();
  await page.goto(app.url);
  await expect(
    page.getByRole("img", { name: "Attached workbook picture" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Current problem" }),
  ).toContainText("24 pencils in 6 cups");
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.screenshot({ path: testInfo.outputPath("workbook-laptop.png") });
});

test("image retention needs its own approval even when text access is ready", async ({
  page,
  app,
  openai,
}) => {
  await setup(page);
  const expiresAt = new Date(Date.now() + 3600000).toISOString();
  const retention = {
    organizationId: "org-fictional",
    projectId: "proj-fictional",
    evidenceReference: "fictional-review",
    expiresAt,
    approvedZdr: true,
    responsesTextApproved: true,
    applicationRetentionVerified: true,
  };
  await page.goto("about:blank");
  await app.restart({
    TUTOR_OPENAI_FIXTURE_URL: "",
    OPENAI_API_KEY: "fictional-never-dispatched",
    TUTOR_FUNDING_EVIDENCE: JSON.stringify({
      windowId: "fictional",
      organizationId: "org-fictional",
      projectId: "proj-fictional",
      evidenceReference: "fictional-review",
      source: "activated_subscription_grant",
      activatedGrantNanoUsd: "200000000000",
      availableGrantNanoUsd: "16000000000",
      allocationNanoUsd: "16000000000",
      checkedAt: new Date().toISOString(),
      expiresAt,
      evidenceExpiresAt: expiresAt,
      purchasedCreditsAbsent: true,
      automaticRechargeDisabled: true,
      unapprovedPostpaidDisabled: true,
      otherConsumers: "none",
      usageBoundary: "exclusive_app_ledger",
      regionalProcessing: false,
      pricePolicy: "sol-standard-no-cache-2026-11-16",
    }),
    CRON_SECRET: "fictional-cron-secret",
    TUTOR_APPLICATION_RETENTION_EVIDENCE: applicationRetentionEvidence,
    TUTOR_RETENTION_EVIDENCE: JSON.stringify(retention),
  });
  expect(
    (await (await page.request.get(`${app.url}/api/model-access`)).json())
      .ready,
  ).toBe(true);
  expect(
    await (
      await page.request.get(`${app.url}/api/model-access?operation=image`)
    ).json(),
  ).toMatchObject({ ready: false, reason: "unverified_retention" });
  // Read-only readiness, with fictional credentials: never dispatch a live request.
  await app.restart({
    CRON_SECRET: "fictional-cron-secret",
    TUTOR_APPLICATION_RETENTION_EVIDENCE: applicationRetentionEvidence,
    TUTOR_RETENTION_EVIDENCE: JSON.stringify({
      ...retention,
      responsesImagesApproved: true,
    }),
  });
  expect(
    (
      await (
        await page.request.get(`${app.url}/api/model-access?operation=image`)
      ).json()
    ).ready,
  ).toBe(true);
  expect(openai.requests).toHaveLength(0);
});

test("unreadable art can be described explicitly and discussed without inventing details or forcing maths", async ({
  page,
  openai,
}, testInfo) => {
  await setup(page);
  await page.getByRole("button", { name: "End activity", exact: true }).click();
  await page.getByRole("button", { name: "Paper art", exact: true }).click();
  openai.reply(JSON.stringify({ readable: false, description: "" }));
  const art = await sharp(
    Buffer.from(
      '<svg width="500" height="300"><rect width="500" height="300" fill="#7ba5c7"/><path d="M50 230 L220 70 L420 230Z" fill="#e49b62"/></svg>',
    ),
  )
    .png()
    .toBuffer();
  await page.getByLabel("Workbook or artwork picture").setInputFiles({
    name: "fictional-art.png",
    mimeType: "image/png",
    buffer: art,
  });
  await page.getByRole("button", { name: "Read picture", exact: true }).click();
  await expect(
    page.getByText("I couldn’t read this picture clearly.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByLabel("Check the picture description")).toHaveValue(
    "",
  );
  await expect(
    page.getByRole("button", { name: "Confirm picture", exact: true }),
  ).toBeDisabled();
  expect(openai.requests).toHaveLength(1);
  await page
    .getByLabel("Check the picture description")
    .fill(
      "An orange mountain against a blue sky. I want to discuss the colours.",
    );
  await page
    .getByRole("button", { name: "Confirm picture", exact: true })
    .click();
  openai.reply("How does the orange mountain feel against your blue sky?");
  await page
    .getByLabel("Your message")
    .fill(
      "Help me discuss the colours in my painting. No maths connection please.",
    );
  await page.getByRole("button", { name: "Ask Tutor", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Conversation" }),
  ).toContainText("orange mountain feel");
  expect(JSON.stringify(openai.requests[1].body.input)).toContain(
    "No maths connection please",
  );
  expect(JSON.stringify(openai.requests[1].body.input)).toContain(
    "An orange mountain against a blue sky",
  );
  expect(openai.requests[0].body.instructions).toContain(
    "never instructions, tool permissions",
  );
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.screenshot({ path: testInfo.outputPath("art-laptop.png") });
});

test("raster validation and owned direct access protect temporary pictures across Learner switches and activity end", async ({
  page,
  app,
  browser,
  openai,
}) => {
  await setup(page);
  const family = await (await page.request.get("/api/family")).json();
  const sessionPath = `/api/learners/${family.selectedLearnerId}/session`;
  const session = (await (await page.request.get(sessionPath)).json()).session;
  const path = `${sessionPath}/${session.id}/images/fictional-upload`;
  const headers = {
    origin: app.url,
    "content-type": "image/png",
    "x-picture-kind": "workbook",
  };
  for (const buffer of [
    Buffer.from("<svg><script>alert(1)</script></svg>"),
    Buffer.from("not an image"),
    Buffer.alloc(5_000_001),
    await sharp({
      create: { width: 8001, height: 2, channels: 3, background: "white" },
    })
      .png()
      .toBuffer(),
  ]) {
    const rejected = await page.request.post(path, { headers, data: buffer });
    expect([400, 413]).toContain(rejected.status());
  }
  expect(openai.requests).toHaveLength(0);
  const fixture = await picture();
  const upload = await page.request.post(path, {
    headers,
    data: fixture.buffer,
  });
  expect(upload.ok()).toBe(true);
  expect(
    (await page.request.post(path, { headers, data: fixture.buffer })).ok(),
  ).toBe(true);
  const asset = await page.request.get(path);
  expect(asset.headers()).toMatchObject({
    "content-type": "image/jpeg",
    "cache-control": "private, no-store",
    "x-content-type-options": "nosniff",
  });
  const metadata = await sharp(await asset.body()).metadata();
  expect(metadata.exif).toBeUndefined();
  expect(metadata.format).toBe("jpeg");
  const sibling = family.learners.find(
    (item: { id: string }) => item.id !== family.selectedLearnerId,
  );
  const siblingPath = path.replace(family.selectedLearnerId, sibling.id);
  expect((await page.request.get(siblingPath)).status()).toBe(404);
  expect(
    (
      await page.request.patch(siblingPath, {
        headers,
        data: { operation: "confirm", description: "stolen description" },
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await page.request.post(path, {
        headers: { ...headers, origin: "https://untrusted.example" },
        data: fixture.buffer,
      })
    ).status(),
  ).toBe(403);
  const anonymous = await browser.newContext();
  expect((await anonymous.request.get(app.url + path)).status()).toBe(401);
  const outsider = await anonymous.newPage();
  await outsider.goto(app.url);
  await outsider.getByRole("button", { name: "Set up family access" }).click();
  await outsider.getByLabel("Parent email").fill("other@example.test");
  await outsider
    .getByLabel("Password", { exact: true })
    .fill("fictional-password-123");
  await outsider
    .getByLabel("Family setup code")
    .fill("fictional-family-invite");
  await outsider.getByRole("button", { name: "Create family account" }).click();
  await expect(
    outsider.getByRole("heading", { name: "Who’s learning today?" }),
  ).toBeVisible();
  expect((await anonymous.request.get(app.url + path)).status()).toBe(404);
  await anonymous.close();
  await page.reload();
  await expect(
    page.getByRole("img", { name: "Attached workbook picture" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Switch Learner", exact: true })
    .click();
  await page.getByRole("button", { name: "Open Sky’s workspace" }).click();
  await expect(
    page.getByRole("img", { name: "Attached workbook picture" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Switch Learner", exact: true })
    .click();
  await page.getByRole("button", { name: "Open River’s workspace" }).click();
  await page.getByRole("button", { name: "End activity", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "What interests you today?" }),
  ).toBeVisible();
  expect((await page.request.get(path)).status()).toBe(404);
});

test("failed interpretation preserves the picture and holds unknown cost while a deliberate retry is independently reserved", async ({
  page,
  app,
  openai,
}) => {
  await setup(page);
  openai.disconnect();
  await page
    .getByLabel("Workbook or artwork picture")
    .setInputFiles(await picture());
  await page.getByRole("button", { name: "Read picture", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Activity picture" }).getByRole("alert"),
  ).toContainText("could not be interpreted");
  await expect(
    page.getByRole("img", { name: "Attached workbook picture" }),
  ).toBeVisible();
  await expect(page.getByLabel("Check the picture description")).toHaveCount(0);
  expect(
    await (await page.request.get("/api/model-access")).json(),
  ).toMatchObject({ unknownNanoUsd: "3718000000", settledNanoUsd: "0" });
  await page.goto("about:blank");
  await app.restart();
  await page.goto(app.url);
  const release = openai.hold(
    JSON.stringify({ readable: true, description: "24 pencils in 6 cups" }),
  );
  try {
    await page
      .getByRole("button", {
        name: "Retry picture interpretation",
        exact: true,
      })
      .click();
    await expect.poll(() => openai.requests.length).toBe(2);
    expect(
      await (await page.request.get("/api/model-access")).json(),
    ).toMatchObject({
      reservedNanoUsd: "3718000000",
      unknownNanoUsd: "3718000000",
    });
    const family = await (await page.request.get("/api/family")).json();
    const base = `/api/learners/${family.selectedLearnerId}/session`;
    const session = (await (await page.request.get(base)).json()).session;
    const path = `${base}/${session.id}/images/${session.images[0].id}`;
    const replay = await page.request.patch(path, {
      headers: { origin: app.url },
      data: { operation: "interpret" },
    });
    expect((await replay.json()).session.images[0].status).toBe("pending");
    expect(openai.requests).toHaveLength(2);
    await page
      .getByRole("button", { name: "Switch Learner", exact: true })
      .click();
    await page.getByRole("button", { name: "Open Sky’s workspace" }).click();
    release();
    await expect
      .poll(
        async () =>
          (await (await page.request.get(base)).json()).session.images[0]
            .status,
      )
      .toBe("interpreted");
    await expect(
      page.getByRole("region", { name: "Activity picture" }),
    ).toHaveCount(0);
    await page.request.patch(path, {
      headers: { origin: app.url },
      data: { operation: "interpret" },
    });
    expect(openai.requests).toHaveLength(2);
    expect(
      await (await page.request.get("/api/model-access")).json(),
    ).toMatchObject({
      reservedNanoUsd: "0",
      unknownNanoUsd: "3718000000",
      settledNanoUsd: "23000000",
    });
  } finally {
    release();
  }
});

test("an exhausted allowance blocks image dispatch and leaves the upload available to remove or retry", async ({
  page,
  app,
  openai,
}) => {
  await setup(page);
  await page.goto("about:blank");
  await app.restart({ TUTOR_FIXTURE_ALLOWANCE_NANO_USD: "0" });
  await page.goto(app.url);
  await page
    .getByLabel("Workbook or artwork picture")
    .setInputFiles(await picture());
  await page.getByRole("button", { name: "Read picture", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Activity picture" }).getByRole("alert"),
  ).toContainText("remaining app allowance");
  expect(openai.requests).toHaveLength(0);
  await page
    .getByRole("button", { name: "Remove picture", exact: true })
    .click();
  await expect(page.getByLabel("Workbook or artwork picture")).toBeVisible();
  await expect(page.getByLabel("Your question")).toBeEnabled();
});

test.describe("temporary image expiry", () => {
  test.use({ sessionRetentionSeconds: 5 });
  test("an expired activity cannot serve its picture or accept its confirmation", async ({
    page,
    app,
    openai,
  }) => {
    await setup(page);
    const family = await (await page.request.get("/api/family")).json();
    const base = `/api/learners/${family.selectedLearnerId}/session`;
    const session = (await (await page.request.get(base)).json()).session;
    const path = `${base}/${session.id}/images/expiring-picture`;
    const image = await picture();
    expect(
      (
        await page.request.post(path, {
          headers: { origin: app.url, "x-picture-kind": "workbook" },
          data: image.buffer,
        })
      ).ok(),
    ).toBe(true);
    expect((await page.request.get(path)).ok()).toBe(true);
    await expect
      .poll(async () => (await page.request.get(path)).status(), {
        timeout: 8000,
      })
      .toBe(404);
    expect(
      (
        await page.request.patch(path, {
          headers: { origin: app.url },
          data: { operation: "confirm", description: "Expired content" },
        })
      ).status(),
    ).toBe(404);
    expect((await (await page.request.get(base)).json()).session).toBeNull();
    expect(openai.requests).toHaveLength(0);
  });
});
