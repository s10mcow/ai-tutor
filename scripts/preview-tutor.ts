import { createServer } from "node:http";
import type { TutorRequest } from "../lib/tutor-provider.ts";

// A deliberately scripted external service for fictional demonstrations only.
// It neither calls a model nor stores conversation content.
let failNext = false;
const replies = {
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
    reply(200, { text: replies[intent] });
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
