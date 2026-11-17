"use client";
import { useEffect, useRef, useState } from "react";
import type { PortfolioEntry } from "../../../../lib/portfolio-contract";
import { portfolioRequest } from "./portfolio-request";

export function PortfolioEntryView({
  entry,
  onBack,
}: {
  entry: PortfolioEntry;
  onBack: () => void;
}) {
  const [saved, setSaved] = useState(entry);
  const [reflection, setReflection] = useState(entry.reflection);
  const [editing, setEditing] = useState(false);
  const [showing, setShowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lifetime = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => controller.abort();
  }, []);
  async function saveReflection() {
    const signal = lifetime.current!.signal;
    setBusy(true);
    setError("");
    try {
      const data = await portfolioRequest<{ entry: PortfolioEntry }>(
        `/api/learners/${entry.learnerId}/portfolio/${entry.id}`,
        signal,
        { reflection },
        "PATCH",
      );
      if (!signal.aborted) {
        setSaved(data.entry);
        setEditing(false);
      }
    } catch {
      if (!signal.aborted)
        setError(
          "Your reflection save wasn’t confirmed. Your words are still here; try saving again.",
        );
    } finally {
      if (!signal.aborted) setBusy(false);
    }
  }
  return (
    <section
      className="portfolio-entry"
      aria-label={
        showing ? "Entry to show my parent" : "Selected Portfolio entry"
      }
    >
      <div className="portfolio-entry-actions">
        <button
          className="text-button"
          onClick={showing ? () => setShowing(false) : onBack}
        >
          {showing ? "Back to my entry" : "All my entries"}
        </button>
        {!editing && !showing && (
          <button onClick={() => setShowing(true)}>Show my parent</button>
        )}
      </div>
      {showing && <p className="eyebrow">MY WORK, MY THINKING</p>}
      <h2>{saved.title}</h2>
      <h3>My written work</h3>
      {saved.evidence.map((work) => (
        <blockquote key={work.actionId}>{work.text}</blockquote>
      ))}
      {editing ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void saveReflection();
          }}
        >
          <label htmlFor="saved-reflection">My reflection</label>
          <p className="small" id="saved-reflection-prompt">
            What did you try, why, and what changed your thinking? Keep it in
            your own words.
          </p>
          <textarea
            id="saved-reflection"
            aria-describedby="saved-reflection-prompt"
            value={reflection}
            onChange={(event) => setReflection(event.target.value)}
            maxLength={4000}
            rows={4}
            disabled={busy}
          />
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="portfolio-entry-actions">
            <button className="primary" disabled={busy}>
              {busy ? "Saving…" : "Save reflection"}
            </button>
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => {
                setReflection(saved.reflection);
                setError("");
                setEditing(false);
              }}
            >
              Cancel editing
            </button>
          </div>
        </form>
      ) : (
        <>
          <h3>My reflection</h3>
          <p className="own-words">
            {saved.reflection || "I haven’t added a reflection yet."}
          </p>
          {!showing && (
            <button className="text-button" onClick={() => setEditing(true)}>
              Edit my reflection
            </button>
          )}
        </>
      )}
      {showing && (
        <p className="show-parent-prompt">
          Tell your parent what you tried, what you learned, and what you want
          to try next.
        </p>
      )}
      <small>
        Selected work and reflection in your words. Tutor suggestions are not
        included.
      </small>
    </section>
  );
}
