// Explicit Learner statements, not an assessment or a conversation summary.
export type LearningNotes = {
  interest: string;
  helpfulApproach: string;
  nextStep: string;
  origin: "learner-stated";
};
export type LearningNotesInput = Omit<LearningNotes, "origin">;
