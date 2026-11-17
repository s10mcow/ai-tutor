import type { CoachingAction } from "./coaching-contract";

// Written evidence is a snapshot of selected Learner input, never a Tutor reply.
export type WrittenEvidence = {
  actionId: string;
  text: string;
  intent: string;
};
export type PortfolioEntry = {
  id: string;
  learnerId: string;
  title: string;
  evidence: WrittenEvidence[];
  reflection: string;
  createdAt: string;
};
export type PortfolioSummary = Pick<
  PortfolioEntry,
  "id" | "title" | "createdAt"
>;
export type WrittenEvidenceInput = {
  id: string;
  sessionId: string;
  actionIds: string[];
  title: string;
  reflection: string;
};
export function canSaveWrittenAction(action: Pick<CoachingAction, "intent">) {
  // Launch questions and coaching controls can contain app-suggested text.
  return action.intent === "attempt";
}
