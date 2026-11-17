import { activityChoices, type ActivityChoice } from "./activity-contract.ts";
import { AccessError } from "./family.ts";

export function parseActivity(input: unknown): ActivityChoice | null {
  if (!input || typeof input !== "object" || !("activity" in input))
    return null;
  const choice = input.activity;
  if (choice && typeof choice === "object" && "kind" in choice) {
    if (choice.kind === "custom") {
      if (
        !("interest" in choice) ||
        typeof choice.interest !== "string" ||
        !choice.interest.trim() ||
        choice.interest.trim().length > 120
      ) {
        throw new AccessError(
          400,
          "Describe your interest in 1 to 120 characters.",
        );
      }
      const interest = choice.interest.trim();
      return {
        kind: "custom",
        interest,
        title: `Explore ${interest}`,
        purpose: `Find a small activity about ${interest}. Choose what you want to investigate and change the suggestion whenever you like.`,
        starter: `I am curious about ${interest}. Help me choose a small activity to try, with a concrete first step.`,
      };
    }
    const activity = activityChoices.find((item) => item.kind === choice.kind);
    if (activity) return { ...activity };
  }
  throw new AccessError(400, "Choose an available activity.");
}
