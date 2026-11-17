export const activityChoices = [
  {
    kind: "biking",
    title: "Biking exploration",
    purpose:
      "Explore what makes a bike ride feel different. Ask a question about trails, bikes, or the experience of riding.",
    starter: "Why might the same bike feel different on two trails?",
  },
  {
    kind: "workbook",
    title: "Workbook maths",
    purpose:
      "Choose one workbook question and work through a small step together. Type the question and tell the Tutor where you got stuck.",
    starter: "Type a question from your workbook to get started.",
  },
  {
    kind: "art",
    title: "Paper art",
    purpose:
      "Keep drawing or painting on paper. Explore a colour, shape, or artistic choice and describe what you notice to the Tutor.",
    starter: "What could I try to make a drawing feel calm or lively?",
  },
  {
    kind: "ai-literacy",
    title: "AI literacy",
    purpose:
      "Investigate when an AI answer deserves trust. Choose a claim, ask what evidence would help, and consider how you could check it.",
    starter: "How could I check an answer from an AI?",
  },
] as const;

export type ActivityKind = (typeof activityChoices)[number]["kind"];
export type ActivityChoice = {
  kind: ActivityKind | "custom";
  title: string;
  purpose: string;
  starter: string;
  interest?: string;
};
export type ActivityLaunch =
  { kind: ActivityKind } | { kind: "custom"; interest: string };
