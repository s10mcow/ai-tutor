"use client";
import { useEffect, useRef, useState } from "react";
import type { LearningSession } from "../../../../lib/coaching-contract";
import {
  canSaveWrittenAction,
  type PortfolioEntry,
  type WrittenEvidenceInput,
} from "../../../../lib/portfolio-contract";
import { SpokenReflection } from "./spoken-reflection";
import { portfolioRequest } from "./portfolio-request";

export function SaveEvidence({
  session,
  disabled = false,
}: {
  session: LearningSession;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <div className="save-evidence">
      <button
        disabled={disabled}
        onClick={() => {
          setSaved(false);
          setEditing(true);
        }}
      >
        Save Learning evidence
      </button>
      {saved && (
        <p role="status">
          Saved to your Portfolio. Open My Portfolio to revisit it.
        </p>
      )}
      {editing && (
        <EvidenceEditor
          session={session}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setSaved(true);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}
function EvidenceEditor({
  session,
  onClose,
  onSaved,
}: {
  session: LearningSession;
  onClose: () => void;
  onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const lifetime = useRef<AbortController | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedPictures, setSelectedPictures] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [reflection, setReflection] = useState("");
  const [audio, setAudio] = useState<Blob | null>(null);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<{
    input: WrittenEvidenceInput;
    audio: Blob | null;
  } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    dialog.current?.showModal();
    return () => controller.abort();
  }, []);
  async function save() {
    const signal = lifetime.current!.signal;
    setBusy(true);
    setError("");
    const input: WrittenEvidenceInput = pending?.input ?? {
      id: crypto.randomUUID(),
      sessionId: session.id,
      actionIds: selected,
      ...(selectedPictures.length ? { imageIds: selectedPictures } : {}),
      title,
      reflection,
    };
    const recordingToSave = pending ? pending.audio : audio;
    setPending({ input, audio: recordingToSave });
    const body = recordingToSave ? new FormData() : input;
    if (body instanceof FormData) {
      body.set("input", JSON.stringify(input));
      body.set("audio", recordingToSave!, "reflection.wav");
    }
    try {
      await portfolioRequest<{ entry: PortfolioEntry }>(
        `/api/learners/${session.learnerId}/portfolio`,
        signal,
        body,
      );
      if (!signal.aborted) onSaved();
    } catch (error) {
      if (!signal.aborted)
        setError(
          `Your save wasn’t confirmed. Retry the same save safely. ${error instanceof TypeError ? "Check your connection and try again." : error instanceof Error ? error.message : "Please try again."}`,
        );
    } finally {
      if (!signal.aborted) setBusy(false);
    }
  }
  return (
    <dialog
      className="evidence-dialog"
      ref={dialog}
      aria-labelledby="evidence-title"
      onCancel={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div className="coaching-heading">
          <h2 id="evidence-title">Choose what to keep</h2>
          <button type="button" className="text-button" onClick={onClose}>
            Close
          </button>
        </div>
        <p>Choose your own work or record a reflection to keep.</p>
        {session.images.length > 0 && (
          <fieldset disabled={busy || !!pending} className="evidence-choices">
            <legend>My picture</legend>
            {session.images.map((picture) => (
              <label key={picture.id}>
                <input
                  type="checkbox"
                  checked={selectedPictures.includes(picture.id)}
                  onChange={(event) =>
                    setSelectedPictures(
                      event.target.checked ? [picture.id] : [],
                    )
                  }
                />
                <span>Keep this {picture.kind} picture</span>
                <img
                  className="evidence-picture-preview"
                  src={`/api/learners/${session.learnerId}/session/${session.id}/images/${picture.id}`}
                  alt=""
                />
              </label>
            ))}
            <p>
              Add your own reflection or select your written explanation to go
              with your picture.
            </p>
          </fieldset>
        )}
        {session.actions.some(canSaveWrittenAction) && (
          <fieldset disabled={busy || !!pending} className="evidence-choices">
            <legend>My written work</legend>
            {session.actions.filter(canSaveWrittenAction).map((action) => (
              <label key={action.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(action.id)}
                  onChange={(event) =>
                    setSelected((current) =>
                      event.target.checked
                        ? [...current, action.id]
                        : current.filter((id) => id !== action.id),
                    )
                  }
                />
                <span>{action.text}</span>
              </label>
            ))}
          </fieldset>
        )}
        <label htmlFor="evidence-entry-title">Entry title</label>
        <input
          id="evidence-entry-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={100}
          required
          disabled={busy || !!pending}
        />
        <label htmlFor="evidence-reflection">My reflection</label>
        <p id="reflection-prompt" className="small">
          What did you try, why, and what changed? Writing is optional with a
          spoken reflection.
        </p>
        <textarea
          id="evidence-reflection"
          aria-describedby="reflection-prompt"
          value={reflection}
          onChange={(event) => setReflection(event.target.value)}
          maxLength={4000}
          rows={3}
          disabled={busy || !!pending}
        />
        <SpokenReflection
          disabled={busy || !!pending}
          onChange={setAudio}
          onActive={setRecording}
        />
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="evidence-save-actions">
          <button
            className="primary"
            disabled={
              busy ||
              recording ||
              (!pending &&
                !audio &&
                !selected.length &&
                (!selectedPictures.length || !reflection.trim())) ||
              !title.trim()
            }
          >
            {busy ? "Saving…" : pending ? "Retry save" : "Save to Portfolio"}
          </button>
          <small>Tutor suggestions are not saved as your work.</small>
        </div>
      </form>
    </dialog>
  );
}
