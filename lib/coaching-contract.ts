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
  expiresAt: string;
  actions: CoachingAction[];
};
export type CoachingInput = {
  id: string;
  intent: CoachingIntent;
  text: string;
};
