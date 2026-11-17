"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { LearningSession } from "../../../../lib/coaching-contract";
import type { GameInput } from "../../../../lib/maths-game-contract";

export function MathsGame({
  session,
  onChange,
  onEnd,
  ending,
  sessionError,
}: {
  session: LearningSession;
  onChange: (session: LearningSession) => void;
  onEnd: () => void;
  ending: boolean;
  sessionError: string;
}) {
  const [answer, setAnswer] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [unsent, setUnsent] = useState<GameInput | null>(null);
  const lifetime = useRef<AbortController | null>(null);
  const feedback = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => controller.abort();
  }, []);
  const game = session.game;
  const latest = game?.attempts.findLast(
    (attempt) => attempt.round === game.round,
  );
  const blocked = busy || ending || !!unsent;
  async function play(input: GameInput) {
    if (busy || ending) return;
    const signal = lifetime.current!.signal;
    setBusy(true);
    setError("");
    setUnsent(input);
    try {
      const response = await fetch(
        `/api/learners/${session.learnerId}/session/${session.id}/game`,
        {
          method: "POST",
          signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      const data = await response.json();
      if (signal.aborted) return;
      if (!response.ok) {
        // A rejected action was not accepted; allow an edited idea.
        if (response.status < 500) setUnsent(null);
        throw new Error(
          data.error ?? "The game could not check your idea. Please try again.",
        );
      }
      onChange(data.session);
      setUnsent(null);
      if (input.intent === "next" || input.intent === "attempt") {
        setAnswer("");
        setReason("");
      }
      feedback.current?.focus();
    } catch (error) {
      if (!signal.aborted)
        setError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      if (!signal.aborted) setBusy(false);
    }
  }
  return (
    <div className="maths-game">
      <div className="game-heading">
        <div>
          <p className="eyebrow">SHORT MATHS GAME</p>
          <h2>Pack the trays</h2>
        </div>
        <button
          className="text-button"
          onClick={onEnd}
          disabled={busy || ending}
        >
          End activity
        </button>
      </div>
      {!game ? (
        <section className="game-discovery" aria-label="Game starting point">
          <h3>Where shall we start?</h3>
          <p>
            Let’s explore equal sharing: every tray gets the same number of
            tiles, with none left over. Does that sound like a useful puzzle
            today?
          </p>
          <p>
            Choose a starting size. There are just two deliveries, with no
            timer.
          </p>
          <div className="activity-choices">
            <button
              className="activity-choice"
              aria-label="Start with smaller numbers"
              disabled={blocked}
              onClick={() =>
                play({
                  id: crypto.randomUUID(),
                  intent: "choose",
                  level: "smaller",
                })
              }
            >
              <strong>Start with smaller numbers</strong>
              <span>12 tiles and 3 trays. Count or draw your groups.</span>
            </button>
            <button
              className="activity-choice"
              aria-label="Start with bigger numbers"
              disabled={blocked}
              onClick={() =>
                play({
                  id: crypto.randomUUID(),
                  intent: "choose",
                  level: "bigger",
                })
              }
            >
              <strong>Start with bigger numbers</strong>
              <span>24 tiles and 6 trays. Try using multiplication.</span>
            </button>
          </div>
          <button className="text-button" disabled={blocked} onClick={onEnd}>
            Choose a different activity
          </button>
        </section>
      ) : (
        <div className="game-columns">
          <section className="game-challenge" aria-label="Game challenge">
            <p className="eyebrow">
              DELIVERY {game.round + 1} OF 2 ·{" "}
              {game.level === "smaller" ? "SMALLER NUMBERS" : "BIGGER NUMBERS"}
            </p>
            <h3>{game.challenge.prompt}</h3>
            <div
              className="game-trays"
              aria-label={`${game.challenge.trays} trays to fill equally`}
            >
              {Array.from({ length: game.challenge.trays }, (_, index) => (
                <div className="game-tray" key={index}>
                  <span aria-hidden="true">
                    {latest ? `${latest.answer} ▪` : "□"}
                  </span>
                  <small>Tray {index + 1}</small>
                </div>
              ))}
            </div>
            {game.status === "playing" ? (
              <form
                onSubmit={(event: FormEvent) => {
                  event.preventDefault();
                  void play({
                    id: crypto.randomUUID(),
                    intent: "attempt",
                    round: game.round,
                    answer: Number(answer),
                    reason,
                  });
                }}
              >
                <label htmlFor="game-answer">Tiles in each tray</label>
                <input
                  id="game-answer"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  required
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  disabled={blocked}
                />
                <label htmlFor="game-reason">
                  Why did you choose that number?
                </label>
                <textarea
                  id="game-reason"
                  required
                  maxLength={1000}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="I tried… because…"
                  disabled={blocked}
                />
                <small>It’s okay to explain what you are unsure about.</small>
                <button
                  className="primary"
                  disabled={blocked || !answer || !reason.trim()}
                >
                  Check my idea <span aria-hidden="true">↗</span>
                </button>
              </form>
            ) : game.status === "round-complete" ? (
              <button
                className="primary"
                disabled={blocked}
                onClick={() =>
                  play({
                    id: crypto.randomUUID(),
                    intent: "next",
                    round: game.round,
                  })
                }
              >
                Try the next delivery
              </button>
            ) : (
              <div className="game-complete">
                <h3>Game complete</h3>
                <p>You packed both deliveries and explained your ideas.</p>
                <button
                  className="text-button"
                  onClick={onEnd}
                  disabled={blocked}
                >
                  Choose another activity
                </button>
              </div>
            )}
          </section>
          <section className="game-coaching" aria-label="Game coaching">
            <p className="eyebrow">ROOM FOR ANOTHER IDEA</p>
            <h3>A little help</h3>
            <div
              ref={feedback}
              tabIndex={-1}
              aria-live="polite"
              className="game-feedback"
            >
              <p>
                {latest?.feedback ??
                  "Try an idea and tell me why. A first try gives us something to think about."}
              </p>
              {latest && (
                <blockquote>
                  <strong>Your reason</strong>
                  <p>{latest.reason}</p>
                </blockquote>
              )}
              {game.status === "complete" && (
                <p>
                  Your reasons help us explore your thinking. Finishing a game
                  does not tell us everything you understand.
                </p>
              )}
            </div>
            {game.status === "playing" && (
              <div className="coaching-controls">
                <button
                  disabled={
                    blocked || game.help.some((entry) => entry.kind === "hint")
                  }
                  onClick={() =>
                    play({
                      id: crypto.randomUUID(),
                      intent: "help",
                      round: game.round,
                      kind: "hint",
                    })
                  }
                >
                  Give me a hint
                </button>
                <button
                  disabled={
                    blocked ||
                    game.help.some((entry) => entry.kind === "example")
                  }
                  onClick={() =>
                    play({
                      id: crypto.randomUUID(),
                      intent: "help",
                      round: game.round,
                      kind: "example",
                    })
                  }
                >
                  Show an example
                </button>
              </div>
            )}
            {game.help.map((entry) => (
              <div className="game-help" key={entry.kind}>
                <strong>
                  {entry.kind === "hint" ? "Hint" : "A different example"}
                </strong>
                <p>{entry.text}</p>
              </div>
            ))}
            {game.attempts.length > 0 && (
              <details className="game-attempts">
                <summary>Your attempts ({game.attempts.length})</summary>
                <ol>
                  {game.attempts.map((attempt) => (
                    <li key={attempt.id}>
                      <strong>
                        Delivery {attempt.round + 1}: {attempt.answer} in each
                        tray
                      </strong>
                      <p>{attempt.reason}</p>
                      <p>{attempt.feedback}</p>
                      <small>
                        {attempt.help.length
                          ? `Help used: ${attempt.help.join(", ")}`
                          : "No game hint or example used for this attempt."}
                      </small>
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </section>
        </div>
      )}
      {busy && <p role="status">Checking your game…</p>}
      {(error || sessionError) && (
        <p role="alert" className="error">
          {error || sessionError}
        </p>
      )}
      {unsent && !busy && (
        <button className="primary" onClick={() => play(unsent)}>
          Retry game action
        </button>
      )}
      <p className="small game-retention">
        This activity lasts up to 24 hours. End activity clears its temporary
        attempts.
      </p>
    </div>
  );
}
