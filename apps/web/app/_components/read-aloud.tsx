"use client";
import { useEffect, useRef, useState } from "react";
export function ReadAloud({
  text,
  disabled,
}: {
  text: string;
  disabled: boolean;
}) {
  const generation = useRef(0);
  const [available, setAvailable] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const speech = window.speechSynthesis;
    function changed() {
      const ready = speech
        .getVoices()
        .some(
          (voice) => voice.localService === true && voice.lang.startsWith("en"),
        );
      setAvailable(ready);
      generation.current++;
      speech.cancel();
      setPlaying(false);
    }
    changed();
    speech.addEventListener("voiceschanged", changed);
    const hidden = () => {
      if (document.hidden) {
        generation.current++;
        speech.cancel();
        setPlaying(false);
      }
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      generation.current++;
      document.removeEventListener("visibilitychange", hidden);
      speech.removeEventListener("voiceschanged", changed);
      speech.cancel();
    };
  }, []);
  useEffect(() => {
    generation.current++;
    window.speechSynthesis?.cancel();
    setPlaying(false);
  }, [text, disabled]);
  function play() {
    const speech = window.speechSynthesis;
    const voice = speech
      ?.getVoices()
      .find(
        (voice) => voice.localService === true && voice.lang.startsWith("en"),
      );
    if (!voice) {
      setAvailable(false);
      return;
    }
    const current = ++generation.current;
    speech.cancel();
    setError("");
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.onend = () => {
      if (current === generation.current) setPlaying(false);
    };
    utterance.onerror = () => {
      if (current !== generation.current) return;
      setPlaying(false);
      setError("Read-aloud could not play. Your reply is still here to read.");
    };
    setPlaying(true);
    try {
      speech.speak(utterance);
    } catch {
      setPlaying(false);
      setError("Read-aloud could not play. Your reply is still here to read.");
    }
  }
  return (
    <div className="read-aloud">
      {playing ? (
        <button
          type="button"
          onClick={() => {
            generation.current++;
            window.speechSynthesis.cancel();
            setPlaying(false);
          }}
        >
          Stop reading
        </button>
      ) : (
        <button
          type="button"
          disabled={disabled || !text || !available}
          onClick={play}
        >
          Read latest reply aloud
        </button>
      )}
      {!available && (
        <small>
          Read-aloud needs an English voice installed on this device. Text
          remains available.
        </small>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </div>
  );
}
