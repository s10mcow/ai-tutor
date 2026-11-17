import { database } from "./database.ts";
import { AccessError, type FamilyAccess } from "./family.ts";
import {
  coachingIntents,
  type CoachingBreak,
  type CoachingIntent,
} from "./coaching-contract.ts";

// Caller has resolved the owned, unexpired, non-game session. Recheck under lock.
export async function changeCoachingBreak(
  access: FamilyAccess,
  learnerId: string,
  sessionId: string,
  input: {
    intent: "pause" | "resume";
    scratchpad?: unknown;
    message?: unknown;
    messageIntent?: unknown;
  },
) {
  let state: CoachingBreak | null = null;
  if (input.intent === "pause") {
    if (
      typeof input.scratchpad !== "string" ||
      input.scratchpad.length > 4000 ||
      typeof input.message !== "string" ||
      input.message.length > 2000 ||
      !coachingIntents.some((intent) => intent === input.messageIntent)
    )
      throw new AccessError(
        400,
        "Keep your scratchpad within 4,000 characters and your message within 2,000 before taking a break.",
      );
    state = {
      paused: true,
      scratchpad: input.scratchpad,
      message: input.message,
      intent: input.messageIntent as CoachingIntent,
    };
  }
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const row = (
      await client.query<{ break_state: CoachingBreak | null }>(
        "SELECT break_state FROM learning_session WHERE id = $1 AND family_id = $2 AND learner_id = $3 AND expires_at > now() FOR UPDATE",
        [sessionId, access.familyId, learnerId],
      )
    ).rows[0];
    if (!row)
      throw new AccessError(404, "This activity is no longer available.");
    if (
      (
        await client.query(
          "SELECT 1 FROM learning_action WHERE session_id = $1 AND status = 'pending'",
          [sessionId],
        )
      ).rowCount
    )
      throw new AccessError(
        409,
        "Let the current reply finish before taking a break.",
      );
    if (input.intent === "pause" && row.break_state?.paused) {
      if (
        row.break_state.message !== state!.message ||
        row.break_state.scratchpad !== state!.scratchpad ||
        row.break_state.intent !== state!.intent
      )
        throw new AccessError(
          409,
          "This activity is already paused. Resume it before changing your work.",
        );
    } else {
      if (input.intent === "resume")
        state = row.break_state ? { ...row.break_state, paused: false } : null;
      await client.query(
        "UPDATE learning_session SET break_state = $2 WHERE id = $1",
        [sessionId, state],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
