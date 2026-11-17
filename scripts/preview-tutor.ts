import { createServer } from "node:http";
import type { TutorRequest } from "../lib/tutor-provider.ts";
import { currentFreshChallenge } from "../lib/coaching-contract.ts";

// A deliberately scripted external service for fictional demonstrations only.
// It neither calls a model nor stores conversation content.
let failNext = false;
const replies = {
  research:
    "Public lookup is unavailable in this scripted preview. No sources have been retrieved.",
  revision:
    "What evidence changed your conclusion, and what is still uncertain?",
  question:
    "Let’s take one small step. For our pencil-sharing practice, sketch 6 cups. How could you give every cup the same number of pencils?",
  hint: "Try giving each cup one pencil at a time. What stays equal as you go around the cups?",
  example:
    "Here’s a smaller example: 12 beads shared equally among 3 jars gives 4 beads in each jar. How could that help with your cups?",
  attempt:
    "You’ve shared your thinking. Check your idea by multiplying the number of cups by the pencils in each cup. Does that use all the pencils?",
  correction:
    "Thanks for correcting the question. We’ll use the corrected version shown beside this conversation. Which number changed, and what might that change in your plan?",
  slower:
    "We can slow down. Start with a single pencil in each cup. Stop there and count how many pencils you have used.",
  independent:
    "Take your time trying independently. I’ll wait here. When you’re ready, share what you tried and how you checked it.",
  alternative:
    "Compare drawing six equal groups with subtracting six pencils again and again. What does each way help you notice?",
  evidence:
    "In this scripted practice, check whether your drawing uses all 24 pencils in six equal groups. What does your evidence support, and would you change your reason?",
  challenge:
    "It is okay to question the Tutor. This scripted preview cannot judge your evidence, but six groups of four total 24. If I claimed 30, that claim needs correcting. What does your check show?",
  different:
    "Try a drawing instead: make two spaces on paper and draw one dot in each. What would keep the spaces equal?",
  easier:
    "Let’s start with two counters and two spaces. Put one counter in each space, then stop. You can also take a break and return to your work.",
  fresh:
    "Share 15 buttons equally among 3 bags. How many in each, and how could you check? Try your own way first.",
} satisfies Record<TutorRequest["actions"][number]["intent"], string>;
const port = Number(process.env.TUTOR_PREVIEW_PORT ?? 4321);
const server = createServer(async (request, response) => {
  const reply = (status: number, body: unknown) => {
    response.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    response.end(JSON.stringify(body));
  };
  // No browser-origin calls: only the app's server adapter or an explicit local CLI.
  if (request.method !== "POST" || request.headers.origin)
    return reply(403, { error: "Local server requests only" });
  if (request.url === "/fail-next") {
    failNext = true;
    return reply(200, {
      message: "The next reply will fail once. Retry will work.",
    });
  }
  if (request.url !== "/")
    return reply(404, { error: "Unknown preview operation" });
  try {
    let body = "";
    for await (const chunk of request) {
      body += chunk;
      if (Buffer.byteLength(body) > 400_000)
        return reply(413, { error: "Preview context too large" });
    }
    const context = JSON.parse(body) as TutorRequest;
    const intent = context.actions?.at(-1)?.intent;
    if (!intent || !Object.hasOwn(replies, intent))
      return reply(400, { error: "Choose a supported practice action" });
    if (failNext) {
      failNext = false;
      return reply(503, { error: "Simulated Tutor service failure" });
    }
    const lastText = context.actions.at(-1)?.text ?? "";
    const confused =
      /(?:don.t (?:get|understand|know)|still confused|not sure|confusing)/i.test(
        lastText,
      );
    const earlierConfusion = context.actions
      .slice(0, -1)
      .some((action) =>
        /(?:don.t (?:get|understand|know)|still confused|not sure|confusing)/i.test(
          action.text,
        ),
      );
    const text = confused
      ? replies[earlierConfusion ? "easier" : "different"]
      : intent === "attempt" && currentFreshChallenge(context.actions)
        ? "Check your fresh challenge: does the number of bags times your buttons per bag use all 15? Explain how you know the groups are equal. This scripted preview does not judge understanding."
        : replies[intent];
    reply(200, { text });
  } catch {
    reply(400, { error: "Unreadable preview request" });
  }
});
server.listen(port, "127.0.0.1", () => {
  console.log(`Scripted fictional Tutor ready at http://127.0.0.1:${port}`);
  console.log(
    "This is a fixed pencil-sharing demonstration, not a live Tutor. No model calls are made.",
  );
});
