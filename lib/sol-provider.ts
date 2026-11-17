import type { TutorRequest } from "./tutor-provider.ts";
import { meteredOperation } from "./metered-operation.ts";
import { textReservationNanoUsd } from "./model-access.ts";
import { coachingPolicy } from "./coaching-policy.ts";

export async function solReply(context: TutorRequest): Promise<string> {
  const input = [
    {
      role: "user",
      content: JSON.stringify({
        currentQuestion: context.problem,
        activity: context.activity,
        learningNotes: context.learningNotes,
      }),
    },
    ...context.actions.flatMap((action) => [
      { role: "user", content: `[${action.intent}] ${action.text}` },
      ...(action.reply ? [{ role: "assistant", content: action.reply }] : []),
    ]),
  ];
  const body = JSON.stringify({
    model: "gpt-6.1-sol",
    service_tier: "default",
    store: false,
    background: false,
    max_output_tokens: 2000,
    tools: [],
    prompt_cache_options: { mode: "explicit" },
    truncation: "disabled",
    instructions: coachingPolicy,
    input,
  });
  // This bounds application payload size, not tokens; reservation uses the model maximum.
  if (Buffer.byteLength(body) > 64_000)
    throw new Error("Start a new activity to continue");
  const reply = await meteredOperation<string | null>({
    attemptId: context.attemptId,
    kind: "text",
    pricePolicy: "sol-standard-no-cache-2026-11-16",
    maximumNanoUsd: textReservationNanoUsd,
    dispatch: async (config) => {
      const response = await fetch(config.endpoint, {
        method: "POST",
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.key}`,
          ...(config.projectId
            ? {
                "OpenAI-Project": config.projectId,
                "OpenAI-Organization": config.organizationId!,
              }
            : {}),
        },
        body,
      });
      const requestId = response.headers.get("x-request-id")?.slice(0, 200);
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const code = errorBody?.error?.code;
        const exhausted =
          code === "credit_balance_exhausted" || code === "insufficient_quota";
        return {
          value: null,
          measuredNanoUsd: null,
          requestId,
          blockReason:
            response.status === 401
              ? "credentials_rejected"
              : response.status === 429
                ? exhausted
                  ? "credit_balance_exhausted"
                  : "provider_funding_or_limit"
                : undefined,
        };
      }
      const data = await response.json();
      const usage = data.usage;
      const details = usage?.input_tokens_details;
      const count = (value: unknown): value is number =>
        typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
      const validUsage =
        data.model === "gpt-6.1-sol" &&
        data.service_tier === "default" &&
        count(usage?.input_tokens) &&
        usage.input_tokens <= 922000 &&
        count(usage?.output_tokens) &&
        usage.output_tokens <= 2000 &&
        details?.cached_tokens === 0 &&
        details?.cache_write_tokens === 0 &&
        details?.cache_write_tokens_details?.ttl_30m_tokens === 0 &&
        details?.cache_write_tokens_details?.ttl_12h_tokens === 0 &&
        count(usage?.output_tokens_details?.reasoning_tokens) &&
        usage.output_tokens_details.reasoning_tokens <= usage.output_tokens;
      const long = validUsage && usage.input_tokens > 272000;
      const measuredNanoUsd = validUsage
        ? BigInt(usage.input_tokens) * (long ? 4000n : 2000n) +
          BigInt(usage.output_tokens) * (long ? 15000n : 10000n)
        : null;
      const text = Array.isArray(data.output)
        ? data.output
            .filter((item: any) => item.type === "message")
            .flatMap((item: any) =>
              Array.isArray(item.content) ? item.content : [],
            )
            .filter(
              (part: any) =>
                part.type === "output_text" && typeof part.text === "string",
            )
            .map((part: any) => part.text)
            .join("\n")
            .trim()
        : "";
      return {
        value:
          data.status === "completed" && text && text.length <= 6000
            ? text
            : null,
        measuredNanoUsd,
        requestId,
        responseId:
          typeof data.id === "string" ? data.id.slice(0, 200) : undefined,
        usage: validUsage
          ? {
              inputTokens: usage.input_tokens,
              outputTokens: usage.output_tokens,
              reasoningTokens: usage.output_tokens_details.reasoning_tokens,
              cachedTokens: 0,
              cacheWriteTokens: 0,
            }
          : undefined,
      };
    },
  });
  if (!reply) throw new Error("Tutor reply unavailable");
  return reply;
}
