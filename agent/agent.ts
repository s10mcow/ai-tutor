import { defineAgent } from "eve";
import { openai } from "eve/models/openai";

export default defineAgent({
  model: openai("gpt-6.1-sol"),
  defaultTools: false,
  tool: false,
  modelOptions: { providerOptions: { openai: { store: false } } },
  // Ticket 01 establishes family access only. No route or local session can call a model.
  limits: { sessionUsage: () => true, sessionTimeoutMs: 60 * 60 * 1000 },
  experimental: { workflow: { retention: 0 } },
});
