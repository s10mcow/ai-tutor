import { createHash } from "node:crypto";
import { database } from "./database.ts";
import { AccessError, requireLearner, type FamilyAccess } from "./family.ts";
import {
  canSaveWrittenAction,
  type PortfolioEntry,
  type PortfolioSummary,
  type WrittenEvidence,
  type WrittenEvidenceInput,
} from "./portfolio-contract.ts";
import type { CoachingAction } from "./coaching-contract.ts";

type EntryRow = {
  id: string;
  family_id: string;
  learner_id: string;
  save_fingerprint: string;
  title: string;
  evidence: WrittenEvidence[];
  reflection: string;
  created_at: Date;
};
function entry(row: EntryRow): PortfolioEntry {
  return {
    id: row.id,
    learnerId: row.learner_id,
    title: row.title,
    evidence: row.evidence,
    reflection: row.reflection,
    createdAt: row.created_at.toISOString(),
  };
}
function parseInput(value: unknown): WrittenEvidenceInput {
  const input = value as Partial<WrittenEvidenceInput> | null;
  const validId = (id: unknown): id is string =>
    typeof id === "string" && /^[a-zA-Z0-9-]{1,80}$/.test(id);
  if (
    !input ||
    !validId(input.id) ||
    !validId(input.sessionId) ||
    !Array.isArray(input.actionIds) ||
    input.actionIds.length < 1 ||
    input.actionIds.length > 40 ||
    !input.actionIds.every(validId) ||
    new Set(input.actionIds).size !== input.actionIds.length ||
    typeof input.title !== "string" ||
    !input.title.trim() ||
    input.title.trim().length > 100 ||
    typeof input.reflection !== "string" ||
    input.reflection.length > 4000
  ) {
    throw new AccessError(
      400,
      "Choose your work, add a title up to 100 characters, and keep your reflection under 4,000 characters.",
    );
  }
  return {
    id: input.id,
    sessionId: input.sessionId,
    actionIds: input.actionIds,
    title: input.title.trim(),
    reflection: input.reflection,
  };
}
export async function listPortfolio(
  access: FamilyAccess,
  learnerId: string,
): Promise<PortfolioSummary[]> {
  await requireLearner(access, learnerId);
  const result = await database.query<{
    id: string;
    title: string;
    created_at: Date;
  }>(
    "SELECT id, title, created_at FROM portfolio_entry WHERE family_id = $1 AND learner_id = $2 ORDER BY created_at DESC, id",
    [access.familyId, learnerId],
  );
  return result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    createdAt: row.created_at.toISOString(),
  }));
}
export async function readPortfolioEntry(
  access: FamilyAccess,
  learnerId: string,
  entryId: string,
): Promise<PortfolioEntry> {
  await requireLearner(access, learnerId);
  const row = (
    await database.query<EntryRow>(
      "SELECT * FROM portfolio_entry WHERE id = $1 AND family_id = $2 AND learner_id = $3",
      [entryId, access.familyId, learnerId],
    )
  ).rows[0];
  if (!row) throw new AccessError(404, "That Portfolio entry is unavailable.");
  return entry(row);
}
export async function saveWrittenEvidence(
  access: FamilyAccess,
  learnerId: string,
  value: unknown,
): Promise<PortfolioEntry> {
  await requireLearner(access, learnerId);
  const input = parseInput(value);
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({ ...input, actionIds: [...input.actionIds].sort() }),
    )
    .digest("hex");
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    // Serialize this save identity, including concurrent replays before commit.
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 10))",
      [input.id],
    );
    const existing = (
      await client.query<EntryRow>(
        "SELECT * FROM portfolio_entry WHERE id = $1",
        [input.id],
      )
    ).rows[0];
    if (existing) {
      if (
        existing.family_id !== access.familyId ||
        existing.learner_id !== learnerId
      )
        throw new AccessError(404, "That Portfolio entry is unavailable.");
      if (existing.save_fingerprint !== fingerprint)
        throw new AccessError(
          409,
          "This save was already used for different work. Open your Portfolio to review it.",
        );
      await client.query("COMMIT");
      return entry(existing);
    }
    const session = await client.query(
      "SELECT id FROM learning_session WHERE id = $1 AND family_id = $2 AND learner_id = $3 AND expires_at > clock_timestamp() FOR SHARE",
      [input.sessionId, access.familyId, learnerId],
    );
    if (!session.rowCount)
      throw new AccessError(
        404,
        "That activity is no longer available to save.",
      );
    const selected = (
      await client.query<CoachingAction>(
        "SELECT id, text, intent FROM learning_action WHERE session_id = $1 AND id = ANY($2::text[]) ORDER BY sequence",
        [input.sessionId, input.actionIds],
      )
    ).rows;
    if (
      selected.length !== input.actionIds.length ||
      selected.some((action) => !canSaveWrittenAction(action))
    )
      throw new AccessError(400, "Choose written work from this activity.");
    const evidence: WrittenEvidence[] = selected.map((action) => ({
      actionId: action.id,
      text: action.text,
      intent: action.intent,
    }));
    const row = (
      await client.query<EntryRow>(
        "INSERT INTO portfolio_entry (id, family_id, learner_id, title, evidence, reflection, save_fingerprint) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        [
          input.id,
          access.familyId,
          learnerId,
          input.title,
          JSON.stringify(evidence),
          input.reflection,
          fingerprint,
        ],
      )
    ).rows[0];
    await client.query("COMMIT");
    return entry(row);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function editReflection(
  access: FamilyAccess,
  learnerId: string,
  entryId: string,
  value: unknown,
): Promise<PortfolioEntry> {
  await requireLearner(access, learnerId);
  if (
    !value ||
    typeof value !== "object" ||
    !("reflection" in value) ||
    typeof value.reflection !== "string" ||
    value.reflection.length > 4000
  ) {
    throw new AccessError(400, "Keep your reflection under 4,000 characters.");
  }
  const row = (
    await database.query<EntryRow>(
      "UPDATE portfolio_entry SET reflection = $4, updated_at = now() WHERE id = $1 AND family_id = $2 AND learner_id = $3 RETURNING *",
      [entryId, access.familyId, learnerId, value.reflection],
    )
  ).rows[0];
  if (!row) throw new AccessError(404, "That Portfolio entry is unavailable.");
  return entry(row);
}
