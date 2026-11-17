import type { CoachingAction } from "./coaching-contract";

// Written evidence is a snapshot of selected Learner input, never a Tutor reply.
export type WrittenEvidence = {
  actionId: string;
  text: string;
  intent: string;
};
export type PortfolioImage = {
  id: string;
  kind: "workbook" | "art";
  width: number;
  height: number;
};
export type PortfolioEntry = {
  id: string;
  learnerId: string;
  title: string;
  evidence: WrittenEvidence[];
  images: PortfolioImage[];
  audio: { durationSeconds: number } | null;
  reflection: string;
  createdAt: string;
};
export type PortfolioSummary = Pick<
  PortfolioEntry,
  "id" | "title" | "createdAt"
>;
export type PortfolioEntryInput = {
  id: string;
  sessionId: string;
  actionIds: string[];
  imageIds?: string[];
  title: string;
  reflection: string;
};
export function canSaveWrittenAction(action: Pick<CoachingAction, "intent">) {
  // Launch questions and coaching controls can contain app-suggested text.
  return action.intent === "attempt" || action.intent === "revision";
}

export function canSavePortfolioReflection(
  entry: Pick<PortfolioEntry, "images" | "evidence" | "audio">,
  reflection: string,
) {
  return (
    !entry.images.length ||
    !!entry.evidence.length ||
    !!entry.audio ||
    !!reflection.trim()
  );
}
