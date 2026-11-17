import type { ActivityChoice } from "./activity-contract.ts";
import type { MathsGame } from "./maths-game-contract.ts";

export const coachingIntents = [
  "question",
  "correction",
  "hint",
  "example",
  "attempt",
  "slower",
  "independent",
  "alternative",
  "evidence",
  "challenge",
  "different",
  "easier",
  "fresh",
] as const;
export type CoachingIntent = (typeof coachingIntents)[number];
export type CoachingAction = {
  id: string;
  intent: CoachingIntent;
  text: string;
  reply: string | null;
  status: "pending" | "complete" | "failed";
};
export type LearningSession = {
  id: string;
  learnerId: string;
  problem: string;
  activity: ActivityChoice | null;
  game: MathsGame | null;
  breakState: CoachingBreak | null;
  breakRevision: number;
  expiresAt: string;
  actions: CoachingAction[];
};
export type CoachingBreak = {
  paused: boolean;
  scratchpad: string;
  message: string;
  intent: CoachingIntent;
};
export type CoachingInput = {
  id: string;
  intent: CoachingIntent;
  text: string;
};

// The ordered exchange distinguishes the new challenge from the coached question.
// A correction starts a new focus, so an earlier fresh challenge no longer applies.
export function currentFreshChallenge(actions: CoachingAction[]) {
  for (let index = actions.length - 1; index >= 0; index--) {
    const action = actions[index];
    if (action.intent === "correction") return null;
    if (
      action.intent === "fresh" &&
      action.status === "complete" &&
      action.reply
    )
      return action;
  }
  return null;
}
