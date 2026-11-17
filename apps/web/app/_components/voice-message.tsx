"use client";
import { useEffect, useRef, useState } from "react";
import { startAudioCapture, type AudioCapture } from "./audio-capture";
export function VoiceMessage({
  url,
  disabled,
  onUse,
  onActive,
  onReview,
}: {
  url: string;
  disabled: boolean;
  onUse: (text: string) => void;
  onActive: (active: boolean) => void;
  onReview: (review: boolean) => void;
}) {
  const [state, setState] = useState<
    "idle" | "permission" | "recording" | "transcribing" | "review"
  >("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const capture = useRef<AudioCapture | null>(null);
  const request = useRef<AbortController | null>(null);
  function cancel() {
    request.current?.abort();
    capture.current?.cancel();
    capture.current = null;
    setState("idle");
    setTranscript("");
  }
  useEffect(() => {
    onReview(state === "review");
    return () => onReview(false);
  }, [state, onReview]);
  useEffect(() => {
    onActive(state === "permission" || state === "recording");
    return () => onActive(false);
  }, [state, onActive]);
  useEffect(() => {
    if (disabled) cancel();
  }, [disabled]);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) cancel();
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      request.current?.abort();
      capture.current?.cancel();
    };
  }, [url]);
  async function finish() {
    const controller = request.current;
    if (!capture.current || !controller || controller.signal.aborted) return;
    const audio = capture.current.stop();
    capture.current = null;
    setState("transcribing");
    try {
      const response = await fetch(`${url}/transcription`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "audio/wav",
          "X-Recording-Id": crypto.randomUUID(),
        },
        body: audio,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error ?? "Speech is unavailable. You can still type.",
        );
      if (!controller.signal.aborted) {
        setTranscript(data.text);
        setState("review");
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setState("idle");
        setError(
          error instanceof Error
            ? error.message
            : "Speech is unavailable. You can still type.",
        );
      }
    }
  }
  async function record() {
    cancel();
    setError("");
    setState("permission");
    const controller = new AbortController();
    request.current = controller;
    try {
      const result = await startAudioCapture(
        controller.signal,
        () => void finish(),
      );
      if (controller.signal.aborted) {
        result.cancel();
        return;
      }
      capture.current = result;
      setState("recording");
    } catch (error) {
      if (!controller.signal.aborted) {
        setState("idle");
        setError(
          error instanceof DOMException && error.name === "NotAllowedError"
            ? "Microphone permission was denied. Allow it in your browser settings, or keep typing."
            : error instanceof Error
              ? error.message
              : "Microphone unavailable. You can still type.",
        );
      }
    }
  }
  return (
    <div className="voice-message" aria-label="Spoken message">
      {state === "idle" && (
        <button type="button" disabled={disabled} onClick={record}>
          Record a message
        </button>
      )}
      {state === "permission" && (
        <p role="status">Waiting for microphone permission…</p>
      )}
      {state === "recording" && (
        <>
          <p role="status">Recording · up to 60 seconds</p>
          <button type="button" onClick={finish}>
            Stop and transcribe
          </button>
        </>
      )}
      {state === "transcribing" && (
        <p role="status">Transcribing your message…</p>
      )}
      {state === "review" && (
        <>
          <label htmlFor="transcript">Review your transcription</label>
          <textarea
            id="transcript"
            value={transcript}
            maxLength={2000}
            onChange={(event) => setTranscript(event.target.value)}
          />
          <p>Check and correct these words before sending.</p>
          <button
            type="button"
            disabled={!transcript.trim()}
            onClick={() => {
              onUse(transcript);
              cancel();
            }}
          >
            Use this text
          </button>
        </>
      )}
      {state !== "idle" && (
        <button type="button" onClick={cancel}>
          Discard recording
        </button>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <small>Audio is temporary. Check the words before sending.</small>
    </div>
  );
}
