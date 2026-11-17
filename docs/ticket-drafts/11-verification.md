# Ticket 11 verification and extension contract

## Delivered behavior

A Learner can open **Save Learning evidence** as soon as an activity has a picture, without manufacturing a typed attempt first. The picture checkbox starts unchecked. A picture can be saved with either selected **Share attempt** text or a nonblank reflection supplied by the Learner. The confirmation description and Tutor interpretation never enter the chooser or the saved evidence. Written-only saves keep their existing selection and authorship rules and do not silently include an attached picture.

The saved entry and **Show my parent** display the picture with the selected explanation/reflection. Image-only reflection edits preserve accompanying Learner words; entries with a selected written explanation can keep the optional reflection empty. No model call, extra image upload path, image editor, public storage, or parent notification was added.

## Persistence and authorization

The existing `POST /api/learners/:learnerId/portfolio` input now accepts optional `imageIds`, limited to the one picture currently supported by the activity. `actionIds` may be empty only for a selected picture with a nonblank reflection. All other title/reflection/selection limits remain. The request contains source IDs, never client asset URLs, bytes or arbitrary evidence bodies.

A new save locks and revalidates the live family/Learner activity, locks its selected image, and copies the already normalized JPEG bytes and metadata in the same PostgreSQL transaction as the Portfolio entry. Source removal or activity cleanup cannot remove the locked source during copying. Migration `11-picture-portfolio.sql` adds `portfolio_entry.images` metadata and bounded `portfolio_image` bytea, keyed by entry and image. Its foreign key cascades only from the durable Portfolio entry, with ownership inherited through that entry; it has no relationship to the temporary source session or image. Unselected uploads remain subject to ticket 08 cleanup.

The unchanged-save fingerprint includes selected image IDs. The pre-existing advisory lock serializes simultaneous saves with the same ID. Unchanged retries return the same entry even after the source disappears. Reusing that ID for changed selections/content returns 409; another family/Learner gets 404. Empty/absent image selection preserves the earlier written-only fingerprint, including entries created before the migration. Editable reflections remain separate from immutable save identity.

`GET /api/learners/:learnerId/portfolio/:entryId/images/:imageId` authenticates and checks the requested family, Learner, entry and image together. It returns only fixed `image/jpeg` bytes with `private, no-store`, `nosniff`, restrictive CSP and fixed inline filename headers. There is no public media URL or provider file ID. Browser rendering uses the authenticated route directly, without the image optimizer or public caching. List responses still contain only entry summaries.

## Follow-on media contract

`lib/portfolio-contract.ts` adds `PortfolioImage { id, kind, width, height }`, `PortfolioEntry.images`, and optional `WrittenEvidenceInput.imageIds`. The existing written evidence array remains unchanged. `lib/portfolio.ts` owns the atomic save and `readPortfolioImage` boundary. Tickets adding audio should add their own media field and durable ownership rather than replacing `images` or `evidence`. Explicitly saved spoken Learner reflection may satisfy accompanying own words; ordinary voice interaction and Tutor interpretations must not.

## Verification

The adopted seam is Playwright through real Better Auth, application HTTP routes and isolated PostgreSQL, replacing only external provider HTTP. The first scenario failed at the absent image-only save control, then passed after the vertical implementation. A second failed because an image-only reflection could be erased, then passed with form and server validation. All media and Learners are fictional.

The scenarios establish:

- Explicit, initially unselected picture choice; own reflection without a prior typed attempt; no copying of the Tutor description.
- Exact normalized bytes preserved after direct source deletion, activity end, web-process restart and a fresh authenticated visit with exhausted provider allowance.
- Editable own reflection without losing the picture or changing the replay fingerprint.
- A real deferred PostgreSQL trigger rejecting commit after the entry and image insert: no listed entry or accessible saved asset, original source intact, and successful retry after recovery. The generic fixture `configureDatabase` is setup/fault injection only and exposes no query results; all assertions use browser/HTTP. Atomicity and the foreign key prevent durable orphan rows, rather than claiming HTTP invisibility alone proves deployed deletion.
- A committed save with a deliberately lost browser response, source cleanup, safe UI retry, concurrent first saves/replays, and changed-selection conflict.
- Sibling, anonymous, other-family, substituted-entry and substituted-source denial, same-origin mutation protection, and image metadata/headers without byte leakage.
- A selected written explanation accompanying a picture without another reflection, written-only evidence omitting an attached picture, and durable image access after logical expiry and the application's physical source cleanup.

Laptop screenshots at 1366×768 are retained outside the repository under `/tmp/ai-tutor-research/ticket11/`. The chooser has visible selection, title, own reflection and save controls. The saved picture is bounded so the Learner's words are visible with it. React guidance was reviewed for labels, cleanup, browser-safe contracts and small serialized metadata. Installed Next.js route, client/server and image documentation was read before edits.

## Limits

This establishes local fictional-data behavior, not hosted availability or live-family readiness. Hosted backups, retention, idle cleanup scheduling, provider image approvals and under-13 handling remain deployment/activation verification. No cloud resources, actual models or children's data were used. Saved images use the existing PostgreSQL persistence choice and retain the existing normalized 3 MB maximum. The save dialog still follows ticket 10's transient-draft behavior on close.

Final checks used Node 26.13.1 and an independent `npm ci` in the ticket worktree. Implementation `2d28df0` was merged with adaptive coaching (`3424ff9` at `62bf5d9`), then voice coaching (`bc20221` at `23d6b51`). The voice merge required preserving both independent appended CSS blocks. The later documentation-only acceptance update `de2a37b` is also merged.

- `npm run test:browser -- tests/picture-portfolio.spec.ts`: all five scenarios passed before integration, after adaptive coaching, and again after voice coaching. The last run covers the combined image save, ordinary speech controls, typed coaching, auth, rollback and expiry flow.
- `npm run test:browser -- tests/written-portfolio.spec.ts tests/image-coaching.spec.ts -g 'a Learner saves only|switching Learners during|Portfolio reads, source|a workbook interpretation'`: four focused regressions passed before the integration merges.
- `npm run typecheck`: passed after each code integration merge. Formatting and `git diff --check` passed.
- `npm run build:web` with explicit fictional auth/database settings and no provider key: passed after both code integration merges, including the protected Portfolio image and transcription routes in the final build. No eve code changed, so its build was not repeated.
- Final laptop artifacts are `picture-selection-laptop.png` and `picture-parent-laptop.png` under the directory above; both were regenerated and inspected against the branch including voice coaching.
- No repository-wide test suite was run.
