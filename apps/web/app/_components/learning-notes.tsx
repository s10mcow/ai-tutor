"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type {
  LearningNotes,
  LearningNotesInput,
} from "../../../../lib/learning-notes-contract";

async function notesRequest(
  learnerId: string,
  signal: AbortSignal,
  method = "GET",
  input?: unknown,
): Promise<LearningNotes | null> {
  const response = await fetch(`/api/learners/${learnerId}/notes`, {
    method,
    signal,
    headers: { "Content-Type": "application/json" },
    body: input ? JSON.stringify(input) : undefined,
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data.error ?? "Learning notes could not be reached. Please try again.",
    );
  return data.notes;
}
function useNotes(learnerId: string) {
  const [notes, setNotes] = useState<LearningNotes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    notesRequest(learnerId, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setNotes(value);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [learnerId]);
  return { notes, setNotes, loading, error };
}
export function ReturnVisit({
  learnerId,
  busy,
  onResume,
  children,
}: {
  learnerId: string;
  busy: boolean;
  onResume: () => void;
  children: ReactNode;
}) {
  const { notes, loading, error } = useNotes(learnerId);
  const [chooseNew, setChooseNew] = useState(false);
  if (loading) return <p role="status">Opening your learning choices…</p>;
  if (!notes?.nextStep || chooseNew)
    return (
      <>
        {error && (
          <p role="alert">{error} You can still choose a new activity.</p>
        )}
        {children}
      </>
    );
  return (
    <section className="continuity-panel" aria-label="Learning continuity">
      <p className="eyebrow">YOUR IDEA FOR NEXT TIME</p>
      <h2>Pick up where you left off?</h2>
      <p className="next-step">{notes.nextStep}</p>
      <p>
        This is a note you chose to keep. You can change it in Learning notes,
        or follow a new curiosity.
      </p>
      <div className="coaching-controls">
        <button className="primary" disabled={busy} onClick={onResume}>
          Continue my next step
        </button>
        <button disabled={busy} onClick={() => setChooseNew(true)}>
          Choose something new
        </button>
      </div>
    </section>
  );
}
export function RememberNotes({
  learnerId,
  sessionId,
}: {
  learnerId: string;
  sessionId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <div className="save-evidence">
      <button
        onClick={() => {
          setSaved(false);
          setEditing(true);
        }}
      >
        Remember for next time
      </button>
      {saved && (
        <p role="status">
          Learning notes saved. You can edit or clear them in Learning notes.
        </p>
      )}
      {editing && (
        <NotesDialog
          learnerId={learnerId}
          sessionId={sessionId}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            setSaved(true);
          }}
        />
      )}
    </div>
  );
}
function NotesDialog({
  learnerId,
  sessionId,
  onClose,
  onSaved,
}: {
  learnerId: string;
  sessionId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      className="evidence-dialog notes-dialog"
      ref={dialog}
      aria-label="Remember for next time"
      onCancel={onClose}
    >
      <div className="coaching-heading">
        <h2>Remember for next time</h2>
        <button className="text-button" onClick={onClose}>
          Close
        </button>
      </div>
      <LearningNotesView
        learnerId={learnerId}
        sessionId={sessionId}
        onSaved={onSaved}
      />
    </dialog>
  );
}
export function LearningNotesView({
  learnerId,
  sessionId,
  onSaved,
}: {
  learnerId: string;
  sessionId?: string;
  onSaved?: () => void;
}) {
  const { notes, setNotes, loading, error } = useNotes(learnerId);
  if (loading) return <p role="status">Opening learning notes…</p>;
  if (error)
    return <p role="alert">{error} Reopen Learning notes to try again.</p>;
  return (
    <section className="learning-notes" aria-label="Learning notes">
      {!sessionId && <h2>Learning notes</h2>}
      <p>
        These are your own short statements, saved by you for future visits.
        Keep what you actually noticed or found helpful; this is not a grade or
        a claim of mastery.
      </p>
      {!notes && !sessionId ? (
        <p>
          No notes saved yet. After an exchange, choose Remember for next time
          in your activity.
        </p>
      ) : (
        <NotesEditor
          learnerId={learnerId}
          sessionId={sessionId}
          notes={notes}
          onSaved={(value) => {
            setNotes(value);
            onSaved?.();
          }}
        />
      )}
      <small>
        Only these three notes stay here, up to 240 characters each. Saving
        replaces earlier notes. Your conversation and recordings are not copied;
        Portfolio work is saved separately.
      </small>
    </section>
  );
}
function NotesEditor({
  learnerId,
  sessionId,
  notes,
  onSaved,
}: {
  learnerId: string;
  sessionId?: string;
  notes: LearningNotes | null;
  onSaved: (notes: LearningNotes | null) => void;
}) {
  const [input, setInput] = useState<LearningNotesInput>({
    interest: notes?.interest ?? "",
    helpfulApproach: notes?.helpfulApproach ?? "",
    nextStep: notes?.nextStep ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const lifetime = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => controller.abort();
  }, []);
  async function save() {
    const signal = lifetime.current!.signal;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const result = await notesRequest(learnerId, signal, "PUT", {
        ...input,
        ...(sessionId ? { sessionId } : {}),
      });
      if (!signal.aborted) {
        setSaved(true);
        onSaved(result);
      }
    } catch (error) {
      if (!signal.aborted)
        setError(
          error instanceof Error
            ? error.message
            : "Your save wasn’t confirmed. Try again.",
        );
    } finally {
      if (!signal.aborted) setBusy(false);
    }
  }
  async function clear() {
    const signal = lifetime.current!.signal;
    setBusy(true);
    setError("");
    try {
      await notesRequest(learnerId, signal, "DELETE");
      if (!signal.aborted) onSaved(null);
    } catch (error) {
      if (!signal.aborted)
        setError(
          error instanceof Error
            ? error.message
            : "Clearing notes wasn’t confirmed. Try again.",
        );
    } finally {
      if (!signal.aborted) setBusy(false);
    }
  }
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {saved && <p role="status">Learning notes saved.</p>}
      {(
        [
          ["interest", "An interest I mentioned"],
          ["helpfulApproach", "An approach that helped me"],
          ["nextStep", "A possible next step"],
        ] as const
      ).map(([key, label]) => (
        <div key={key}>
          <label htmlFor={`note-${key}`}>{label}</label>
          <textarea
            id={`note-${key}`}
            maxLength={240}
            value={input[key]}
            disabled={busy}
            onChange={(event) => {
              setSaved(false);
              setInput({ ...input, [key]: event.target.value });
            }}
          />
        </div>
      ))}
      <p>
        Leave any box blank if you are unsure. By saving, you confirm these are
        your words about this learning.
      </p>
      <div className="coaching-controls">
        <button
          className="primary"
          disabled={busy || !Object.values(input).some((value) => value.trim())}
        >
          Save learning notes
        </button>
        {notes && !sessionId && (
          <button type="button" disabled={busy} onClick={() => void clear()}>
            Clear learning notes
          </button>
        )}
      </div>
    </form>
  );
}
