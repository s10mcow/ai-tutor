"use client";
import { useEffect, useRef, useState } from "react";
import { audioSampleRate } from "../../../../lib/audio-contract";
import { startAudioCapture, type AudioCapture } from "./audio-capture";

export function SpokenReflection({
  disabled,
  onChange,
  onActive,
}: {
  disabled: boolean;
  onChange: (audio: Blob | null) => void;
  onActive: (active: boolean) => void;
}) {
  const [state, setState] = useState<
    "idle" | "permission" | "recording" | "review"
  >("idle");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const capture = useRef<AudioCapture | null>(null);
  const request = useRef<AbortController | null>(null);
  const preview = useRef<HTMLAudioElement>(null);
  const objectUrl = useRef("");
  function stopCapture() {
    request.current?.abort();
    capture.current?.cancel();
    capture.current = null;
    onActive(false);
  }
  function discard() {
    stopCapture();
    preview.current?.pause();
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = "";
    setUrl("");
    setState("idle");
    onChange(null);
  }
  useEffect(() => {
    const hidden = () => {
      if (!document.hidden) return;
      preview.current?.pause();
      if (capture.current || (request.current && !objectUrl.current)) {
        discard();
        setError(
          "Recording stopped when you left this tab. Record again when you’re ready.",
        );
      }
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      request.current?.abort();
      capture.current?.cancel();
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
  }, []);
  function finish() {
    if (!capture.current) return;
    const blob = capture.current.stop();
    capture.current = null;
    onActive(false);
    if (blob.size < 44 + audioSampleRate / 2) {
      setState("idle");
      setError(
        "That recording was too short. Speak for at least a quarter second, then stop and review.",
      );
      return;
    }
    objectUrl.current = URL.createObjectURL(blob);
    setUrl(objectUrl.current);
    onChange(blob);
    setState("review");
  }
  async function record() {
    discard();
    setError("");
    setState("permission");
    onActive(true);
    window.speechSynthesis?.cancel();
    const controller = new AbortController();
    request.current = controller;
    try {
      const result = await startAudioCapture(controller.signal, finish);
      if (controller.signal.aborted) {
        result.cancel();
        return;
      }
      capture.current = result;
      setState("recording");
    } catch (error) {
      if (controller.signal.aborted) return;
      setState("idle");
      onActive(false);
      setError(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Microphone permission was denied. Allow it in your browser settings, or choose written work."
          : error instanceof Error
            ? error.message
            : "Recording failed. Try again or choose written work.",
      );
    }
  }
  return (
    <section
      className="spoken-reflection"
      aria-label="Spoken Portfolio reflection"
    >
      <h3>My spoken reflection</h3>
      <p className="small">
        Make a new recording of your thinking, separate from speaking to the
        Tutor. Listen first; only Save to Portfolio keeps it.
      </p>
      {state === "idle" && (
        <button type="button" disabled={disabled} onClick={record}>
          Record a reflection to keep
        </button>
      )}
      {state === "permission" && (
        <p role="status">Waiting for microphone permission…</p>
      )}
      {state === "recording" && (
        <>
          <p role="status">Recording your reflection · up to 60 seconds</p>
          <button type="button" onClick={finish}>
            Stop and review reflection
          </button>
        </>
      )}
      {state === "review" && (
        <>
          <audio
            ref={preview}
            controls
            preload="metadata"
            src={url}
            aria-label="Review spoken reflection"
            onError={() => {
              onChange(null);
              setError(
                disabled
                  ? "Preview playback is unavailable. Your submitted recording is unchanged; retry the save if needed."
                  : "Playback failed. Discard this recording and try again before saving.",
              );
            }}
          />
        </>
      )}
      {state !== "idle" && (
        <button type="button" disabled={disabled} onClick={discard}>
          Discard reflection recording
        </button>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </section>
  );
}
