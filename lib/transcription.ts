import { validateRecording } from "./audio-recording.ts";
import { createHash } from "node:crypto";
import { AccessError, selectedLearnerId, type FamilyAccess } from "./family.ts";
import { readSession } from "./coaching.ts";
import { meteredOperation } from "./metered-operation.ts";
import {
  audioMaximumBytes,
  audioMaximumSeconds,
  transcriptionPricePolicy,
  transcriptionReservationNanoUsd,
} from "./audio-contract.ts";

export async function boundedRecording(request: Request) {
  if (request.headers.get("content-type") !== "audio/wav")
    throw new AccessError(
      415,
      "This recording format is unavailable. You can still type.",
    );
  const reader = request.body?.getReader();
  if (!reader) throw new AccessError(400, "No recording was received.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > audioMaximumBytes) {
        await reader.cancel();
        throw new AccessError(413, "Record no more than 60 seconds at a time.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = Buffer.concat(chunks);
  const durationSeconds = validateRecording(bytes);
  return { bytes, durationSeconds };
}
export async function transcribeRecording(
  access: FamilyAccess,
  learnerId: string,
  sessionId: string,
  request: Request,
) {
  const session = await readSession(access, learnerId, sessionId);
  if (session.activity?.kind === "maths-game")
    throw new AccessError(400, "Use the game controls for this activity.");
  if (session.breakState?.paused)
    throw new AccessError(
      409,
      "Resume the activity before recording a message.",
    );
  const id = request.headers.get("x-recording-id") ?? "";
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(id))
    throw new AccessError(400, "Start a new recording.");
  const { bytes, durationSeconds } = await boundedRecording(request);
  const attemptId = createHash("sha256")
    .update(
      JSON.stringify([
        "transcription",
        access.familyId,
        learnerId,
        sessionId,
        id,
      ]),
    )
    .digest("hex");
  const beforeDispatch = await readSession(access, learnerId, sessionId);
  if (
    request.signal.aborted ||
    beforeDispatch.breakState?.paused ||
    beforeDispatch.breakRevision !== session.breakRevision
  )
    throw new AccessError(
      409,
      "The activity changed. The recording was discarded.",
    );
  let text: string | null;
  try {
    text = await meteredOperation<string | null>({
      attemptId,
      kind: "transcription",
      pricePolicy: transcriptionPricePolicy,
      maximumNanoUsd: transcriptionReservationNanoUsd,
      dispatch: async (config) => {
        const form = new FormData();
        form.set("model", "gpt-transcribe");
        form.set("response_format", "json");
        form.set(
          "file",
          new Blob([new Uint8Array(bytes)], { type: "audio/wav" }),
          "message.wav",
        );
        const response = await fetch(
          new URL("/v1/audio/transcriptions", config.endpoint),
          {
            method: "POST",
            body: form,
            cache: "no-store",
            redirect: "error",
            signal: AbortSignal.timeout(15_000),
            headers: {
              Authorization: `Bearer ${config.key}`,
              ...(config.projectId
                ? {
                    "OpenAI-Project": config.projectId,
                    "OpenAI-Organization": config.organizationId!,
                  }
                : {}),
            },
          },
        );
        const data = await response.json();
        const seconds: unknown = data?.usage?.seconds;
        const validUsage =
          response.ok &&
          data?.usage?.type === "duration" &&
          typeof seconds === "number" &&
          Number.isFinite(seconds) &&
          seconds > 0 &&
          seconds <= audioMaximumSeconds &&
          Math.abs(seconds - durationSeconds) <= 1;
        const accountedSeconds = validUsage
          ? Math.ceil(Math.max(seconds as number, durationSeconds))
          : null;
        // Round up a fractional second rather than under-accounting. Missing or
        // incompatible usage retains the entire minute reservation for reconciliation.
        const measuredNanoUsd = validUsage
          ? BigInt(accountedSeconds!) * 75_000n
          : null;
        return {
          value:
            response.ok &&
            typeof data?.text === "string" &&
            data.text.trim().length > 0 &&
            data.text.trim().length <= 2000
              ? data.text.trim()
              : null,
          measuredNanoUsd,
          usage: validUsage
            ? {
                type: "duration",
                seconds,
                accountedSeconds,
                validatedSeconds: durationSeconds,
              }
            : undefined,
          requestId: response.headers.get("x-request-id") ?? undefined,
          blockReason: [401, 403, 429].includes(response.status)
            ? "speech_provider_access_rejected"
            : undefined,
        };
      },
    });
  } catch {
    throw new AccessError(
      503,
      "Transcription is unavailable or this recording was already submitted. You can type or make a new recording. An uncertain request keeps its allowance held; another recording may use more.",
    );
  }
  const latest = await readSession(access, learnerId, sessionId);
  if (
    request.signal.aborted ||
    latest.breakState?.paused ||
    latest.breakRevision !== session.breakRevision
  )
    throw new AccessError(
      409,
      "The activity changed. The transcription was discarded.",
    );
  if ((await selectedLearnerId(access)) !== learnerId)
    throw new AccessError(
      409,
      "The Learner changed. The transcription was discarded.",
    );
  if (!text)
    throw new AccessError(
      503,
      "Speech could not be transcribed. Try a shorter recording or type your message.",
    );
  return { text };
}
