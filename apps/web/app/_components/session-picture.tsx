"use client";
import { useEffect, useRef, useState } from "react";
import type { LearningSession } from "../../../../lib/coaching-contract";
import {
  imageMaximumBytes,
  imageMaximumSize,
  imageUploadSizeError,
} from "../../../../lib/image-contract";

export function SessionPicture({
  session,
  disabled,
  onChange,
}: {
  session: LearningSession;
  disabled: boolean;
  onChange: (session: LearningSession) => void;
}) {
  const picture = session.images[0];
  const base = `/api/learners/${session.learnerId}/session/${session.id}/images`;
  const [expanded, setExpanded] = useState(
    Boolean(picture) ||
      session.activity?.kind === "workbook" ||
      session.activity?.kind === "art",
  );
  const [file, setFile] = useState<File | null>(null);
  const [uploadId, setUploadId] = useState("");
  const [kind, setKind] = useState(
    session.activity?.kind === "art" ? "art" : "workbook",
  );
  const [description, setDescription] = useState(
    picture?.confirmedDescription ?? picture?.interpretation ?? "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [accessMessage, setAccessMessage] = useState("");
  const lifetime = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => controller.abort();
  }, []);
  useEffect(() => {
    setDescription(
      picture?.confirmedDescription ?? picture?.interpretation ?? "",
    );
  }, [picture?.id, picture?.interpretation, picture?.confirmedDescription]);
  async function request(
    id: string,
    method: string,
    body?: BodyInit,
    headers?: HeadersInit,
  ) {
    const retryMessage =
      "The picture could not be reached. Try again, or choose another picture.";
    const response = await fetch(`${base}/${id}`, {
      method,
      body,
      headers,
      signal: lifetime.current!.signal,
    }).catch(() => {
      throw new Error(retryMessage);
    });
    if (response.status === 413) throw new Error(imageUploadSizeError);
    const data = await response.json().catch(() => {
      throw new Error(retryMessage);
    });
    if (!response.ok)
      throw new Error(
        typeof data?.error === "string" ? data.error : retryMessage,
      );
    if (!data?.session) throw new Error(retryMessage);
    if (!lifetime.current!.signal.aborted) onChange(data.session);
    return data.session as LearningSession;
  }
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (error) {
      if (!lifetime.current!.signal.aborted)
        setError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      if (!lifetime.current!.signal.aborted) setBusy(false);
    }
  }
  const waiting = picture?.status === "pending";
  useEffect(() => {
    if (!waiting || busy) return;
    const controller = new AbortController();
    const timer = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/learners/${session.learnerId}/session/${session.id}`,
          { signal: controller.signal },
        );
        const data = await response.json();
        if (response.ok && !controller.signal.aborted) onChange(data.session);
      } catch {
        /* Reload or retry remains available. */
      }
    }, 1000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [waiting, busy, session.learnerId, session.id, onChange]);
  useEffect(() => {
    if (picture?.status !== "failed") return;
    const controller = new AbortController();
    fetch("/api/model-access?operation=image", { signal: controller.signal })
      .then((response) => response.json())
      .then((access) => {
        if (!controller.signal.aborted && access.ready === false)
          setAccessMessage(access.message);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [picture?.status]);
  const locked = disabled || busy || waiting;
  if (!expanded)
    return (
      <button
        className="text-button"
        disabled={disabled}
        onClick={() => setExpanded(true)}
      >
        Attach a picture
      </button>
    );
  return (
    <section
      className="session-picture"
      aria-label="Activity picture"
      data-confirmed={picture?.status === "confirmed"}
    >
      {!picture ? (
        <>
          <label htmlFor="picture-kind">Picture subject</label>
          <select
            id="picture-kind"
            value={kind}
            onChange={(event) => setKind(event.target.value)}
            disabled={locked}
          >
            <option value="workbook">Workbook question</option>
            <option value="art">Paper artwork</option>
          </select>
          <label htmlFor="picture-file">Workbook or artwork picture</label>
          <input
            id="picture-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={locked}
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setUploadId(crypto.randomUUID());
              setError("");
            }}
          />
          <small>
            Still JPEG, PNG or WebP; up to {imageMaximumSize} and 16 million
            pixels.
          </small>
          <button
            disabled={locked || !file}
            onClick={() =>
              void run(async () => {
                if (!file) return;
                if (file.size > imageMaximumBytes)
                  throw new Error(imageUploadSizeError);
                await request(uploadId, "POST", file, {
                  "Content-Type": file.type,
                  "X-Picture-Kind": kind,
                });
                await request(
                  uploadId,
                  "PATCH",
                  JSON.stringify({ operation: "interpret" }),
                  { "Content-Type": "application/json" },
                );
              })
            }
          >
            Read picture
          </button>
        </>
      ) : (
        <>
          <img
            className="attached-picture"
            src={`${base}/${picture.id}`}
            alt={`Attached ${picture.kind} picture`}
          />
          {picture.status === "confirmed" ? (
            <p className="picture-confirmed">
              Picture confirmed. You can ask about it in this conversation.
            </p>
          ) : (
            <>
              {(picture.status === "interpreted" ||
                picture.status === "unreadable") && (
                <>
                  {picture.status === "unreadable" ? (
                    <p role="status">
                      I couldn’t read this picture clearly. Type what it shows
                      below, or remove it and try a clearer picture.
                    </p>
                  ) : (
                    <p>Fix any detail, then confirm what the picture shows.</p>
                  )}
                  <label htmlFor="picture-description">
                    Check the picture description
                  </label>
                  <textarea
                    id="picture-description"
                    maxLength={2000}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    disabled={locked}
                  />
                  <button
                    className="primary"
                    disabled={locked || !description.trim()}
                    onClick={() =>
                      void run(() =>
                        request(
                          picture.id,
                          "PATCH",
                          JSON.stringify({ operation: "confirm", description }),
                          { "Content-Type": "application/json" },
                        ),
                      )
                    }
                  >
                    Confirm picture
                  </button>
                </>
              )}
              {picture.status === "failed" && (
                <p role="alert">
                  The picture could not be interpreted. Your picture is still
                  attached. Check Model access or retry; a retry may use more
                  allowance and unresolved usage stays held. {accessMessage}
                </p>
              )}
              {(picture.status === "uploaded" ||
                picture.status === "failed") && (
                <button
                  disabled={locked}
                  onClick={() =>
                    void run(() =>
                      request(
                        picture.id,
                        "PATCH",
                        JSON.stringify({ operation: "interpret" }),
                        { "Content-Type": "application/json" },
                      ),
                    )
                  }
                >
                  Retry picture interpretation
                </button>
              )}
            </>
          )}
          <button
            className="text-button"
            disabled={disabled || busy}
            onClick={() =>
              void run(async () => {
                await request(picture.id, "DELETE");
                setFile(null);
                setUploadId("");
              })
            }
          >
            Remove picture
          </button>
        </>
      )}
      {(busy || waiting) && <p role="status">Reading your picture…</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <small>
        Temporary activity picture. Ending this activity clears it. Uploading
        does not save it to your Portfolio.
      </small>
    </section>
  );
}
