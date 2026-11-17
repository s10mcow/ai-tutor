import { database } from "./database.ts";
import { AccessError, requireLearner, type FamilyAccess } from "./family.ts";
import type {
  LearningNotes,
  LearningNotesInput,
} from "./learning-notes-contract.ts";

type NotesRow = {
  interest: string;
  helpful_approach: string;
  next_step: string;
};
function notes(row: NotesRow): LearningNotes {
  return {
    interest: row.interest,
    helpfulApproach: row.helpful_approach,
    nextStep: row.next_step,
    origin: "learner-stated",
  };
}
export async function readLearningNotes(
  access: FamilyAccess,
  learnerId: string,
): Promise<LearningNotes | null> {
  await requireLearner(access, learnerId);
  const row = (
    await database.query<NotesRow>(
      "SELECT interest, helpful_approach, next_step FROM learning_notes WHERE family_id = $1 AND learner_id = $2",
      [access.familyId, learnerId],
    )
  ).rows[0];
  return row ? notes(row) : null;
}
function parseNotes(
  value: unknown,
): LearningNotesInput & { sessionId?: string } {
  const input = value as
    (Partial<LearningNotesInput> & { sessionId?: unknown }) | null;
  if (
    !input ||
    [input.interest, input.helpfulApproach, input.nextStep].some(
      (value) => typeof value !== "string" || value.length > 240,
    ) ||
    (input.sessionId !== undefined &&
      (typeof input.sessionId !== "string" ||
        !/^[a-zA-Z0-9-]{1,80}$/.test(input.sessionId)))
  )
    throw new AccessError(400, "Keep each learning note to 240 characters.");
  const result = {
    interest: input.interest!.trim(),
    helpfulApproach: input.helpfulApproach!.trim(),
    nextStep: input.nextStep!.trim(),
    sessionId: input.sessionId as string | undefined,
  };
  if (!result.interest && !result.helpfulApproach && !result.nextStep)
    throw new AccessError(
      400,
      "Write a brief note, or use Clear learning notes.",
    );
  return result;
}
export async function saveLearningNotes(
  access: FamilyAccess,
  learnerId: string,
  value: unknown,
): Promise<LearningNotes> {
  await requireLearner(access, learnerId);
  const input = parseNotes(value);
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    // Serialize edits and clears per Learner without keeping a history of old notes.
    await client.query(
      "SELECT id FROM learner WHERE family_id = $1 AND id = $2 FOR UPDATE",
      [access.familyId, learnerId],
    );
    if (input.sessionId) {
      const source = await client.query(
        "SELECT id FROM learning_session WHERE id = $1 AND family_id = $2 AND learner_id = $3 AND expires_at > clock_timestamp() AND EXISTS (SELECT 1 FROM learning_action WHERE session_id = $1 AND status = 'complete') FOR SHARE",
        [input.sessionId, access.familyId, learnerId],
      );
      if (!source.rowCount)
        throw new AccessError(
          404,
          "Complete an exchange in this Learner’s current activity before saving notes.",
        );
    } else {
      const existing = await client.query(
        "SELECT learner_id FROM learning_notes WHERE family_id = $1 AND learner_id = $2",
        [access.familyId, learnerId],
      );
      if (!existing.rowCount)
        throw new AccessError(
          404,
          "Save your first notes from a learning activity.",
        );
    }
    const row = (
      await client.query<NotesRow>(
        `INSERT INTO learning_notes (family_id, learner_id, interest, helpful_approach, next_step) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (family_id, learner_id) DO UPDATE SET interest = EXCLUDED.interest, helpful_approach = EXCLUDED.helpful_approach, next_step = EXCLUDED.next_step RETURNING *`,
        [
          access.familyId,
          learnerId,
          input.interest,
          input.helpfulApproach,
          input.nextStep,
        ],
      )
    ).rows[0];
    await client.query("COMMIT");
    return notes(row);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export async function clearLearningNotes(
  access: FamilyAccess,
  learnerId: string,
) {
  await requireLearner(access, learnerId);
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT id FROM learner WHERE family_id = $1 AND id = $2 FOR UPDATE",
      [access.familyId, learnerId],
    );
    await client.query(
      "DELETE FROM learning_notes WHERE family_id = $1 AND learner_id = $2",
      [access.familyId, learnerId],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
