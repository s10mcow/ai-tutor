# Ticket 10 verification and extension contract

## Delivered behavior

A Learner deliberately selects one or more **Share attempt** messages, gives the entry a title, and adds an optional reflection in their own words. Explanations, solutions, discoveries and unfinished attempts use that same input. Reflection prompts ask what was tried, why, and what changed; they do not generate the Learner’s answer. Saved reflections remain editable. Questions, corrections and app-suggested launch/control requests are excluded from evidence selection. `action.text` alone is insufficient proof of authorship because some controls supply suggested request text.

Only selected attempt text is copied from the server-owned source activity. Tutor `reply`, unselected messages, the conversation and scratchpad are not copied. Entries survive source-session end and expiry, web-process restart and a fresh authenticated visit. **My Portfolio** is a separate workspace view; an entry opens individually and **Show my parent** presents that entry for the Learner to explain. No publishing, messages or automatic parent reports occur.

## Application operations

- `GET /api/learners/:learnerId/portfolio` returns entry summaries: ID, title and creation date.
- `POST /api/learners/:learnerId/portfolio` accepts `{ id, sessionId, actionIds, title, reflection }` and returns the saved entry. The browser generates a save ID once and reuses the unchanged input after an unconfirmed response.
- `GET /api/learners/:learnerId/portfolio/:entryId` returns one owned entry.
- `PATCH /api/learners/:learnerId/portfolio/:entryId` replaces `{ reflection }` with the Learner’s supplied words. It never asks a model to rewrite them.

Every operation authenticates through the real family boundary and checks intended Learner ownership. Mutations enforce same origin. Source session and every selected action must belong to the path’s family/Learner and the session must still be live for a new save. Save identity is serialized in PostgreSQL; an unchanged replay returns the existing entry even after its source is gone, a changed payload returns 409, and a save ID owned by a different Learner/family returns 404. The immutable save fingerprint remains separate from the editable reflection. All entry reads bypass model dispatch and provider readiness/allowance checks.

The body limits are one to 40 distinct selected actions, a title of one to 100 characters, and up to 4,000 reflection characters. Source text retains the existing 2,000-character action limit. Entries render text as text. The entry list fetches summaries rather than every saved body. Profile switching unmounts the workspace and aborts pending browser operations; the original request remains bound to its original path even if its database write already committed.

## Follow-on media contract

`lib/portfolio-contract.ts` owns browser-safe `PortfolioEntry`, `WrittenEvidence`, `PortfolioSummary` and `WrittenEvidenceInput` types. `lib/portfolio.ts` owns persistence, validation, source ownership, idempotency and reflection updates. The new `10-written-portfolio.sql` table has family/Learner ownership and a JSON evidence array. Its only cascading relationship is to the owning Learner, **not** to the temporary session. Each written item contains the selected action ID, its explicit attempt intent and a copy of its learner text; the temporary action ID grants no authority.

Tickets 11/12 can extend this boundary with explicit media evidence kinds and server-validated asset references. They must retain source ownership checks, retain or copy only explicitly selected assets independently of temporary-session cleanup, preserve replay identity, and keep ordinary speech distinct from a saved audio reflection. Do not copy Tutor interpretation into learner-authored text or treat session media URLs as durable authority. The current API deliberately does not accept arbitrary evidence bodies, public asset URLs, image/audio payloads, or Tutor prose.

Components are separated into `SaveEvidence`, `Portfolio`, `PortfolioEntryView` and a small request adapter. Coaching only supplies the current session to the chooser; Workspace owns view navigation. No provider adapter or model call was added.

## Verification and limits

The accepted Playwright boundary uses real Better Auth, HTTP routes and an isolated PostgreSQL cluster. Only the external Tutor HTTP service and deliberately lost/delayed browser responses are controlled. The written-selection, unconfirmed-save retry, reflection/show-parent and suggested-question exclusion behaviors were each observed failing before implementation. Further scenarios exercise authorization, concurrent first saves, profile switching during a committed-but-unconfirmed save, and source expiry while the provider cannot reply.

The 1366×768 selection, entry and show-parent screenshots were inspected. The chooser contains visible selection, reflection and save controls; the parent view contains one readable entry, not the chat or every saved entry. React guidance was checked for component boundaries, request cleanup, narrow effect dependencies, form labels, the native modal dialog, browser-safe imports and reduced list payloads.

This is local fictional-data evidence. Hosted availability, backup retention, provider credit/allowance readiness and under-13 handling remain activation requirements owned by the coordinating tickets. Database-backed reading remains possible without a model provider; this does not claim offline access without the application/database. Saved image and audio evidence are later slices. Closing the save dialog discards its transient draft; an unconfirmed save can be checked in My Portfolio. No raw transcript archive or new cloud resource was created.

Local verification before integration: the six Portfolio scenarios passed; after narrowing authorship to Share attempt, the selected-work, direct-ownership and failed-provider/expiry scenarios passed again. TypeScript checking passed. Final integration and build results are recorded below.
