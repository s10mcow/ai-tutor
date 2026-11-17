import { test, expect } from "./fixture";

const funding = () => ({
  windowId: "synthetic-pilot",
  organizationId: "org-fictional",
  projectId: "proj-fictional",
  source: "activated_subscription_grant",
  evidenceReference: "fictional-account-review",
  activatedGrantNanoUsd: "200000000000",
  availableGrantNanoUsd: "16000000000",
  allocationNanoUsd: "16000000000",
  checkedAt: new Date(Date.now() - 60000).toISOString(),
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
  evidenceExpiresAt: new Date(Date.now() + 86400000).toISOString(),
  purchasedCreditsAbsent: true,
  automaticRechargeDisabled: true,
  unapprovedPostpaidDisabled: true,
  otherConsumers: "none",
  usageBoundary: "exclusive_app_ledger",
  regionalProcessing: false,
  pricePolicy: "sol-standard-no-cache-2026-11-16",
});
const retention = () => ({
  organizationId: "org-fictional",
  projectId: "proj-fictional",
  evidenceReference: "fictional-retention-review",
  approvedZdr: true,
  responsesTextApproved: true,
  responsesImagesApproved: true,
  transcriptionsApproved: true,
  responsesSearchApproved: true,
  applicationRetentionVerified: true,
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
});
const applicationRetention = {
  evidenceReference: "fictional-hosted-review",
  hourlyCleanupVerified: true,
  telemetryControlsVerified: true,
  recoveryHistorySeconds: 86400,
  recoveryRetentionDisclosed: true,
  restoreProcedureDocumented: true,
};
test.use({
  controlledTutorEnabled: false,
  modelEnvironment: { OPENAI_API_KEY: "fictional-not-a-live-key" },
});

test("parent readiness includes every operation and cleanup; established family access pauses without becoming fictional", async ({
  page,
  app,
  openai,
}, testInfo) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/");
  await page.getByRole("button", { name: "Set up family access" }).click();
  await page.getByLabel("Parent email").fill("parent@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Fictional-parent-password-42");
  await page.getByLabel("Family setup code").fill("fictional-family-invite");
  await page.getByRole("button", { name: "Create family account" }).click();
  await expect(page.getByLabel("Learner name")).toBeVisible();
  const restart = async (settings: Record<string, string>) => {
    await page.goto("about:blank");
    await app.restart(settings);
  };
  const account = funding();
  await restart({
    TUTOR_FUNDING_EVIDENCE: JSON.stringify(account),
    TUTOR_RETENTION_EVIDENCE: JSON.stringify(retention()),
  });
  const status = async () =>
    (await page.request.get("/api/model-access")).json();
  expect(await status()).toMatchObject({
    ready: false,
    reason: "unverified_application_retention",
    familyState: "setup",
  });
  await restart({
    TUTOR_APPLICATION_RETENTION_EVIDENCE: JSON.stringify(applicationRetention),
    TUTOR_RETENTION_EVIDENCE: JSON.stringify({
      ...retention(),
      responsesSearchApproved: false,
    }),
  });
  expect(await status()).toMatchObject({
    ready: false,
    reason: "unverified_application_retention",
  });
  await restart({ CRON_SECRET: "fictional-cron-secret" });
  expect(await status()).toMatchObject({
    ready: true,
    familyState: "setup",
    operations: {
      text: { ready: true },
      image: { ready: true },
      transcription: { ready: true },
      research: { ready: false, reason: "unverified_retention" },
    },
  });
  await page.goto(app.url);
  await page.getByRole("button", { name: "Model access" }).click();
  const panel = page.getByRole("region", { name: "Model access" });
  await expect(panel).toContainText("Family setup incomplete");
  await expect(panel).toContainText("Public-source checks");
  await page.screenshot({
    path: testInfo.outputPath("readiness-setup-laptop.png"),
  });
  await restart({ TUTOR_RETENTION_EVIDENCE: JSON.stringify(retention()) });
  expect(await status()).toMatchObject({
    familyState: "live",
    familyLiveReady: true,
  });
  // Remove the allocation without dispatching the fictional credential.
  await restart({
    TUTOR_FUNDING_EVIDENCE: JSON.stringify({
      ...account,
      allocationNanoUsd: "0",
    }),
  });
  expect(await status()).toMatchObject({
    familyState: "paused",
    familyLiveReady: false,
    reason: "allowance_exhausted",
  });
  await page.goto(app.url);
  await expect(page.locator(".preview-label")).toHaveText("Family AI paused");
  await expect(
    page.getByText("Add a fictional Learner name for this preview."),
  ).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath("readiness-paused-laptop.png"),
  });
  await restart({ OPENAI_API_KEY: "" });
  expect(await status()).toMatchObject({
    familyState: "paused",
    reason: "missing_credentials",
  });
  expect(openai.requests).toHaveLength(0);
});
