export type GameLevel = "smaller" | "bigger";
export type GameHelp = "hint" | "example";
export type GameChallenge = { tiles: number; trays: number; prompt: string };
export type GameInput = { id: string } & (
  | { intent: "choose"; level: GameLevel }
  | { intent: "attempt"; round: number; answer: number; reason: string }
  | { intent: "help"; round: number; kind: GameHelp }
  | { intent: "next"; round: number }
);
export type GameAttempt = {
  id: string;
  round: number;
  challenge: GameChallenge;
  answer: number;
  reason: string;
  correct: boolean;
  feedback: string;
  help: GameHelp[];
};
export type MathsGame = {
  level: GameLevel;
  round: number;
  challenge: GameChallenge;
  status: "playing" | "round-complete" | "complete";
  help: { kind: GameHelp; text: string }[];
  attempts: GameAttempt[];
  // Bounded command receipts make a network retry safe, including next round.
  commands: GameInput[];
};
