# Ticket 02 verification and extension contract

## Delivered behavior

The separate `Workspace` / `CoachingSession` interface preserves the parent access, Learner picker, style, and temporary scratchpad from ticket 01. An owned activity supports typed questions, hints, examples, attempts, corrections, slower pacing, independent tries, and ending. The current problem stays beside the conversation. Corrections update the visible problem and the shared provider context; service failures are explicitly separate from assessment of an attempt.

`tests/text-coaching.spec.ts` exercises the browser, real Better Auth, application routes, and a fresh PostgreSQL cluster. Only the external Tutor is controlled over an isolated loopback HTTP service. The initial question, follow-up coaching, failed-reply retry, and retention scenarios each failed before their implementation. Additional scenarios verify ownership and existing lifecycle protections.

## Application operations

- `GET /api/learners/:learnerId/session`: current activity or null.
- `POST /api/learners/:learnerId/session`: start or resume the one current activity, without a provider call.
- `GET /api/learners/:learnerId/session/:sessionId`: read only that owned activity, including pending/failed/completed actions.
- `POST /api/learners/:learnerId/session/:sessionId`: `{ id, intent, text }`, with explicit question/correction/hint/example/attempt/slower/independent intent. `{ intent: "end" }` deletes that activity; repeating end is a harmless no-op.

Every operation derives the family from the authenticated cookie and checks Learner ownership. Existing-session operations also bind the session to the selected path's Learner. All mutations enforce same-origin requests. Opaque IDs grant no authority. A parent account owns both Learners, so their profile choice is a workspace boundary rather than separate child authentication.

`lib/coaching-contract.ts` contains the browser-safe types. `lib/coaching.ts` owns session persistence and action serialization. The row lock is released before external dispatch. `(session_id, action_id)` identifies one Learner turn; retry receives a fresh private `attempt_id`. Pending/completed replay does not dispatch again, and a different payload under the same action ID is rejected. The 30-second orphan recovery interval exceeds the controlled provider's 15-second timeout. A late result can settle only its own still-pending attempt.

## Follow-on boundaries

`lib/tutor-provider.ts` exports `TutorRequest`: family, Learner, session, action and attempt identities plus the corrected problem and ordered context. It is the sole external text dispatch point, currently a development-only controlled HTTP provider. Ticket 03 should attach readiness, reservation-before-dispatch, usage settlement and ambiguous-outcome reconciliation here. A recoverable UI failure must never imply no charge. Production has no provider dispatch in this ticket. `npm run preview:tutor` provides a separate loopback-only manual scripted pencil-sharing service; the README supplies exact demo and one-shot failure commands. It is explicitly not a live Tutor or teaching-quality evaluation.

The installed eve 1.0.1 client, authentication and continuation docs were reviewed. Its routes, default tools, sandbox, traces and model gate remain closed. An eventual eve adapter must persist its owned session/delivery state and authorize every send/stream/control path; clientContext is not authorization. No eve session is created by this ticket.

Tickets 04/05 can extend explicit action context and coaching choices; ticket 06 can load separate bounded learning notes into a new activity; ticket 10 can explicitly select learner-authored actions as evidence before their expiry. Do not repurpose temporary session rows into a permanent transcript archive. Current operations/types are limited to this working flow, rather than speculative hooks for those tickets.

## Retention and activation limitations

The fixed default/max lifetime is 24 hours from creation, bounded to 40 actions, 2,000 input characters and 6,000 reply characters per action. `TUTOR_SESSION_RETENTION_SECONDS` can shorten expiry; tests use five seconds. Reads and sends never extend it. End activity immediately cascades deletion of its actions; old in-flight results cannot recreate a deleted session. Profile switching aborts reads and unmounts Learner state; ending also invalidates pending UI completions.

Logical expiry is enforced on every read/send. Expired rows are deleted during session access and by `npm run sessions:purge`. Hosted activation must schedule the command at least hourly, verify physical deletion while idle, and verify backup retention separately. The scheduler is not provisioned by this code ticket. No long-term notes, Portfolio entries, provider credentials or learner personal data were created.

Hosted acceptance remains open with ticket 01. Controlled scenarios establish application behavior, not teaching quality, provider billing eligibility, approved under-13 retention, or availability independently of the parent's computer. Those external gates remain closed.

## Validation performed

- `npm run test:browser -- tests/text-coaching.spec.ts`: 8 passed with real auth and isolated PostgreSQL.
- `npm run test:browser -- tests/family-workspace.spec.ts -g 'switching Learners clears|trusted browser returns'`: 2 passed, covering the extracted workspace and preserved profile behavior.
- `npm run typecheck`: passed.
- `npm run build`: Next.js and eve builds passed. A subsequent web build with explicit fictional `BETTER_AUTH_URL` / `BETTER_AUTH_SECRET` passed without the missing-config warnings from the unconfigured build.
- The standalone preview service passed a local protocol smoke check for reply, one-shot 503, successful retry, and rejected browser-origin calls.
- The 1440px desktop coaching screenshot was inspected: problem, scratchpad, conversation and controls remain visible in a two-column layout. React guidance was reviewed for component separation, cleanup, ownership, accessibility, and browser-safe imports.

The complete repository suite was not run; validation stayed at the changed ticket and affected ticket 01 scenarios.
