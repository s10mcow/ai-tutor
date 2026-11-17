"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { SaveEvidence } from "./save-evidence";
import { TutorAccessNote } from "./model-access";
import type { Learner } from "../../../../lib/family";
import { ActivityDiscovery } from "./activity-discovery";
import type { ActivityLaunch } from "../../../../lib/activity-contract";
import type {
  CoachingInput,
  CoachingIntent,
  LearningSession,
} from "../../../../lib/coaching-contract";

async function sessionRequest(
  url: string,
  signal: AbortSignal,
  body?: unknown,
): Promise<LearningSession | null> {
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    signal,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data.error ?? "Your activity could not be reached. Please try again.",
    );
  return data.session;
}
export function CoachingSession({
  learner,
  draft,
  onDraftChange,
}: {
  learner: Learner;
  draft: string;
  onDraftChange: (draft: string) => void;
}) {
  const [session, setSession] = useState<LearningSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const activityVersion = useRef(0);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [intent, setIntent] = useState<CoachingIntent>("question");
  const [unsent, setUnsent] = useState<CoachingInput | null>(null);
  const [error, setError] = useState("");
  const lifetime = useRef<AbortController | null>(null);
  const conversation = useRef<HTMLOListElement | null>(null);
  const url = `/api/learners/${learner.id}/session`;
  const lastAction = session?.actions.at(-1);
  const failed = lastAction?.status === "failed" ? lastAction : null;
  const waiting = lastAction?.status === "pending";
  const blocked = busy || ending || waiting || !!failed || !!unsent;
  function receive(value: LearningSession | null) {
    setSession(value);
    const last = value?.actions.at(-1);
    setIntent(value?.problem ? "attempt" : "question");
    if (last?.status === "failed") setText(last.text);
    if (!value?.actions.length && value?.activity?.kind === "custom")
      setText(value.activity.starter);
  }
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    sessionRequest(url, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) receive(value);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [url]);
  useEffect(() => {
    if (!waiting || busy || ending) return;
    const version = activityVersion.current;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const value = await sessionRequest(url, controller.signal);
        if (!controller.signal.aborted && version === activityVersion.current)
          receive(value);
      } catch (error) {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error ? error.message : "Please try again.",
          );
      }
      if (!controller.signal.aborted) timer = setTimeout(refresh, 1000);
    }
    timer = setTimeout(refresh, 500);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [url, waiting, busy, ending]);
  useEffect(() => {
    conversation.current?.scrollTo({ top: conversation.current.scrollHeight });
  }, [session]);
  async function start(activity?: ActivityLaunch) {
    const signal = lifetime.current!.signal;
    setBusy(true);
    setError("");
    try {
      const value = await sessionRequest(
        url,
        signal,
        activity ? { activity } : {},
      );
      if (!signal.aborted) receive(value);
    } catch (error) {
      if (!signal.aborted)
        setError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      if (!signal.aborted) setBusy(false);
    }
  }
  async function send(input: CoachingInput) {
    if (!session || busy) return;
    const signal = lifetime.current!.signal;
    const version = activityVersion.current;
    setBusy(true);
    setError("");
    setUnsent(input);
    try {
      const value = await sessionRequest(`${url}/${session.id}`, signal, input);
      if (signal.aborted || version !== activityVersion.current) return;
      receive(value);
      setUnsent(null);
      if (value?.actions.at(-1)?.status === "complete") setText("");
    } catch (error) {
      if (!signal.aborted && version === activityVersion.current)
        setError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      if (!signal.aborted && version === activityVersion.current)
        setBusy(false);
    }
  }
  async function end() {
    if (!session || ending) return;
    const signal = lifetime.current!.signal;
    activityVersion.current += 1;
    setEnding(true);
    setError("");
    try {
      await sessionRequest(`${url}/${session.id}`, signal, { intent: "end" });
      if (!signal.aborted) {
        receive(null);
        setText("");
        setUnsent(null);
        onDraftChange("");
      }
    } catch (error) {
      if (!signal.aborted)
        setError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      if (!signal.aborted) {
        setBusy(false);
        setEnding(false);
      }
    }
  }
  function action(nextIntent: CoachingIntent, nextText: string) {
    void send({ id: crypto.randomUUID(), intent: nextIntent, text: nextText });
  }
  const hasQuestion = !!session?.problem;
  const separateInterest =
    session?.activity?.kind === "biking"
      ? "biking"
      : session?.activity?.kind === "art"
        ? "art"
        : null;
  const submitLabel =
    !hasQuestion || intent === "question"
      ? "Ask Tutor"
      : intent === "correction"
        ? "Correct question"
        : "Share attempt";
  if (!loading && !session)
    return (
      <>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <ActivityDiscovery busy={busy} onChoose={start} />
      </>
    );
  return (
    <div className="work-columns coaching-columns">
      <section className="work-pad" aria-label="Current problem">
        <div className="panel-heading">
          <span className="eyebrow">YOUR THINKING SPACE</span>
          <span aria-hidden="true">↗</span>
        </div>
        {session?.activity && (
          <div className="activity-purpose">
            <strong>{session.activity.title}</strong>
            <p>{session.activity.purpose}</p>
            {separateInterest && hasQuestion && (
              <button
                className="text-button"
                disabled={blocked}
                onClick={() =>
                  action(
                    "question",
                    `Please keep this about ${separateInterest}. I do not want a maths connection.`,
                  )
                }
              >
                Keep this about {separateInterest}
              </button>
            )}
          </div>
        )}
        <h2>{hasQuestion ? "Our question" : "What are you wondering?"}</h2>
        <p className="current-problem">
          {session?.problem ||
            session?.activity?.starter ||
            "Bring a question. There’s room to work it out here."}
        </p>
        <label htmlFor="scratchpad">My scratchpad</label>
        <textarea
          id="scratchpad"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="I could try…"
        />
        <small>
          This scratchpad is temporary. It clears when you leave this workspace.
        </small>
        {session && <SaveEvidence key={session.id} session={session} />}
      </section>
      <section className="tutor-panel coaching-panel" aria-label="Conversation">
        <div className="coaching-heading">
          <div>
            <p className="eyebrow">ONE SMALL STEP AT A TIME</p>
            <h2>Your Tutor</h2>
          </div>
          {session && (
            <button className="text-button" onClick={end} disabled={ending}>
              End activity
            </button>
          )}
        </div>
        <TutorAccessNote />
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {loading ? (
          <p role="status">Opening your activity…</p>
        ) : !session ? (
          <>
            <p>Ask a question, try an idea, and explain your thinking.</p>
            <button className="primary" disabled={busy} onClick={() => start()}>
              Start an activity <span aria-hidden="true">↗</span>
            </button>
          </>
        ) : (
          <>
            <ol
              className="conversation"
              aria-label="Conversation messages"
              aria-live="polite"
              tabIndex={0}
              ref={conversation}
            >
              {session.actions.map((entry) => (
                <li key={entry.id}>
                  <div className="learner-turn">
                    <strong>
                      You{entry.intent === "correction" ? " · correction" : ""}
                    </strong>
                    <p>{entry.text}</p>
                  </div>
                  {entry.reply && (
                    <div className="tutor-turn">
                      <strong>Tutor</strong>
                      <p>{entry.reply}</p>
                    </div>
                  )}
                </li>
              ))}
            </ol>
            {(busy || waiting) && (
              <p role="status">The Tutor is thinking. Your input is saved…</p>
            )}
            {failed && (
              <p role="alert" className="error">
                The Tutor couldn’t reply. This is a service problem, not a mark
                on your answer. Your input is saved. A retry may use more
                allowance; unresolved provider usage stays held. Check Model
                access for details.
              </p>
            )}
            {(failed || unsent) && (
              <button
                className="primary"
                disabled={busy || waiting}
                onClick={() => {
                  const retry = failed ?? unsent;
                  if (retry)
                    void send({
                      id: retry.id,
                      intent: retry.intent,
                      text: retry.text,
                    });
                }}
              >
                Retry reply
              </button>
            )}
            {hasQuestion && (
              <div className="coaching-controls" aria-label="Coaching choices">
                <button
                  disabled={blocked}
                  onClick={() => action("hint", "Please give me a hint.")}
                >
                  Give me a hint
                </button>
                <button
                  disabled={blocked}
                  onClick={() =>
                    action("example", "Please show me an example.")
                  }
                >
                  Show an example
                </button>
                <button
                  disabled={blocked}
                  onClick={() => action("slower", "Please slow down.")}
                >
                  Slow down
                </button>
                <button
                  disabled={blocked}
                  onClick={() =>
                    action("independent", "Let me try independently.")
                  }
                >
                  Let me try
                </button>
              </div>
            )}
            <form
              onSubmit={(event: FormEvent) => {
                event.preventDefault();
                action(intent, text);
              }}
            >
              {hasQuestion && (
                <>
                  <label htmlFor="message-purpose">Message purpose</label>
                  <select
                    id="message-purpose"
                    value={intent}
                    onChange={(event) =>
                      setIntent(event.target.value as CoachingIntent)
                    }
                    disabled={blocked}
                  >
                    <option value="attempt">Share attempt</option>
                    <option value="question">Ask a question</option>
                    <option value="correction">Correct question</option>
                  </select>
                </>
              )}
              <label htmlFor="coaching-text">
                {hasQuestion ? "Your message" : "Your question"}
              </label>
              <textarea
                id="coaching-text"
                value={text}
                onChange={(event) => setText(event.target.value)}
                maxLength={2000}
                required
                disabled={blocked}
              />
              <button className="primary" disabled={blocked || !text.trim()}>
                {submitLabel} <span aria-hidden="true">↗</span>
              </button>
            </form>
            <small>
              This conversation lasts up to 24 hours. End activity clears it
              now. Only work you choose to save stays in your Portfolio.
            </small>
          </>
        )}
      </section>
    </div>
  );
}
