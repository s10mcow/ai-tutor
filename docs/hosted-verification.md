# Hosted verification

Checked on 2026-11-17 UTC using fictional accounts, text and generated media. The application is at [Learning Studio](https://ai-tutor-ten-puce.vercel.app), on the parent's authorized Vercel Pro and Neon Launch accounts.

The deployed application revision is `93cba83ea129efb7fdd3d6bd52229d086d14421b`, deployment `dpl_8MNubNbyq7FaposrBkkipt7kCXZo`, status **READY**. Later documentation-only commits record these observations. The reviewed implementation, targeted test results and remaining external gates are in [the final review](final-review.md).

## Application observations

- Real hosted parent authentication, separate Learner profiles, switching and fresh-browser/password return passed. The canonical URL serves sign-in without a Vercel bypass; anonymous family and media requests return 401.
- The short equal-sharing game gave feedback for a wrong attempt, supplied an example and accepted explained solutions. A game-backed learning note remained with its Learner. The sibling's notes were separate, and a wrong-Learner session path returned 404.
- A real coaching HTTP response was delayed while switching profiles. Its private question/session state did not appear in the next workspace. Model access was closed for that request; this is response-isolation evidence, not a model-generated teaching response.
- Generated artwork and a deliberately recorded oscillator tone were explicitly saved with a reflection. Ending the activity removed the source picture. A fresh sign-in retrieved the Portfolio picture, advanced audio playback and displayed the chosen entry for the parent. Wrong-Learner asset paths returned 404 and anonymous requests returned 401. The final deployment repeated this flow after the shared upload-reader change. A tone verifies the capture/encoding/storage/playback path, not real speech or microphone quality.
- The deployed sign-out regression passed: releasing a delayed successful family response did not restore private profile names; the backend remained 401. A valid 4,848,614-byte PNG was rejected by browser preflight with zero upload requests. A 4,257,090-byte direct upload reached the app and received a JSON 413 with 4 MB guidance. Choosing a smaller picture recovered successfully. The earlier 5 MB/platform mismatch is fixed.
- Text, image interpretation, transcription and research all report `missing_credentials`, `familyState: setup`, and `familyLiveReady: false`. Hosted research and transcription attempts remained closed, with zero charges, reservations or unresolved usage. Saved work stayed accessible. The final readiness view reports the independently verified application retention controls without implying provider approval.

## Native idle cleanup

The hourly job is enabled at minute 50 UTC. Synthetic expired session/action/picture rows and an unexpired control were seeded at 01:39:24. No application session reads were made before the scheduled run; those reads could otherwise trigger opportunistic cleanup.

| Direct database observation | Expired session | Its action | Its unsaved picture | Unexpired session | Saved entries / pictures / audio |
| --------------------------- | --------------: | ---------: | ------------------: | ----------------: | -------------------------------- |
| 01:49:45.934 UTC            |               1 |          1 |                   1 |                 1 | 2 / 2 / 2                        |
| 01:51:24.606 UTC            |               0 |          0 |                   0 |                 1 | 2 / 2 / 2                        |

Vercel recorded `GET /api/cron/purge-sessions` at **01:50:26.085 UTC**, status **200**, user-agent `vercel-cron/1.0`, on deployment `dpl_5ptEVtGUb44AQKBixyGh2ArpFMWT` (revision `63ea7f2`). Only afterward did a manual repeat return 200 with `deletedSessions: 0`. Anonymous, authenticated-family and incorrect-secret requests returned 401. The cron handler and `vercel.ts` are unchanged in the final reviewed revision; its active deployment was separately confirmed to retain the enabled hourly definition.

## Retention and telemetry observations

Neon's configured recovery history is 86,400 seconds. Inventory showed one branch, no snapshots and no automatic snapshot schedule. Expiry, active-table deletion and historical recovery are distinct: earlier database states may remain recoverable for approximately another day, and scheduling failures can delay deletion. These limits were disclosed to the parent and recorded in the private setup instructions. [The operator runbook](pilot-operations.md) documents restore and allowance-reconciliation safeguards; no restore drill is claimed.

Reachable application logging and eve instrumentation were inspected. Vercel continuous trace sampling is disabled and the project's drain list is empty. Correlated runtime logs contained platform TLS initialization messages; searches for the synthetic learning/media markers returned no records. The final deployment's checked runtime window contained no error/fatal records. This establishes the inspected controls and samples, not a universal provider-retention guarantee or continuous monitoring history. Historical fictional traces and operational request metadata can have separate provider retention.

## Cleanup and remaining checks

The temporary QA invitation is absent from the final deployment and its signup attempt returned 403. The task-created test account and its cascading family, Learner, session, notes and Portfolio records were removed. Direct counts confirmed those tables empty, with no model allowance or operation rows. The real parent's account was never created or modified; the private invitation remains for their own setup. The one task-created automation bypass was revoked, local QA/OIDC credentials removed, and all merged implementer worktrees cleaned up. After cleanup, sign-in returned 200 and anonymous family/cron access returned 401.

The application was exercised remotely without a local server or tunnel serving its requests. The parent's computer was not physically powered off. Actual API-credit activation/balance, permitted provider endpoints and under-13 approval remain unverified. The synthetic real-model evaluation, actual child journeys, microphone/speaker experience and learning observations remain unrun. Ticket 14 and the parent specification remain open, and the integration PR remains a draft.
