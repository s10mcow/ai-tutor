import type { Page } from "@playwright/test";
import { test, expect } from "./fixture";

async function setup(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Set up family access" }).click();
  await page.getByLabel("Parent email").fill("parent@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Fictional-parent-password-42");
  await page.getByLabel("Family setup code").fill("fictional-family-invite");
  await page.getByRole("button", { name: "Create family account" }).click();
  await expect(page.getByLabel("Learner name")).toBeVisible();
}

test("model readiness is read-only, private, and closed without credentials", async ({
  page,
  browser,
  app,
  tutor,
}) => {
  await setup(page);
  await page.getByRole("button", { name: "Model access" }).click();
  await expect(
    page.getByRole("region", { name: "Model access" }),
  ).toContainText("Missing server credentials");
  await expect(
    page.getByRole("region", { name: "Model access" }),
  ).toContainText("Live family access is closed");
  expect(
    (
      await page.request.post("/api/model-access", {
        data: { ready: true, allowance: 200 },
        headers: { origin: app.url },
      })
    ).status(),
  ).toBe(405);
  const guest = await browser.newContext({ baseURL: app.url });
  expect((await guest.request.get("/api/model-access")).status()).toBe(401);
  await guest.close();
  expect(tutor.requests).toHaveLength(0);
});

