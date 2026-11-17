"use client";
import { useEffect, useRef, useState } from "react";
import type { LearningSession } from "../../../../lib/coaching-contract";
import {
  canSaveWrittenAction,
  type PortfolioEntry,
  type WrittenEvidenceInput,
} from "../../../../lib/portfolio-contract";
import { portfolioRequest } from "./portfolio-request";

export function SaveEvidence({ session }: { session: LearningSession }) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  if (!session.actions.some(canSaveWrittenAction))
    return session.actions.length ? (
      <small>
        Use “Share attempt” for your own explanation, discovery, or first try.
        Then choose what to keep in your Portfolio.
      </small>
    ) : null;
  return (
    <div className="save-evidence">
      <button
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
  const [title, setTitle] = useState("");
  const [reflection, setReflection] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<WrittenEvidenceInput | null>(null);
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
    const input: WrittenEvidenceInput = pending ?? {
      id: crypto.randomUUID(),
      sessionId: session.id,
      actionIds: selected,
      title,
      reflection,
    };
    setPending(input);
    try {
      await portfolioRequest<{ entry: PortfolioEntry }>(
        `/api/learners/${session.learnerId}/portfolio`,
        signal,
        input,
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
        <p>
          Keep an attempt, explanation, or discovery. Only the work you select
          and your reflection will be saved.
        </p>
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
          What did you try? Why? What changed your thinking? Use your own words;
          you can edit them later.
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
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button
          className="primary"
          disabled={busy || !selected.length || !title.trim()}
        >
          {busy ? "Saving…" : pending ? "Retry save" : "Save to Portfolio"}
        </button>
        <small>Tutor suggestions are not saved as your work.</small>
      </form>
    </dialog>
  );
}
