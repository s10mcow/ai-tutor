import { createHash } from "node:crypto";
import { database } from "./database.ts";
import type { ModelAccess } from "./model-access-contract.ts";

// Full accepted Sol input maximum at long-context rates, plus 2,000 output tokens.
// No count endpoint preflight, cache, tools, regional routing, or automatic retries.
export const textReservationNanoUsd = 3_718_000_000n;
export type ProviderConfiguration = {
  mode: "live" | "fixture" | "scripted";
  reason: string;
  message: string;
  endpoint: string;
  key: string;
  windowId: string;
  identity: string;
  allocation: bigint;
  checkedAt: string | null;
  expiresAt: string | null;
  evidenceExpiresAt: string | null;
  retentionExpiresAt: string | null;
  organizationId?: string;
  projectId?: string;
};
function evidence(value: string | undefined): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value ?? "");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}
export function providerConfiguration(): ProviderConfiguration {
  const base: ProviderConfiguration = {
    mode:
      process.env.TUTOR_PREVIEW_URL && process.env.NODE_ENV !== "production"
        ? "scripted"
        : "live",
    reason: "missing_credentials",
    message:
      "Missing server credentials. A Pro plan alone does not activate API access.",
    endpoint: "https://api.openai.com/v1/responses",
    key: "",
    windowId: "",
    identity: "",
    allocation: 0n,
    checkedAt: null,
    expiresAt: null,
    evidenceExpiresAt: null,
    retentionExpiresAt: null,
  };
  const fixture = process.env.TUTOR_OPENAI_FIXTURE_URL;
  if (fixture && process.env.NODE_ENV !== "production") {
    let url: URL;
    try {
      url = new URL(fixture);
    } catch {
      return base;
    }
    if (
      url.protocol !== "http:" ||
      url.hostname !== "127.0.0.1" ||
      url.username ||
      url.password
    )
      return base;
    const allocation = process.env.TUTOR_FIXTURE_ALLOWANCE_NANO_USD ?? "";
    if (!/^\d{1,15}$/.test(allocation)) return base;
    return {
      ...base,
      mode: "fixture",
      reason: "available",
      message:
        "Controlled Sol fixture is available for fictional practice. Live account approval remains unverified.",
      endpoint: url.href,
      key: "fictional-fixture-key",
      allocation: BigInt(allocation),
      windowId: "fixture-window",
      identity: `fixture:${allocation}`,
    };
  }
  if (base.mode === "scripted" || !process.env.OPENAI_API_KEY) return base;
  const closed = {
    ...base,
    mode: "live" as const,
    reason: "unverified_funding",
    message:
      "Subscription funding and exclusive organization use through the app allowance have not been verified. Live access remains closed.",
  };
  const funding = evidence(process.env.TUTOR_FUNDING_EVIDENCE);
  const money = (value: unknown): value is string =>
    typeof value === "string" && /^\d{1,15}$/.test(value);
  const id = (value: unknown): value is string =>
    typeof value === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
  if (
    !id(funding.windowId) ||
    !id(funding.organizationId) ||
    !id(funding.projectId) ||
    !id(funding.evidenceReference) ||
    funding.source !== "activated_subscription_grant" ||
    !money(funding.activatedGrantNanoUsd) ||
    !money(funding.availableGrantNanoUsd) ||
    !money(funding.allocationNanoUsd) ||
    funding.purchasedCreditsAbsent !== true ||
    funding.automaticRechargeDisabled !== true ||
    funding.unapprovedPostpaidDisabled !== true ||
    funding.otherConsumers !== "none" ||
    funding.usageBoundary !== "exclusive_app_ledger" ||
    funding.regionalProcessing !== false ||
    funding.pricePolicy !== "sol-standard-no-cache-2026-11-16" ||
    BigInt(funding.availableGrantNanoUsd) >
      BigInt(funding.activatedGrantNanoUsd) ||
    BigInt(funding.allocationNanoUsd) > BigInt(funding.availableGrantNanoUsd)
  )
    return closed;
  const checkedAt =
    typeof funding.checkedAt === "string" ? Date.parse(funding.checkedAt) : NaN;
  const expiresAt =
    typeof funding.expiresAt === "string" ? Date.parse(funding.expiresAt) : NaN;
  const evidenceExpiresAt =
    typeof funding.evidenceExpiresAt === "string"
      ? Date.parse(funding.evidenceExpiresAt)
      : NaN;
  const now = Date.now();
  if (
    !Number.isFinite(checkedAt) ||
    !Number.isFinite(expiresAt) ||
    !Number.isFinite(evidenceExpiresAt) ||
    checkedAt > now
  )
    return closed;
  const verified = {
    ...closed,
    windowId: `live:${funding.organizationId}:${funding.projectId}:${funding.windowId}`,
    allocation: BigInt(funding.allocationNanoUsd),
    checkedAt: new Date(checkedAt).toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
    evidenceExpiresAt: new Date(evidenceExpiresAt).toISOString(),
  };
  if (expiresAt <= now)
    return {
      ...verified,
      reason: "expired_funding",
      message:
        "The verified subscription credit window has expired. Saved work remains available.",
    };
  if (evidenceExpiresAt <= now)
    return {
      ...verified,
      reason: "expired_funding_evidence",
      message:
        "The recorded account funding evidence has expired. Parent verification is needed before more requests.",
    };
  if (verified.allocation === 0n)
    return {
      ...verified,
      reason: "allowance_exhausted",
      message: "No app allowance is allocated. Saved work remains available.",
    };
  const retention = evidence(process.env.TUTOR_RETENTION_EVIDENCE);
  if (
    retention.organizationId !== funding.organizationId ||
    retention.projectId !== funding.projectId ||
    retention.approvedZdr !== true ||
    retention.responsesTextApproved !== true ||
    retention.applicationRetentionVerified !== true ||
    !id(retention.evidenceReference) ||
    typeof retention.expiresAt !== "string" ||
    !Number.isFinite(Date.parse(retention.expiresAt))
  ) {
    return {
      ...verified,
      reason: "unverified_retention",
      message:
        "Live family retention approval is unverified for this project and text endpoint. store:false alone is not approval.",
    };
  }
  const retentionExpiresAt = new Date(
    Date.parse(retention.expiresAt),
  ).toISOString();
  if (Date.parse(retentionExpiresAt) <= now)
    return {
      ...verified,
      retentionExpiresAt,
      reason: "expired_retention",
      message:
        "The recorded retention approval has expired. Live family access is closed pending verification.",
    };
  return {
    ...verified,
    retentionExpiresAt,
    reason: "available",
    message:
      "Direct GPT-6.1 Sol is available within the verified subscription grant and app allowance. The linked organization is reserved for this app’s metered usage.",
    key: process.env.OPENAI_API_KEY,
    organizationId: funding.organizationId,
    projectId: funding.projectId,
    windowId: `live:${funding.organizationId}:${funding.projectId}:${funding.windowId}`,
    identity: createHash("sha256")
      .update(
        JSON.stringify([
          funding.organizationId,
          funding.projectId,
          funding.windowId,
          funding.allocationNanoUsd,
          funding.activatedGrantNanoUsd,
          funding.expiresAt,
          funding.pricePolicy,
        ]),
      )
      .digest("hex"),
  };
}
export async function allowanceTotals(windowId: string) {
  const totals = (
    await database.query<{
      settled: string;
      reserved: string;
      unknown: string;
    }>(
      `SELECT COALESCE(sum(measured_nano_usd) FILTER (WHERE status = 'settled'),0)::text AS settled,
     COALESCE(sum(reserved_nano_usd) FILTER (WHERE status = 'pending' AND started_at > now() - interval '30 seconds'),0)::text AS reserved,
     COALESCE(sum(reserved_nano_usd) FILTER (WHERE status = 'usage_unknown' OR (status = 'pending' AND started_at <= now() - interval '30 seconds')),0)::text AS unknown
     FROM model_operation WHERE allowance_id = $1`,
      [windowId],
    )
  ).rows[0];
  return {
    settled: BigInt(totals.settled),
    reserved: BigInt(totals.reserved),
    unknown: BigInt(totals.unknown),
  };
}
export async function modelAccess(): Promise<ModelAccess> {
  const config = providerConfiguration();
  const totals = await allowanceTotals(config.windowId);
  const window = (
    await database.query("SELECT * FROM model_allowance WHERE id = $1", [
      config.windowId,
    ])
  ).rows[0];
  let reason = config.reason,
    message = config.message;
  const remaining =
    config.allocation - totals.settled - totals.reserved - totals.unknown;
  if (
    reason === "available" &&
    window?.policy_identity !== undefined &&
    window.policy_identity !== config.identity
  ) {
    reason = "funding_changed";
    message =
      "Funding evidence changed within this window. Access is closed pending reconciliation.";
  } else if (reason === "available" && window?.blocked_reason) {
    reason = window.blocked_reason;
    message =
      "The provider rejected account access or funding. Parent verification is needed before more requests.";
  } else if (reason === "available" && remaining < textReservationNanoUsd) {
    reason = "allowance_exhausted";
    message =
      "The remaining app allowance cannot cover another text request. Saved work is still available.";
  }
  return {
    mode: config.mode,
    ready: reason === "available",
    liveReady: reason === "available" && config.mode === "live",
    reason,
    message,
    allowanceNanoUsd: String(config.allocation),
    settledNanoUsd: String(totals.settled),
    reservedNanoUsd: String(totals.reserved),
    unknownNanoUsd: String(totals.unknown),
    remainingNanoUsd: String(remaining > 0n ? remaining : 0n),
    nextTextReservationNanoUsd: String(textReservationNanoUsd),
    checkedAt: config.checkedAt,
    expiresAt: config.expiresAt,
    evidenceExpiresAt: config.evidenceExpiresAt,
    retentionExpiresAt: config.retentionExpiresAt,
  };
}
