"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Learner } from "../../../../lib/family";
import type {
  PilotReadiness,
  FamilyState,
} from "../../../../lib/model-access-contract";

import { ModelAccessPanel } from "./model-access";
import { Workspace } from "./workspace";

type Family = { learners: Learner[]; selectedLearnerId: string | null };
async function request<T>(
  url: string,
  body?: unknown,
  headers?: Record<string, string>,
): Promise<T> {
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data.error?.message ?? data.error ?? data.message ?? "Please try again.",
    );
  return data;
}

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark" aria-hidden="true">
        ✳
      </span>
      <span>
        Learning Studio<span className="brand-detail">ROOM FOR YOUR IDEAS</span>
      </span>
    </div>
  );
}

export function Studio() {
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [selected, setSelected] = useState<Learner | null>(null);
  const [error, setError] = useState("");
  const [readiness, setReadiness] = useState<PilotReadiness | null>(null);
  useEffect(() => {
    if (!family) {
      setReadiness(null);
      return;
    }
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const response = await fetch("/api/model-access", {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const value = await response.json();
        if (!controller.signal.aborted) setReadiness(value);
      } catch {
        /* The server always rechecks access before a chargeable operation. */
      }
    };
    void refresh();
    const timer = setInterval(refresh, 15000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [family]);
  async function load() {
    const response = await fetch("/api/family");
    if (response.status === 401) {
      setFamily(null);
      return;
    }
    if (!response.ok)
      throw new Error("We couldn’t open your workspace. Please try again.");
    const data: Family = await response.json();
    setFamily(data);
    setSelected(
      data.learners.find((learner) => learner.id === data.selectedLearnerId) ??
        null,
    );
  }
  useEffect(() => {
    load()
      .catch((error) => setError(error.message))
      .finally(() => setLoading(false));
  }, []);
  async function select(learner: Learner | null) {
    setSwitching(true);
    setError("");
    if (!learner) setSelected(null);
    try {
      await request("/api/selection", { learnerId: learner?.id ?? null });
      setSelected(learner);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSwitching(false);
    }
  }
  async function signOut() {
    try {
      await request("/api/auth/sign-out", {});
      setFamily(null);
      setSelected(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again.");
    }
  }
  return (
    <>
      <header className="site-header">
        <Brand />
        <div className="header-actions">
          <span className="preview-label">
            {!family || !readiness
              ? "Private family space"
              : readiness.familyState === "live"
                ? "Family learning"
                : readiness.familyState === "paused"
                  ? "Family AI paused"
                  : "Fictional-data preview"}
          </span>
          {family && <ModelAccessPanel onAccess={setReadiness} />}
          {family && (
            <button
              className="text-button"
              disabled={switching}
              onClick={signOut}
            >
              Sign out
            </button>
          )}
        </div>
      </header>
      <main id="main">
        {error && (
          <div role="alert" className="error">
            {error}
            <button onClick={() => window.location.reload()}>Try again</button>
          </div>
        )}
        {loading ? (
          <p role="status" className="loading">
            Opening your Learning Studio…
          </p>
        ) : !family ? (
          <ParentAccess onSuccess={load} />
        ) : selected ? (
          <Workspace
            key={selected.id}
            learner={selected}
            onSwitch={() => {
              void select(null);
            }}
          />
        ) : (
          <LearnerPicker
            busy={switching}
            family={family}
            onChange={load}
            onSelect={select}
            familyState={readiness?.familyState ?? null}
          />
        )}
      </main>
      <footer className="site-footer">
        <span>A little curiosity can go a long way.</span>
        <span>
          PRIVATE FAMILY SPACE <span aria-hidden="true">↗</span>
        </span>
      </footer>
    </>
  );
}

function ParentAccess({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const [setup, setSetup] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      await request(
        `/api/auth/${setup ? "sign-up" : "sign-in"}/email`,
        {
          email: data.get("email"),
          password: data.get("password"),
          name: "Family parent",
          rememberMe: true,
        },
        setup ? { "x-family-setup-code": String(data.get("code")) } : undefined,
      );
      await onSuccess();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="access-layout">
      <section className="welcome">
        <p className="eyebrow">A SPACE TO THINK FOR YOURSELF</p>
        <h1>
          Big questions.
          <br />
          Small steps.
          <br />
          <em>Your discoveries.</em>
        </h1>
        <p className="intro">
          A quiet place to try an idea, follow your curiosity, and find out what
          you can do.
        </p>
        <div className="idea-art" aria-hidden="true">
          <span className="art-orbit" />
          <span className="art-note">What if…?</span>
          <span className="art-spark">✳</span>
          <span className="art-path">↗</span>
        </div>
      </section>
      <section className="access-card" aria-labelledby="access-title">
        <span className="section-number">01 / COME ON IN</span>
        <h2 id="access-title">
          {setup ? "Make room for your family." : "Welcome back."}
        </h2>
        <p>
          {setup
            ? "One parent account. Separate spaces for each Learner. No child email accounts needed."
            : "Sign in once on a trusted family computer. Each Learner can then return to their own space."}
        </p>
        <form onSubmit={submit}>
          <label htmlFor="parent-email">Parent email</label>
          <input
            id="parent-email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={setup ? "new-password" : "current-password"}
            minLength={12}
            required
          />
          {setup && (
            <>
              <small>Use at least 12 characters.</small>
              <label htmlFor="setup-code">Family setup code</label>
              <input
                id="setup-code"
                name="code"
                type="password"
                autoComplete="off"
                required
              />
              <small>
                Your private invitation keeps family setup closed to others.
              </small>
            </>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button className="primary" disabled={pending}>
            {pending ? "Opening…" : setup ? "Create family account" : "Sign in"}{" "}
            <span aria-hidden="true">↗</span>
          </button>
        </form>
        <button
          className="text-button access-toggle"
          onClick={() => {
            setSetup(!setup);
            setError("");
          }}
        >
          {setup ? "Back to sign in" : "Set up family access"}
        </button>
        <p className="privacy-note">
          After signing in, check Model access before adding personal
          information. Use fictional information until family setup is verified.
        </p>
      </section>
    </div>
  );
}

function LearnerPicker({
  family,
  onChange,
  onSelect,
  busy,
  familyState,
}: {
  familyState: FamilyState | null;
  busy: boolean;
  family: Family;
  onChange: () => Promise<void>;
  onSelect: (learner: Learner) => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = event.currentTarget;
    try {
      await request("/api/learners", { name: new FormData(form).get("name") });
      await onChange();
      form.reset();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="family-page">
      <p className="eyebrow">YOUR FAMILY’S LEARNING STUDIO</p>
      <h1>Who’s learning today?</h1>
      <p className="intro">Choose your space. Bring your questions.</p>
      <div className="learner-grid">
        {family.learners.map((learner, index) => (
          <button
            key={learner.id}
            className={`learner-card tone-${index % 3}`}
            disabled={pending || busy}
            onClick={async () => {
              setPending(true);
              try {
                await onSelect(learner);
              } finally {
                setPending(false);
              }
            }}
            aria-label={`Open ${learner.name}’s workspace`}
          >
            <span className="learner-symbol" aria-hidden="true">
              {["✳", "◒", "◇"][index % 3]}
            </span>
            <span className="learner-name">{learner.name}</span>
            <span>
              Your learning workspace <span aria-hidden="true">↗</span>
            </span>
          </button>
        ))}
      </div>
      <section className="add-learner">
        <div>
          <p className="eyebrow">PARENT SETUP</p>
          <h2>A space of their own.</h2>
          <p>
            {familyState === "setup"
              ? "Add a fictional Learner name for this preview."
              : familyState
                ? "Add a Learner name for your family."
                : "Check Model access before adding personal information."}
          </p>
        </div>
        <form onSubmit={add}>
          <label htmlFor="learner-name">Learner name</label>
          <div className="inline-form">
            <input
              id="learner-name"
              name="name"
              maxLength={40}
              autoComplete="off"
              required
            />
            <button className="primary" disabled={pending || busy}>
              {pending ? "Adding…" : "Add Learner"}
            </button>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </form>
      </section>
      <div className="family-note">
        <span aria-hidden="true">↳</span>
        <p>
          Each Learner has a separate workspace. This trusted browser stays
          signed in for up to 30 days. Sign out when using a shared or public
          computer.
        </p>
      </div>
    </div>
  );
}
