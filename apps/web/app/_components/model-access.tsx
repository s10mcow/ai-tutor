"use client";
import { useEffect, useState } from "react";
import type { ModelAccess } from "../../../../lib/model-access-contract";

function dollars(value: string) {
  return `$${(Number(value) / 1e9).toFixed(4)}`;
}
export function ModelAccessPanel() {
  const [open, setOpen] = useState(false);
  const [access, setAccess] = useState<ModelAccess | null>(null);
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
  }, [open]);
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
                  {access.liveReady
                    ? "Live family access is available"
                    : "Live family access is closed"}
                </strong>
              </p>
              <p>{access.message}</p>
              {access.mode === "fixture" && (
                <p>Fictional provider fixture · synthetic allowance only.</p>
              )}
              <dl className="usage-summary">
                <dt>App allocation</dt>
                <dd>{dollars(access.allowanceNanoUsd)}</dd>
                <dt>Measured usage</dt>
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
                starts; measured usage releases the unused reservation.
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
                Read-only status. Funding and retention approval are verified by
                the parent through server configuration. Saved work stays
                available.
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
    fetch("/api/model-access", { signal: controller.signal })
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
