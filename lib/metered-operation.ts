import { database } from "./database.ts";
import {
  providerConfiguration,
  type ProviderConfiguration,
} from "./model-access.ts";

export type MeteredResult<T> = {
  value: T;
  measuredNanoUsd: bigint | null;
  usage?: Record<string, unknown>;
  requestId?: string;
  responseId?: string;
  blockReason?: string;
};
// Server-only boundary. One attempt = one dispatch. Callers authorize ownership,
// bound their operation and supply a versioned cost policy before entering here.
// This function stores billing metadata only; application records own replayable results.
export async function meteredOperation<T>(operation: {
  attemptId: string;
  kind: "text" | "image" | "research";
  pricePolicy: string;
  maximumNanoUsd: bigint;
  dispatch: (config: ProviderConfiguration) => Promise<MeteredResult<T>>;
}): Promise<T> {
  const config = providerConfiguration(operation.kind);
  if (config.reason !== "available" || operation.maximumNanoUsd <= 0n)
    throw new Error("Model access is closed");
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO model_allowance(id, policy_identity, allocation_nano_usd) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
      [config.windowId, config.identity, String(config.allocation)],
    );
    const window = (
      await client.query(
        "SELECT * FROM model_allowance WHERE id = $1 FOR UPDATE",
        [config.windowId],
      )
    ).rows[0];
    const current = providerConfiguration(operation.kind);
    if (
      current.reason !== "available" ||
      current.identity !== config.identity ||
      window.policy_identity !== config.identity ||
      window.blocked_reason
    )
      throw new Error("Funding verification needed");
    const used = BigInt(
      (
        await client.query(
          `SELECT COALESCE(sum(CASE WHEN status = 'settled' THEN measured_nano_usd ELSE reserved_nano_usd END), 0)::text AS used FROM model_operation WHERE allowance_id = $1`,
          [config.windowId],
        )
      ).rows[0].used,
    );
    if (used + operation.maximumNanoUsd > BigInt(window.allocation_nano_usd))
      throw new Error("Allowance exhausted");
    await client.query(
      `INSERT INTO model_operation(id, allowance_id, operation, price_policy, reserved_nano_usd, status) VALUES ($1,$2,$3,$4,$5,'pending')`,
      [
        operation.attemptId,
        config.windowId,
        operation.kind,
        operation.pricePolicy,
        String(operation.maximumNanoUsd),
      ],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  // The durable reservation is committed before the sole external dispatch.
  let result: MeteredResult<T>;
  try {
    result = await operation.dispatch(config);
  } catch {
    await database.query(
      "UPDATE model_operation SET status = 'usage_unknown', finished_at = now() WHERE id = $1 AND status = 'pending'",
      [operation.attemptId],
    );
    throw new Error("Provider outcome unknown; allowance remains held");
  }
  const measured = result.measuredNanoUsd;
  const valid =
    measured !== null && measured >= 0n && measured <= operation.maximumNanoUsd;
  const settlement = await database.connect();
  try {
    await settlement.query("BEGIN");
    await settlement.query(
      "SELECT id FROM model_allowance WHERE id = $1 FOR UPDATE",
      [config.windowId],
    );
    await settlement.query(
      `UPDATE model_operation SET status = $2, measured_nano_usd = $3, usage = $4, provider_request_id = $5, provider_response_id = $6, finished_at = now() WHERE id = $1 AND status = 'pending'`,
      [
        operation.attemptId,
        valid ? "settled" : "usage_unknown",
        valid ? String(measured) : null,
        result.usage ?? null,
        result.requestId ?? null,
        result.responseId ?? null,
      ],
    );
    if (result.blockReason)
      await settlement.query(
        "UPDATE model_allowance SET blocked_reason = $2 WHERE id = $1",
        [config.windowId, result.blockReason],
      );
    await settlement.query("COMMIT");
  } catch (error) {
    await settlement.query("ROLLBACK");
    throw error;
  } finally {
    settlement.release();
  }
  return result.value;
}
