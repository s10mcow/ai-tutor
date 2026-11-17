"use client";
import { useState, type FormEvent } from "react";
import {
  activityChoices,
  type ActivityLaunch,
} from "../../../../lib/activity-contract";

export function ActivityDiscovery({
  busy,
  onChoose,
}: {
  busy: boolean;
  onChoose: (choice?: ActivityLaunch) => void;
}) {
  const [custom, setCustom] = useState(false);
  const [interest, setInterest] = useState("");
  return (
    <section className="activity-discovery" aria-label="Conversation">
      <p className="eyebrow">A STARTING POINT, CHOSEN BY YOU</p>
      <h2>What interests you today?</h2>
      <p>
        Something you enjoy, something that puzzles you, or something new?
        Choose a starting idea with your Tutor.
      </p>
      {custom ? (
        <form
          className="interest-form"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            onChoose({ kind: "custom", interest });
          }}
        >
          <label htmlFor="new-interest">What are you curious about?</label>
          <input
            id="new-interest"
            value={interest}
            onChange={(event) => setInterest(event.target.value)}
            placeholder="Space, cooking, music, animals…"
            maxLength={120}
            required
            disabled={busy}
          />
          <p className="small">
            The Tutor can help you find a small activity. You can change its
            suggestion.
          </p>
          <button className="primary" disabled={busy || !interest.trim()}>
            Explore this interest
          </button>
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={() => setCustom(false)}
          >
            Back to starting ideas
          </button>
        </form>
      ) : (
        <>
          <div className="activity-choices">
            {activityChoices.map((activity) => (
              <button
                key={activity.kind}
                className="activity-choice"
                aria-label={activity.title}
                disabled={busy}
                onClick={() => onChoose({ kind: activity.kind })}
              >
                <strong>
                  {activity.title} <span aria-hidden="true">↗</span>
                </strong>
                <span>{activity.purpose}</span>
              </button>
            ))}
          </div>
          <button
            className="text-button"
            disabled={busy}
            onClick={() => setCustom(true)}
          >
            None of these — something else
          </button>
        </>
      )}
      <div className="activity-own-question">
        <p>Already have your own question?</p>
        <button
          className="text-button"
          disabled={busy}
          onClick={() => onChoose()}
        >
          Start an activity
        </button>
      </div>
    </section>
  );
}
