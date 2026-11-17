import { randomUUID } from "node:crypto";
import { database } from "./database.ts";
import { AccessError, requireLearner, type FamilyAccess } from "./family.ts";
import type {
  CoachingAction,
  CoachingInput,
  LearningSession,
} from "./coaching-contract.ts";
import { coachingIntents, type CoachingIntent } from "./coaching-contract.ts";
import { tutorReply } from "./tutor-provider.ts";
import { readLearningNotes } from "./learning-notes.ts";
import { parseActivity } from "./activities.ts";
import type { ActivityChoice } from "./activity-contract.ts";

// Never extend an activity by reading it. Deployment may choose a shorter TTL.
function retentionSeconds() {
  const value = Number(process.env.TUTOR_SESSION_RETENTION_SECONDS ?? 86400);
  return Number.isFinite(value)
    ? Math.max(1, Math.min(86400, Math.floor(value)))
    : 86400;
}
export async function purgeExpiredSessions() {
  await database.query(
    "DELETE FROM learning_session WHERE expires_at <= now()",
  );
}

type SessionRow = {
  id: string;
  learner_id: string;
  problem: string;
  activity: ActivityChoice | null;
  expires_at: Date;
};
async function snapshot(row: SessionRow): Promise<LearningSession> {
  await database.query(
    "UPDATE learning_action SET status = 'failed' WHERE session_id = $1 AND status = 'pending' AND started_at < now() - interval '30 seconds'",
    [row.id],
  );
  const actions = (
    await database.query<CoachingAction>(
      "SELECT id, intent, text, reply, status FROM learning_action WHERE session_id = $1 ORDER BY sequence",
      [row.id],
    )
  ).rows;
  return {
    id: row.id,
    learnerId: row.learner_id,
    problem: row.problem,
    activity: row.activity,
    expiresAt: row.expires_at.toISOString(),
    actions,
  };
}
export async function currentSession(access: FamilyAccess, learnerId: string) {
  await requireLearner(access, learnerId);
  await purgeExpiredSessions();
  const row = (
    await database.query<SessionRow>(
      "SELECT * FROM learning_session WHERE family_id = $1 AND learner_id = $2 AND expires_at > now()",
      [access.familyId, learnerId],
    )
  ).rows[0];
  return row ? snapshot(row) : null;
}
export async function startSession(
  access: FamilyAccess,
  learnerId: string,
  input: unknown = {},
) {
  await requireLearner(access, learnerId);
  let activity = parseActivity(input);
  if (
    input &&
    typeof input === "object" &&
    "resume" in input &&
    input.resume === true
  ) {
    const notes = await readLearningNotes(access, learnerId);
    if (!notes?.nextStep)
      throw new AccessError(404, "No saved next step. Choose a new activity.");
    activity = {
      kind: "custom",
      title: "Continue your next step",
      purpose: notes.nextStep,
      starter: notes.nextStep,
    };
  }
  await purgeExpiredSessions();
  const row = (
    await database.query<SessionRow>(
      `INSERT INTO learning_session (id, family_id, learner_id, expires_at, activity) VALUES ($1, $2, $3, now() + $4 * interval '1 second', $5)
     ON CONFLICT (family_id, learner_id) DO UPDATE SET learner_id = EXCLUDED.learner_id RETURNING *`,
      [randomUUID(), access.familyId, learnerId, retentionSeconds(), activity],
    )
  ).rows[0];
  return snapshot(row);
}
export async function readSession(
  access: FamilyAccess,
  learnerId: string,
  sessionId: string,
) {
  const session = await currentSession(access, learnerId);
  if (!session || session.id !== sessionId)
    throw new AccessError(
      404,
      "This activity is no longer available. Start a new activity.",
    );
  return session;
}
function parseInput(input: unknown): CoachingInput {
  if (
    !input ||
    typeof input !== "object" ||
    !("id" in input) ||
    typeof input.id !== "string" ||
    !/^[a-zA-Z0-9-]{1,80}$/.test(input.id) ||
    !("intent" in input) ||
    typeof input.intent !== "string" ||
    !coachingIntents.some((intent) => intent === input.intent) ||
    !("text" in input) ||
    typeof input.text !== "string" ||
    !input.text.trim() ||
    input.text.trim().length > 2000
  ) {
    throw new AccessError(400, "Write a question of up to 2,000 characters.");
  }
  return {
    id: input.id,
    intent: input.intent as CoachingIntent,
    text: input.text.trim(),
  };
}
export async function submitAction(
  access: FamilyAccess,
  learnerId: string,
  sessionId: string,
  input: unknown,
) {
  if (
    input &&
    typeof input === "object" &&
    "intent" in input &&
    input.intent === "end"
  ) {
    await requireLearner(access, learnerId);
    await database.query(
      "DELETE FROM learning_session WHERE id = $1 AND family_id = $2 AND learner_id = $3",
      [sessionId, access.familyId, learnerId],
    );
    return null;
  }
  await readSession(access, learnerId, sessionId);
  const action = parseInput(input);
  const attemptId = randomUUID();
  let dispatch = false;
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query(
      "SELECT id FROM learning_session WHERE id = $1 AND family_id = $2 AND learner_id = $3 AND expires_at > now() FOR UPDATE",
      [sessionId, access.familyId, learnerId],
    );
    if (!locked.rowCount)
      throw new AccessError(404, "This activity is no longer available.");
    const actions = (
      await client.query<CoachingAction>(
        "SELECT * FROM learning_action WHERE session_id = $1 ORDER BY sequence",
        [sessionId],
      )
    ).rows;
    const existing = actions.find((entry) => entry.id === action.id);
    if (
      existing &&
      (existing.text !== action.text || existing.intent !== action.intent)
    ) {
      throw new AccessError(
        409,
        "This action was already used for different input.",
      );
    }
    if (!existing || existing.status === "failed") {
      if (
        actions.some(
          (entry) => entry.id !== action.id && entry.status !== "complete",
        )
      )
        throw new AccessError(409, "Please retry the unfinished reply first.");
      if (!actions.length && action.intent !== "question")
        throw new AccessError(400, "Start with a question.");
      if (!existing && actions.length >= 40)
        throw new AccessError(
          409,
          "This activity has reached 40 steps. End it and start a new activity.",
        );
      if (existing) {
        await client.query(
          "UPDATE learning_action SET status = 'pending', attempt_id = $3, started_at = now() WHERE session_id = $1 AND id = $2",
          [sessionId, action.id, attemptId],
        );
      } else {
        await client.query(
          "INSERT INTO learning_action (session_id, id, sequence, intent, text, status, attempt_id) VALUES ($1, $2, $3, $4, $5, 'pending', $6)",
          [
            sessionId,
            action.id,
            actions.length + 1,
            action.intent,
            action.text,
            attemptId,
          ],
        );
        if (!actions.length || action.intent === "correction")
          await client.query(
            "UPDATE learning_session SET problem = $2 WHERE id = $1",
            [sessionId, action.text],
          );
      }
      dispatch = true;
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  const session = await readSession(access, learnerId, sessionId);
  if (!dispatch) return session;
  try {
    const reply = await tutorReply({
      familyId: access.familyId,
      learnerId,
      sessionId,
      actionId: action.id,
      attemptId,
      problem: session.problem,
      activity: session.activity,
      actions: session.actions,
      learningNotes: await readLearningNotes(access, learnerId),
    });
    await database.query(
      "UPDATE learning_action SET reply = $3, status = 'complete' WHERE session_id = $1 AND id = $2 AND attempt_id = $4 AND status = 'pending'",
      [sessionId, action.id, reply, attemptId],
    );
  } catch {
    await database.query(
      "UPDATE learning_action SET status = 'failed' WHERE session_id = $1 AND id = $2 AND attempt_id = $3 AND status = 'pending'",
      [sessionId, action.id, attemptId],
    );
  }
  return readSession(access, learnerId, sessionId);
}
