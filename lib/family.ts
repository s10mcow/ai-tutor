import { randomUUID } from "node:crypto";
import { auth } from "./auth.ts";
import { database } from "./database.ts";

export type Learner = { id: string; name: string };
export type FamilyAccess = {
  familyId: string;
  sessionId: string;
  ownerId: string;
};
export class AccessError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function requireFamily(request: Request): Promise<FamilyAccess> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session)
    throw new AccessError(401, "Sign in to open your family workspace.");
  const result = await database.query<{ id: string }>(
    "INSERT INTO family (id, owner_id) VALUES ($1, $2) ON CONFLICT (owner_id) DO UPDATE SET owner_id = EXCLUDED.owner_id RETURNING id",
    [randomUUID(), session.user.id],
  );
  return {
    familyId: result.rows[0].id,
    sessionId: session.session.id,
    ownerId: session.user.id,
  };
}
export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (
    !origin ||
    origin !== new URL(process.env.BETTER_AUTH_URL ?? request.url).origin
  ) {
    throw new AccessError(
      403,
      "This request must come from your Learning Studio.",
    );
  }
}
export async function listLearners(access: FamilyAccess): Promise<Learner[]> {
  return (
    await database.query<Learner>(
      "SELECT id, name FROM learner WHERE family_id = $1 ORDER BY created_at, id",
      [access.familyId],
    )
  ).rows;
}
export async function createLearner(
  access: FamilyAccess,
  input: unknown,
): Promise<Learner> {
  if (
    typeof input !== "string" ||
    input.trim().length < 1 ||
    input.trim().length > 40
  ) {
    throw new AccessError(
      400,
      "Use a Learner name between 1 and 40 characters.",
    );
  }
  return (
    await database.query<Learner>(
      "INSERT INTO learner (id, family_id, name) VALUES ($1, $2, $3) RETURNING id, name",
      [randomUUID(), access.familyId, input.trim()],
    )
  ).rows[0];
}
export async function familyResponse(operation: () => Promise<unknown>) {
  try {
    return Response.json(await operation(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AccessError)
      return Response.json(
        { error: error.message },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    if (error instanceof SyntaxError)
      return Response.json(
        { error: "The request could not be read." },
        { status: 400 },
      );
    // Keep credentials, SQL, and family data out of responses and logs.
    console.error("Family request failed");
    return Response.json(
      { error: "Your workspace could not be reached. Please try again." },
      { status: 500 },
    );
  }
}

export async function selectedLearnerId(
  access: FamilyAccess,
): Promise<string | null> {
  return (
    (
      await database.query<{ learner_id: string }>(
        "SELECT learner_id FROM family_session_selection WHERE session_id = $1 AND family_id = $2",
        [access.sessionId, access.familyId],
      )
    ).rows[0]?.learner_id ?? null
  );
}
export async function selectLearner(
  access: FamilyAccess,
  learnerId: unknown,
): Promise<{ selectedLearnerId: string | null }> {
  if (learnerId === null) {
    await database.query(
      "DELETE FROM family_session_selection WHERE session_id = $1 AND family_id = $2",
      [access.sessionId, access.familyId],
    );
    return { selectedLearnerId: null };
  }
  if (typeof learnerId !== "string")
    throw new AccessError(400, "Choose a Learner to continue.");
  const selection = await database.query(
    `INSERT INTO family_session_selection (session_id, family_id, learner_id)
     SELECT $1, family_id, id FROM learner WHERE family_id = $2 AND id = $3
     ON CONFLICT (session_id) DO UPDATE SET learner_id = EXCLUDED.learner_id
     RETURNING learner_id`,
    [access.sessionId, access.familyId, learnerId],
  );
  if (!selection.rowCount)
    throw new AccessError(404, "That workspace is unavailable.");
  return { selectedLearnerId: learnerId };
}

export async function requireLearner(
  access: FamilyAccess,
  learnerId: string,
): Promise<Learner> {
  const learner = (
    await database.query<Learner>(
      "SELECT id, name FROM learner WHERE family_id = $1 AND id = $2",
      [access.familyId, learnerId],
    )
  ).rows[0];
  if (!learner) throw new AccessError(404, "That workspace is unavailable.");
  return learner;
}
