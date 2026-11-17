"use client";
import { useEffect, useState } from "react";
import type {
  ModelAccess,
  PilotReadiness,
} from "../../../../lib/model-access-contract";

function dollars(value: string) {
  return `$${(Number(value) / 1e9).toFixed(4)}`;
}
export function ModelAccessPanel({
  onAccess,
}: {
  onAccess: (access: PilotReadiness) => void;
}) {
  const [open, setOpen] = useState(false);
  const [access, setAccess] = useState<PilotReadiness | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch("/api/model-access", {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Model access could not be checked.");
        const value = await response.json();
        if (!controller.signal.aborted) {
          setAccess(value);
          onAccess(value);
          setError("");
        }
      } catch (error) {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error
              ? error.message
              : "Model access could not be checked.",
          );
      }
    }
    void refresh();
    const timer = setInterval(refresh, 15000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [open, onAccess]);
  return (
    <div className="model-access">
      <button
        className="text-button"
        aria-expanded={open}
        onClick={() => {
          setAccess(null);
          setError("");
          setOpen(!open);
        }}
      >
        Model access
      </button>
      {open && (
        <section
          className="model-access-panel"
          aria-label="Model access"
          tabIndex={0}
        >
          <h2>Model access</h2>
          {error ? (
            <p role="alert">{error}</p>
          ) : !access ? (
            <p>Checking access…</p>
          ) : (
            <>
              <p>
                <strong>
                  {access.familyLiveReady
                    ? "Live family access is available"
                    : "Live family access is closed"}
                </strong>
              </p>
              <p>
                {access.familyState === "setup"
                  ? "Family setup incomplete · use fictional information only."
                  : access.familyState === "paused"
                    ? "Family AI paused. Previously saved family work remains available."
                    : "Family setup verified. Each request still checks its allowance and access."}
              </p>
              <p>{access.message}</p>
              {access.mode === "fixture" && (
                <p>Fictional provider fixture · synthetic allowance only.</p>
              )}
              <ul className="readiness-operations">
                {Object.entries(access.operations).map(([kind, operation]) => (
                  <li key={kind}>
                    <strong>
                      {
                        {
                          text: "Text coaching",
                          image: "Picture interpretation",
                          transcription: "Speech transcription",
                          research: "Public-source checks",
                        }[kind]
                      }
                      : {operation.ready ? "Available" : "Unavailable"}
                    </strong>
                    {!operation.ready && <p>{operation.message}</p>}
                  </li>
                ))}
              </ul>
              <p>
                Hosted retention controls:{" "}
                {access.applicationRetention.verified
                  ? "verified"
                  : "unverified"}
                . Local read-aloud and deliberate Portfolio recording do not use
                a model service.
              </p>
              {access.applicationRetention.verified && (
                <p className="small">
                  Temporary activities stop being available after 24 hours.
                  Hourly cleanup deletes expired activities and unsaved pictures
                  from the active database; service failures can delay it.
                  Database recovery history can retain earlier states for up to
                  a further{" "}
                  {access.applicationRetention.recoveryHistorySeconds! / 3600}{" "}
                  hours. Deliberate Portfolio saves remain until deleted.
                </p>
              )}
              <dl className="usage-summary">
                <dt>App allocation</dt>
                <dd>{dollars(access.allowanceNanoUsd)}</dd>
                <dt>Accounted usage</dt>
                <dd>{dollars(access.settledNanoUsd)}</dd>
                <dt>Pending reservations</dt>
                <dd>{dollars(access.reservedNanoUsd)}</dd>
                <dt>Unresolved usage held</dt>
                <dd>{dollars(access.unknownNanoUsd)}</dd>
                <dt>App allowance remaining</dt>
                <dd>{dollars(access.remainingNanoUsd)}</dd>
              </dl>
              <p className="small">
                This is the app meter, not the provider’s live credit balance.
                Each text request needs{" "}
                {dollars(access.nextTextReservationNanoUsd)} available before it
                starts; authoritative usage releases the proven unused
                reservation. Public-source checks need $7.4460 available and
                account tokens at conservative long-context rates, which can
                exceed the provider charge.
              </p>
              {access.checkedAt && (
                <p className="small">
                  Last operator check:{" "}
                  {new Date(access.checkedAt).toLocaleString()}. This records
                  when the evidence was checked; it is not a live balance check.
                  Grant expires: {new Date(access.expiresAt!).toLocaleString()}.
                  Account evidence expires:{" "}
                  {new Date(access.evidenceExpiresAt!).toLocaleString()}.
                  {access.retentionExpiresAt && (
                    <>
                      {" "}
                      Retention approval expires:{" "}
                      {new Date(access.retentionExpiresAt).toLocaleString()}.
                    </>
                  )}
                </p>
              )}
              <p className="small">
                Read-only status from server checks. Account, endpoint approval,
                and hosted retention evidence are recorded by the operator after
                verification. Saved work stays available.
              </p>
            </>
          )}
        </section>
      )}
    </div>
  );
}

export function TutorAccessNote() {
  const [access, setAccess] = useState<ModelAccess | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/model-access?operation=text", { signal: controller.signal })
      .then(async (response) => {
        if (response.ok) return response.json();
        return null;
      })
      .then((value) => {
        if (!controller.signal.aborted) setAccess(value);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return (
    <p className="small">
      {access?.mode === "scripted"
        ? "Scripted Tutor preview · fictional practice only."
        : access?.mode === "fixture"
          ? "Controlled Sol fixture · fictional practice only."
          : access?.liveReady
            ? "GPT-6.1 Sol · measured against the family app allowance."
            : "Live Tutor access is closed. See Model access for readiness."}
    </p>
  );
}
