import { database } from "./database.ts";
import { isDeepStrictEqual } from "node:util";
import { AccessError, requireLearner, type FamilyAccess } from "./family.ts";
import { readSession } from "./coaching.ts";
import type { ActivityChoice } from "./activity-contract.ts";
import type {
  GameChallenge,
  GameInput,
  GameLevel,
  MathsGame,
} from "./maths-game-contract.ts";

function challenge(level: GameLevel, round: number): GameChallenge {
  const [tiles, trays] =
    level === "smaller"
      ? [
          [12, 3],
          [20, 4],
        ][round]
      : [
          [24, 6],
          [42, 7],
        ][round];
  return {
    tiles,
    trays,
    prompt: `Share ${tiles} tiles equally between ${trays} trays. How many tiles belong in each tray?`,
  };
}

function parseInput(value: unknown): GameInput {
  if (
    !value ||
    typeof value !== "object" ||
    !("id" in value) ||
    typeof value.id !== "string" ||
    !/^[a-zA-Z0-9-]{1,80}$/.test(value.id) ||
    !("intent" in value)
  ) {
    throw new AccessError(400, "Choose a game action and try again.");
  }
  const { id } = value;
  if (
    value.intent === "choose" &&
    "level" in value &&
    (value.level === "smaller" || value.level === "bigger")
  ) {
    return { id, intent: "choose", level: value.level };
  }
  if (!("round" in value) || (value.round !== 0 && value.round !== 1)) {
    throw new AccessError(
      400,
      "Choose a starting size or refresh this delivery.",
    );
  }
  const { round } = value;
  if (value.intent === "next") return { id, intent: "next", round };
  if (
    value.intent === "help" &&
    "kind" in value &&
    (value.kind === "hint" || value.kind === "example")
  ) {
    return { id, intent: "help", round, kind: value.kind };
  }
  if (
    value.intent === "attempt" &&
    "answer" in value &&
    typeof value.answer === "number" &&
    Number.isInteger(value.answer) &&
    value.answer >= 0 &&
    value.answer <= 100 &&
    "reason" in value &&
    typeof value.reason === "string" &&
    value.reason.trim() &&
    value.reason.trim().length <= 1000
  ) {
    return {
      id,
      intent: "attempt",
      round,
      answer: value.answer,
      reason: value.reason.trim(),
    };
  }
  throw new AccessError(
    400,
    "Use a whole number from 0 to 100 and a reason of up to 1,000 characters. It is okay to say what you are unsure about.",
  );
}

export async function playMathsGame(
  access: FamilyAccess,
  learnerId: string,
  sessionId: string,
  input: unknown,
) {
  await requireLearner(access, learnerId);
  const command = parseInput(input);
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const row = (
      await client.query<{
        activity: ActivityChoice | null;
        game: MathsGame | null;
      }>(
        "SELECT activity, game FROM learning_session WHERE id = $1 AND family_id = $2 AND learner_id = $3 AND expires_at > now() FOR UPDATE",
        [sessionId, access.familyId, learnerId],
      )
    ).rows[0];
    if (!row)
      throw new AccessError(
        404,
        "This activity is no longer available. Start a new activity.",
      );
    if (row.activity?.kind !== "maths-game")
      throw new AccessError(400, "Choose the short maths game first.");
    let game = row.game;
    const previous = game?.commands.find((event) => event.id === command.id);
    if (previous) {
      if (!isDeepStrictEqual(previous, command))
        throw new AccessError(
          409,
          "This action was already used for different input.",
        );
      await client.query("COMMIT");
      return readSession(access, learnerId, sessionId);
    }
    if (command.intent === "choose") {
      if (game)
        throw new AccessError(
          409,
          "Your game has already started. Finish it or choose another activity.",
        );
      game = {
        level: command.level,
        round: 0,
        challenge: challenge(command.level, 0),
        status: "playing",
        help: [],
        attempts: [],
        commands: [],
      };
    } else {
      if (!game) throw new AccessError(400, "Choose a starting size first.");
      if (command.round !== game.round)
        throw new AccessError(
          409,
          "This delivery has changed. Refresh the game and try again.",
        );
      if (command.intent === "next") {
        if (game.status !== "round-complete")
          throw new AccessError(409, "Try this delivery before moving on.");
        game.round = 1;
        game.challenge = challenge(game.level, 1);
        game.status = "playing";
        game.help = [];
      } else {
        if (game.status !== "playing")
          throw new AccessError(409, "This delivery is complete.");
        if (command.intent === "help") {
          if (!game.help.some((entry) => entry.kind === command.kind)) {
            game.help.push({
              kind: command.kind,
              text:
                command.kind === "hint"
                  ? `Give every tray one tile at a time. Count how many each tray has when all ${game.challenge.tiles} tiles are used. How could you check with multiplication?`
                  : "Example: 6 tiles shared between 2 trays gives 3 in each tray: 3 + 3 = 6. Now try your delivery with its different numbers.",
            });
          }
        } else {
          if (game.attempts.length >= 20)
            throw new AccessError(
              409,
              "You have tried 20 ideas. Take a break and start a new game when you are ready.",
            );
          const { tiles, trays } = game.challenge;
          const used = command.answer * trays;
          const correct = used === tiles;
          const feedback = correct
            ? `${command.answer} in each tray uses all ${tiles} tiles: ${trays} × ${command.answer} = ${tiles}. Your reason is saved with this attempt. How else could you check your idea?`
            : `${command.answer} in each tray uses ${used} of the ${tiles} tiles. ${used < tiles ? "Some tiles are still waiting." : "That needs more tiles than we have."} What could you change, and why? Try another idea.`;
          game.attempts.push({
            id: command.id,
            round: game.round,
            challenge: game.challenge,
            answer: command.answer,
            reason: command.reason,
            correct,
            feedback,
            help: game.help.map((entry) => entry.kind),
          });
          if (correct)
            game.status = game.round === 1 ? "complete" : "round-complete";
          // Only explicitly entered answer/reason are learner-authored evidence.
          // Feedback stays in reply, never in the Learner's words.
          await client.query(
            `INSERT INTO learning_action (session_id, id, sequence, intent, text, reply, status, attempt_id)
             SELECT $1, $2, COALESCE(MAX(sequence), 0) + 1, 'attempt', $3, $4, 'complete', $2 FROM learning_action WHERE session_id = $1`,
            [
              sessionId,
              command.id,
              `My answer: ${command.answer} tiles in each tray.\nMy reason: ${command.reason}`,
              feedback,
            ],
          );
        }
      }
    }
    if (game.commands.length >= 40)
      throw new AccessError(
        409,
        "This game has reached its limit. End the activity and start again.",
      );
    game.commands.push(command);
    await client.query(
      "UPDATE learning_session SET game = $2, problem = $3 WHERE id = $1",
      [sessionId, game, game.challenge.prompt],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return readSession(access, learnerId, sessionId);
}