async function learner(page: Page, name = "River") {
  await page.getByLabel("Learner name").fill(name);
  await page.getByRole("button", { name: "Add Learner" }).click();
  await page.getByRole("button", { name: `Open ${name}’s workspace` }).click();
  await page.getByRole("button", { name: "Start an activity" }).click();
}
const fixtureEnvironment = {
  TUTOR_OPENAI_FIXTURE_URL: "fixture",
  TUTOR_FIXTURE_ALLOWANCE_NANO_USD: "8000000000",
};
test.describe("metered direct Sol", () => {
  test.use({
    controlledTutorEnabled: false,
    modelEnvironment: fixtureEnvironment,
  });
  test("chosen activity purpose and declined maths stay in the direct metered context", async ({
    page,
    openai,
  }) => {
    await setup(page);
    await learner(page);
    await page
      .getByRole("button", { name: "End activity", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Biking exploration", exact: true })
      .click();
    openai.reply("What changes when the trail gets rocky?");
    await page
      .getByLabel("Your question")
      .fill("Why does riding over rocks feel different?");
    await page.getByRole("button", { name: "Ask Tutor", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Conversation" }),
    ).toContainText("trail gets rocky");
    expect(JSON.stringify(openai.requests[0].body.input)).toContain(
      "Explore what makes a bike ride feel different",
    );
    expect(openai.requests[0].body.instructions).not.toContain(
      "Why does riding over rocks",
    );
    openai.reply("We can stay with how biking feels.");
    await page
      .getByRole("button", { name: "Keep this about biking", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "Conversation" }),
    ).toContainText("stay with how biking feels");
    expect(JSON.stringify(openai.requests[1].body.input)).toContain(
      "I do not want a maths connection",
    );
    expect(openai.requests[1].body.instructions).toContain(
      "Respect a declined connection",
    );
    expect(
      (await (await page.request.get("/api/model-access")).json())
        .settledNanoUsd,
    ).toBe("46000000");
  });
  test("a direct Sol reply settles measured usage including hidden reasoning and replays safely", async ({
    page,
    app,
    openai,
  }, testInfo) => {
    openai.reply("Try drawing six cups.");
    await setup(page);
    await learner(page);
    await page
      .getByLabel("Your question")
      .fill("How can I share 24 pencils among six cups?");
    await page.getByRole("button", { name: "Ask Tutor", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Conversation" }),
    ).toContainText("Try drawing six cups.");
    const access = await (await page.request.get("/api/model-access")).json();
    expect(access).toMatchObject({
      mode: "fixture",
      ready: true,
      liveReady: false,
      settledNanoUsd: "23000000",
      reservedNanoUsd: "0",
      unknownNanoUsd: "0",
      remainingNanoUsd: "7977000000",
    });
    expect(openai.requests).toHaveLength(1);
    expect(openai.requests[0].path).toBe("/v1/responses");
    expect(openai.requests[0].body).toMatchObject({
      model: "gpt-6.1-sol",
      store: false,
      background: false,
      service_tier: "default",
      max_output_tokens: 2000,
      tools: [],
      prompt_cache_options: { mode: "explicit" },
    });
    expect(openai.requests[0].body).not.toHaveProperty("conversation");
    expect(openai.requests[0].body).not.toHaveProperty("previous_response_id");
    const family = await (await page.request.get("/api/family")).json();
    const endpoint = `/api/learners/${family.selectedLearnerId}/session`;
    const session = (await (await page.request.get(endpoint)).json()).session;
    const action = session.actions[0];
    await app.restart();
    const replay = await page.request.post(`${endpoint}/${session.id}`, {
      data: { id: action.id, text: action.text, intent: action.intent },
      headers: { origin: app.url },
    });
    expect((await replay.json()).session.actions[0].reply).toBe(
      "Try drawing six cups.",
    );
    expect(openai.requests).toHaveLength(1);
    await page.reload();
    await page.setViewportSize({ width: 1366, height: 768 });
    await expect(
      page.getByRole("region", { name: "Conversation" }),
    ).toContainText("Try drawing six cups.");
    await page.getByRole("button", { name: "Model access" }).click();
    await expect(
      page.getByRole("region", { name: "Model access" }),
    ).toContainText("$0.0230");
    await page.screenshot({
      path: testInfo.outputPath("model-access-laptop.png"),
    });
  });
});

test.describe("one remaining reservation", () => {
  test.use({
    controlledTutorEnabled: false,
    modelEnvironment: {
      ...fixtureEnvironment,
      TUTOR_FIXTURE_ALLOWANCE_NANO_USD: "3718000000",
    },
  });
  test("concurrent Learners share one allowance and pending replays cannot dispatch twice", async ({
    page,
    app,
    openai,
  }) => {
    await setup(page);
    await learner(page);
    const family = await (await page.request.get("/api/family")).json();
    const firstPath = `/api/learners/${family.selectedLearnerId}/session`;
    const first = (await (await page.request.get(firstPath)).json()).session;
    await page.getByRole("button", { name: "Switch Learner" }).click();
    await learner(page, "Sky");
    const secondFamily = await (await page.request.get("/api/family")).json();
    const secondPath = `/api/learners/${secondFamily.selectedLearnerId}/session`;
    const second = (await (await page.request.get(secondPath)).json()).session;
    const release = openai.hold("Only one reserved request can run.");
    try {
      const payload = {
        id: "one",
        intent: "question",
        text: "How can I share six counters?",
      };
      const pending = page.request.post(`${firstPath}/${first.id}`, {
        headers: { origin: app.url },
        data: payload,
      });
      await expect.poll(() => openai.requests.length).toBe(1);
      const status = await (await page.request.get("/api/model-access")).json();
      expect(status).toMatchObject({
        reason: "allowance_exhausted",
        reservedNanoUsd: "3718000000",
        remainingNanoUsd: "0",
      });
      const duplicate = await page.request.post(`${firstPath}/${first.id}`, {
        headers: { origin: app.url },
        data: payload,
      });
      expect((await duplicate.json()).session.actions[0].status).toBe(
        "pending",
      );
      const blocked = await page.request.post(`${secondPath}/${second.id}`, {
        headers: { origin: app.url },
        data: payload,
      });
      expect((await blocked.json()).session.actions[0]).toMatchObject({
        status: "failed",
        text: payload.text,
      });
      expect(openai.requests).toHaveLength(1);
      release();
      await pending;
      await page.reload();
      await expect(page.getByLabel("Your message")).toHaveValue(payload.text);
      expect(
        (await (await page.request.get("/api/model-access")).json())
          .remainingNanoUsd,
      ).toBe("3695000000");
    } finally {
      release();
    }
  });
});

test.describe("interrupted provider outcomes", () => {
  test.use({
    controlledTutorEnabled: false,
    modelEnvironment: fixtureEnvironment,
  });
  test("unknown usage stays held through restart and explicit retry reserves a separate attempt", async ({
    page,
    app,
    openai,
  }) => {
    openai.disconnect();
    await setup(page);
    await learner(page);
    await page
      .getByLabel("Your question")
      .fill("How could I check six groups of four?");
    await page.getByRole("button", { name: "Ask Tutor", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Conversation" }).getByRole("alert"),
    ).toContainText("couldn’t reply");
    const unknown = await (await page.request.get("/api/model-access")).json();
    expect(unknown).toMatchObject({
      settledNanoUsd: "0",
      unknownNanoUsd: "3718000000",
      remainingNanoUsd: "4282000000",
    });
    expect(openai.requests).toHaveLength(1);
    await app.restart();
    await page.reload();
    await expect(
      page.getByRole("region", { name: "Conversation" }),
    ).toContainText("A retry may use more allowance");
    openai.reply("Use multiplication to check your groups.");
    await page
      .getByRole("button", { name: "Retry reply", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "Conversation" }),
    ).toContainText("Use multiplication");
    expect(openai.requests).toHaveLength(2);
    expect(
      await (await page.request.get("/api/model-access")).json(),
    ).toMatchObject({
      settledNanoUsd: "23000000",
      unknownNanoUsd: "3718000000",
      remainingNanoUsd: "4259000000",
    });
    await page
      .getByRole("button", { name: "End activity", exact: true })
      .click();
    expect(
      (await (await page.request.get("/api/model-access")).json())
        .unknownNanoUsd,
    ).toBe("3718000000");
    await app.restart({ TUTOR_FIXTURE_ALLOWANCE_NANO_USD: "10000000000" });
    expect(
      await (await page.request.get("/api/model-access")).json(),
    ).toMatchObject({
      ready: false,
      reason: "funding_changed",
      settledNanoUsd: "23000000",
      unknownNanoUsd: "3718000000",
    });
    await app.restart({ TUTOR_FIXTURE_ALLOWANCE_NANO_USD: "8000000000" });
    expect(
      await (await page.request.get("/api/model-access")).json(),
    ).toMatchObject({
      ready: true,
      settledNanoUsd: "23000000",
      unknownNanoUsd: "3718000000",
      remainingNanoUsd: "4259000000",
    });
  });
});

function fundingEvidence() {
  return {
    windowId: "fictional-grant-2026-11",
    organizationId: "org-fictional",
    projectId: "proj-fictional",
    source: "activated_subscription_grant",
    evidenceReference: "fictional-account-review",
    activatedGrantNanoUsd: "200000000000",
    availableGrantNanoUsd: "10000000000",
    allocationNanoUsd: "8000000000",
    checkedAt: new Date(Date.now() - 16 * 60000).toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    evidenceExpiresAt: new Date(Date.now() + 43200000).toISOString(),
    purchasedCreditsAbsent: true,
    automaticRechargeDisabled: true,
    unapprovedPostpaidDisabled: true,
    otherConsumers: "none",
    usageBoundary: "exclusive_app_ledger",
    regionalProcessing: false,
    pricePolicy: "sol-standard-no-cache-2026-11-16",
  };
}
function retentionEvidence() {
  return {
    organizationId: "org-fictional",
    projectId: "proj-fictional",
    evidenceReference: "fictional-retention-review",
    approvedZdr: true,
    responsesTextApproved: true,
    applicationRetentionVerified: true,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  };
}

test.describe("operator evidence", () => {
  test.use({
    controlledTutorEnabled: false,
    modelEnvironment: { OPENAI_API_KEY: "fictional-not-a-live-key" },
  });
  test("independent access stays available after fifteen minutes within recorded evidence expiry", async ({
    page,
    app,
    openai,
  }) => {
    await setup(page);
    const funding = fundingEvidence();
    await app.restart({
      TUTOR_FUNDING_EVIDENCE: JSON.stringify(funding),
      TUTOR_RETENTION_EVIDENCE: JSON.stringify(retentionEvidence()),
    });
    await page.reload();
    await page.getByRole("button", { name: "Model access" }).click();
    await expect(
      page.getByRole("region", { name: "Model access" }),
    ).toContainText("Live family access is available");
    expect(
      await (await page.request.get("/api/model-access")).json(),
    ).toMatchObject({
      ready: true,
      reason: "available",
      checkedAt: funding.checkedAt,
      evidenceExpiresAt: funding.evidenceExpiresAt,
    });
    // Readiness exercises the same server policy as dispatch; synthetic credentials
    // are never used for a provider request in this operator-evidence scenario.
    expect(openai.requests).toHaveLength(0);
  });
  test("uncoordinated free-grant consumers cannot satisfy strict live funding", async ({
    page,
    app,
    openai,
  }) => {
    await setup(page);
    await app.restart({
      TUTOR_FUNDING_EVIDENCE: JSON.stringify({
        ...fundingEvidence(),
        otherConsumers: "free-grant-only",
      }),
      TUTOR_RETENTION_EVIDENCE: JSON.stringify(retentionEvidence()),
    });
    expect(
      await (await page.request.get("/api/model-access")).json(),
    ).toMatchObject({ ready: false, reason: "unverified_funding" });
    await app.restart({
      TUTOR_FUNDING_EVIDENCE: JSON.stringify({
        ...fundingEvidence(),
        otherConsumers: "none",
        usageBoundary: "uncoordinated",
      }),
    });
    expect(
      await (await page.request.get("/api/model-access")).json(),
    ).toMatchObject({ ready: false, reason: "unverified_funding" });
    expect(openai.requests).toHaveLength(0);
  });
  test("actual grant, funding-evidence and retention expiry each close live readiness", async ({
    page,
    app,
    openai,
  }) => {
    await setup(page);
    const funding = fundingEvidence();
    const retention = retentionEvidence();
    const expired = new Date(Date.now() - 1000).toISOString();
    await app.restart({
      TUTOR_FUNDING_EVIDENCE: JSON.stringify({
        ...funding,
        expiresAt: expired,
      }),
      TUTOR_RETENTION_EVIDENCE: JSON.stringify(retention),
    });
    expect(
      await (await page.request.get("/api/model-access")).json(),
    ).toMatchObject({ ready: false, reason: "expired_funding" });
    await app.restart({
      TUTOR_FUNDING_EVIDENCE: JSON.stringify({
        ...funding,
        evidenceExpiresAt: expired,
      }),
    });
    expect(
      await (await page.request.get("/api/model-access")).json(),
    ).toMatchObject({ ready: false, reason: "expired_funding_evidence" });
    await app.restart({
      TUTOR_FUNDING_EVIDENCE: JSON.stringify(funding),
      TUTOR_RETENTION_EVIDENCE: JSON.stringify({
        ...retention,
        expiresAt: expired,
      }),
    });
    expect(
      await (await page.request.get("/api/model-access")).json(),
    ).toMatchObject({ ready: false, reason: "expired_retention" });
    expect(openai.requests).toHaveLength(0);
  });
  test("funding validity, strict subscription-only funding, and retention are separate live gates", async ({
    page,
    app,
    openai,
  }) => {
    test.setTimeout(90000);
    await setup(page);
    const status = async () =>
      (await page.request.get("/api/model-access")).json();
    expect(await status()).toMatchObject({
      reason: "unverified_funding",
      liveReady: false,
    });
    const evidence = fundingEvidence();
    await app.restart({ TUTOR_FUNDING_EVIDENCE: JSON.stringify(evidence) });
    expect(await status()).toMatchObject({
      reason: "unverified_retention",
      liveReady: false,
    });
    await app.restart({
      TUTOR_FUNDING_EVIDENCE: JSON.stringify({
        ...evidence,
        purchasedCreditsAbsent: false,
      }),
    });
    expect(await status()).toMatchObject({
      reason: "unverified_funding",
      liveReady: false,
    });
    await app.restart({
      TUTOR_FUNDING_EVIDENCE: JSON.stringify({
        ...evidence,
        checkedAt: new Date(Date.now() + 60000).toISOString(),
      }),
    });
    expect(await status()).toMatchObject({
      reason: "unverified_funding",
      liveReady: false,
    });
    await app.restart({
      TUTOR_FUNDING_EVIDENCE: JSON.stringify({
        ...evidence,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      }),
    });
    expect(await status()).toMatchObject({
      reason: "expired_funding",
      liveReady: false,
    });
    await app.restart({
      TUTOR_FUNDING_EVIDENCE: JSON.stringify({
        ...evidence,
        allocationNanoUsd: "0",
      }),
    });
    expect(await status()).toMatchObject({
      reason: "allowance_exhausted",
      liveReady: false,
    });
    expect(openai.requests).toHaveLength(0);
  });
});

test.describe("provider billing and usage evidence", () => {
  test.use({
    controlledTutorEnabled: false,
    modelEnvironment: fixtureEnvironment,
  });
  test("provider account rejection closes further dispatch while preserving the activity", async ({
    page,
    app,
    openai,
  }) => {
    openai.fail(429, "credit_balance_exhausted");
    await setup(page);
    await learner(page);
    await page.getByLabel("Your question").fill("How do I check my drawing?");
    await page.getByRole("button", { name: "Ask Tutor", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Conversation" }).getByRole("alert"),
    ).toContainText("couldn’t reply");
    expect(
      await (await page.request.get("/api/model-access")).json(),
    ).toMatchObject({
      ready: false,
      reason: "credit_balance_exhausted",
      unknownNanoUsd: "3718000000",
    });
    await app.restart();
    await page.reload();
    await page
      .getByRole("button", { name: "Retry reply", exact: true })
      .click();
    await expect(page.getByLabel("Your message")).toHaveValue(
      "How do I check my drawing?",
    );
    expect(openai.requests).toHaveLength(1);
  });
  test("an incomplete billed answer settles usage without presenting it as a complete reply", async ({
    page,
    openai,
  }) => {
    openai.incomplete();
    await setup(page);
    await learner(page);
    await page
      .getByLabel("Your question")
      .fill("How can I compare two explanations?");
    await page.getByRole("button", { name: "Ask Tutor", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Conversation" }).getByRole("alert"),
    ).toContainText("couldn’t reply");
    await expect(
      page.getByRole("region", { name: "Conversation" }),
    ).not.toContainText("An unfinished thought");
    expect(
      await (await page.request.get("/api/model-access")).json(),
    ).toMatchObject({
      settledNanoUsd: "23000000",
      unknownNanoUsd: "0",
      remainingNanoUsd: "7977000000",
    });
    expect(openai.requests).toHaveLength(1);
  });
  test("unverifiable usage never becomes a fabricated zero-cost success", async ({
    page,
    openai,
  }) => {
    openai.reply("You can compare the sides.", {
      input_tokens: 10000,
      output_tokens: 300,
    });
    await setup(page);
    await learner(page);
    await page
      .getByLabel("Your question")
      .fill("How do I compare these shapes?");
    await page.getByRole("button", { name: "Ask Tutor", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Conversation" }),
    ).toContainText("You can compare the sides.");
    expect(
      await (await page.request.get("/api/model-access")).json(),
    ).toMatchObject({
      settledNanoUsd: "0",
      unknownNanoUsd: "3718000000",
      remainingNanoUsd: "4282000000",
    });
    expect(openai.requests).toHaveLength(1);
  });
});
