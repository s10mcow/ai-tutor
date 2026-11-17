"use client";
import { useEffect, useRef, useState } from "react";
import type { Learner } from "../../../../lib/family";
import type {
  PortfolioEntry,
  PortfolioSummary,
} from "../../../../lib/portfolio-contract";
import { PortfolioEntryView } from "./portfolio-entry";
import { portfolioRequest } from "./portfolio-request";

export function Portfolio({ learner }: { learner: Learner }) {
  const [entries, setEntries] = useState<PortfolioSummary[]>([]);
  const [selected, setSelected] = useState<PortfolioEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const lifetime = useRef<AbortController | null>(null);
  const url = `/api/learners/${learner.id}/portfolio`;
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    portfolioRequest<{ entries: PortfolioSummary[] }>(url, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setEntries(data.entries);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [url]);
  async function open(id: string) {
    const signal = lifetime.current!.signal;
    setLoading(true);
    setError("");
    try {
      const data = await portfolioRequest<{ entry: PortfolioEntry }>(
        `${url}/${id}`,
        signal,
      );
      if (!signal.aborted) setSelected(data.entry);
    } catch (error) {
      if (!signal.aborted)
        setError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }
  return (
    <section className="portfolio" aria-label="My Portfolio">
      {!selected && (
        <>
          <h2>{learner.name}’s Portfolio</h2>
          <p>
            You choose what to keep and what to explain to your parent. Saved
            work is available even when the Tutor cannot reply.
          </p>
        </>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Opening your Portfolio…</p>
      ) : selected ? (
        <PortfolioEntryView
          key={selected.id}
          entry={selected}
          onBack={() => setSelected(null)}
        />
      ) : entries.length ? (
        <ul className="portfolio-list">
          {entries.map((entry) => (
            <li key={entry.id}>
              <div>
                <h3>{entry.title}</h3>
                <time dateTime={entry.createdAt}>
                  {new Date(entry.createdAt).toLocaleDateString()}
                </time>
              </div>
              <button
                onClick={() => void open(entry.id)}
                aria-label={`Open ${entry.title}`}
              >
                Open entry ↗
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="portfolio-empty">
          Your Portfolio is ready for your first idea. Open Learning, then
          choose “Save Learning evidence” during an activity.
        </p>
      )}
    </section>
  );
}
