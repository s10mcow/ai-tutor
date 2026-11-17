"use client";
import { useId, useRef, useState } from "react";
import type { CoachingIntent } from "../../../../lib/coaching-contract";

const choices: { intent: CoachingIntent; label: string; text: string }[] = [
  { intent: "hint", label: "Give me a hint", text: "Please give me a hint." },
  {
    intent: "example",
    label: "Show an example",
    text: "Please show me an example.",
  },
  { intent: "slower", label: "Slow down", text: "Please slow down." },
  {
    intent: "independent",
    label: "Let me try",
    text: "Let me try independently.",
  },
  {
    intent: "alternative",
    label: "Compare another way",
    text: "Help me compare another possible explanation or strategy.",
  },
  {
    intent: "different",
    label: "Explain differently",
    text: "That approach is not helping yet. Please try a different example or way to explain.",
  },
  {
    intent: "easier",
    label: "Start easier",
    text: "Please give me an easier starting point, one small step at a time.",
  },
  {
    intent: "fresh",
    label: "Fresh challenge",
    text: "Give me one small new challenge to try with less help. Please leave the solution and hints for later.",
  },
];

export function CoachingChoices({
  blocked,
  onAction,
}: {
  blocked: boolean;
  onAction: (intent: CoachingIntent, text: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const choicesId = useId();
  return (
    <div
      className="coaching-controls"
      aria-label="Coaching choices"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setExpanded(false);
          trigger.current?.focus();
        }
      }}
    >
      {choices.slice(0, 2).map((choice) => (
        <button
          key={choice.intent}
          disabled={blocked}
          onClick={() => onAction(choice.intent, choice.text)}
        >
          {choice.label}
        </button>
      ))}
      <button
        ref={trigger}
        aria-expanded={expanded}
        aria-controls={choicesId}
        onClick={() => setExpanded((value) => !value)}
      >
        More coaching choices
      </button>
      {expanded && (
        <div className="coaching-more" id={choicesId}>
          {choices.slice(2).map((choice) => (
            <button
              key={choice.intent}
              disabled={blocked}
              onClick={() => {
                onAction(choice.intent, choice.text);
                setExpanded(false);
                trigger.current?.focus();
              }}
            >
              {choice.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
