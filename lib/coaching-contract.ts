import type { SessionImage } from "./image-contract.ts";
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
  expiresAt: string;
  actions: CoachingAction[];
  images: SessionImage[];
};
export type CoachingInput = {
  id: string;
  intent: CoachingIntent;
  text: string;
};
