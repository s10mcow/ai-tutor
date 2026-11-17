# Final implementation review and fixes

Review baseline: `main...63ea7f21e6ee4aa6efd2a883518f46f419cfaaa0`. This fresh implementation worktree was created from that integration commit before edits. The independent review reports were supplied in `/tmp/ai-tutor-research/final-review-standards.md` and `final-review-spec.md`; their findings are recorded separately below.

## Standards findings and resolution

The independent Standards review found no documented-standard violations. It raised two nonblocking heuristics, both addressed:

- **Duplicated bounded request reading:** `lib/bounded-body.ts` now owns byte counting, Content-Length preflight, stream cancellation on excess, and lock release. Picture uploads, ordinary transcription, and deliberate Portfolio saves provide their own limits and errors. Each caller retains format validation and authorization. The helper does not interpret media or change ownership, normalization, metering, or persistence.
- **Misleading Portfolio save names:** the multimodal operation is now `savePortfolioEntry` and its envelope is `PortfolioEntryInput`. `WrittenEvidence` still names selected text snapshots. Picture-only reflections and audio-only entries remain supported.

The changes follow the existing browser/application seam with real Better Auth and isolated PostgreSQL, controlled external providers, and fictional Learners/media. Installed Next.js client-boundary and route-handler documentation, the repository TDD guidance, domain vocabulary, ADRs, and React guidance were consulted. No unit tests mirroring the rename or stream-reader implementation were added.

## Spec findings and resolution

- **P2: delayed family loads could restore private Learner names after sign-out.** The new browser test delayed a real successful `/api/family` response after adding a fictional Learner, signed out through real authentication, then released that response. Before the fix, the sign-in heading disappeared and the picker returned. Family loads now abort and check their controller identity before applying success, 401, error, or loading state. Authentication transitions invalidate pending loads, clear selection/readiness, and stop readiness polling and the access panel. A failed sign-out reloads the current authenticated family and remains retryable. The regression also verifies backend 401 while signed out and normal sign-in afterward.
- **P2: accepted pictures could exceed the hosted request ceiling and expose a JSON parser error.** The supplied hosted evidence recorded a valid 4,848,614-byte PNG receiving plain-text 413, consistent with [Vercel's 4.5 MB function request limit](https://vercel.com/docs/functions/limitations#request-body-size). One client-safe contract now defines the 4,000,000-byte raw limit and matching copy. Browser and server reject oversized pictures before interpretation. A 413 gives size guidance; non-JSON or failed transport gives a retry message. File selection and upload identity survive retry. The 502 scenario loses the response after a real successful upload and then recovers exactly one owned picture.

No further implementable spec omission or scope creep was found by the independent review. External acceptance criteria remain separate.

## Verification

All commands use Node 26.13.1. Red-before-green was observed separately for delayed family refresh, valid PNG browser preflight, the direct server size boundary (previously 200 instead of 413), and plain-text 413 recovery (previously a JSON parser error).

- The scoped family/image command selected delayed refresh, failed sign-out, independent trusted-browser sign-in, oversized-picture preflight, direct server size enforcement, non-JSON 413/502 retry, and existing raster/ownership/lifecycle coverage. Seven passed initially; the failed sign-out check collided with Next.js's hidden route announcer, so its alert locator was scoped to the main content and rerun below.
- `npm run test:browser -- tests/family-workspace.spec.ts tests/voice-coaching.spec.ts tests/spoken-portfolio.spec.ts tests/picture-portfolio.spec.ts tests/written-portfolio.spec.ts -g 'failed sign-out|transcription validates bytes|saved audio validates bytes|failed audio commit|failed picture transaction|saves only selected written|a new spoken reflection'`: six passed, including the corrected failed-sign-out check, ordinary speech byte/ownership/replay rejection, audio byte/ownership validation, audio and picture lost-response recovery, and selected written work. The existing new-spoken-reflection scenario produced too few synthetic microphone samples before any upload; no capture code was changed. Its isolated `tests/spoken-portfolio.spec.ts -g 'a new spoken reflection'` rerun passed, including audio-only saving and later playback. Fourteen distinct focused scenarios therefore passed across these runs.
- `npm run typecheck` passed after preserving the shared reader's concrete `Buffer<ArrayBuffer>` return type. `npm run build` passed production Next.js and eve builds using fictional build-only authentication settings, an unavailable local database address, and no provider key. Prettier and `git diff --check` passed.
- Merging `integration/ai-tutor` after the implementation commit reported already up to date at `63ea7f2`. The required post-merge core check, `npm run test:browser -- tests/family-workspace.spec.ts tests/image-coaching.spec.ts -g 'delayed family refresh|failed sign-out|picture over 4 MB|direct picture uploads|non-JSON picture'`, passed all six selected scenarios.

No entire test suite was run. No cloud, GitHub, private environment, or task-created hosted data operations were performed in this fix worktree. No cron schedule was changed.

## Remaining external gates

These local tests and production builds do not establish actual subscription-credit eligibility/balance, permitted live provider endpoints, under-13 provider retention approval, real-model teaching/source quality, real Learner learning outcomes, physical microphone/speaker usability, or an observed parent-computer-off trial. Root deployment verification owns the native scheduled cleanup, hosted telemetry/recovery-history observations, and deployment of these fixes. This report does not relabel unobserved live criteria as complete; see [the pilot verification record](ticket-drafts/14-verification.md) and [operator runbook](pilot-operations.md).
