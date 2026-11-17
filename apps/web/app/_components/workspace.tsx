"use client";
import { useState } from "react";
import type { Learner } from "../../../../lib/family";
import { LearningNotesView } from "./learning-notes";
import { Portfolio } from "./portfolio";
import { CoachingSession } from "./coaching-session";

export function Workspace({
  learner,
  onSwitch,
}: {
  learner: Learner;
  onSwitch: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [view, setView] = useState<"learning" | "portfolio" | "notes">(
    "learning",
  );
  return (
    <div className="workspace">
      <aside className="workspace-nav">
        <p className="eyebrow">YOUR SPACE</p>
        <div className="identity">
          <span aria-hidden="true">✳</span>
          <strong>{learner.name}</strong>
        </div>
        <button className="text-button" onClick={onSwitch}>
          Switch Learner <span aria-hidden="true">⇄</span>
        </button>
        <nav className="workspace-views" aria-label="Workspace views">
          <button
            aria-pressed={view === "learning"}
            onClick={() => setView("learning")}
          >
            Learning
          </button>
          <button
            aria-pressed={view === "portfolio"}
            onClick={() => setView("portfolio")}
          >
            My Portfolio
          </button>
          <button
            aria-pressed={view === "notes"}
            onClick={() => setView("notes")}
          >
            Learning notes
          </button>
        </nav>
        <div className="nav-note">
          <span aria-hidden="true">✦</span>
          <p>You don’t have to know the answer to make a start.</p>
        </div>
      </aside>
      <section className="workspace-main">
        <p className="eyebrow">HELLO, CURIOUS MIND</p>
        <h1>{learner.name}’s learning workspace</h1>
        <p className="intro">
          There’s room here for a question, a first try, and a change of mind.
        </p>
        {view === "notes" ? (
          <LearningNotesView learnerId={learner.id} />
        ) : view === "portfolio" ? (
          <Portfolio learner={learner} />
        ) : (
          <>
            <CoachingSession
              learner={learner}
              draft={draft}
              onDraftChange={setDraft}
            />
            <div className="thinking-prompt">
              <span>01</span>
              <p>Ask a question.</p>
              <span>02</span>
              <p>Try an idea.</p>
              <span>03</span>
              <p>Explain your thinking.</p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
