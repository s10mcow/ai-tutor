import { solReply } from "./sol-provider.ts";
import type { CoachingAction } from "./coaching-contract.ts";

export type TutorRequest = {
  familyId: string;
  learnerId: string;
  sessionId: string;
  actionId: string;
  attemptId: string;
  problem: string;
  actions: CoachingAction[];
};

// Explicit scripted development preview or the metered direct provider. No fallback.
export async function tutorReply(context: TutorRequest): Promise<string> {
  if (
    process.env.TUTOR_OPENAI_FIXTURE_URL ||
    !process.env.TUTOR_PREVIEW_URL ||
    process.env.NODE_ENV === "production"
  )
    return solReply(context);
  const endpoint = process.env.TUTOR_PREVIEW_URL;
  if (!endpoint) {
    throw new Error("Tutor access has not been activated");
  }
  const url = new URL(endpoint);
  if (url.protocol !== "http:" || url.hostname !== "127.0.0.1") {
    throw new Error("The controlled Tutor must be local");
  }
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(context),
    signal: AbortSignal.timeout(15_000),
    redirect: "error",
  });
  if (!response.ok) throw new Error("Tutor unavailable");
  const data: unknown = await response.json();
  if (
    !data ||
    typeof data !== "object" ||
    !("text" in data) ||
    typeof data.text !== "string" ||
    !data.text.trim() ||
    data.text.length > 6000
  ) {
    throw new Error("Tutor reply unavailable");
  }
  return data.text.trim();
}
