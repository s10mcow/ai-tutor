# Ticket 07 verification and game contract

## Delivered behavior

The activity chooser launches **Short maths game**, one complete equal-sharing game called **Pack the trays**. The Learner first chooses whether equal sharing sounds useful, selects smaller or bigger numbers, or returns to other activities. Both starting sizes are available to every Learner. Two deliveries make a short activity, with no timer, score, reward catalogue, grade or mastery claim.

The visible challenge asks the Learner to share a fixed total equally between trays. They enter the number in each tray and their own reason, including uncertainty if they wish. The server evaluates the arithmetic, explains unused or excess tiles after an incorrect attempt, and supports a retry. A hint describes distributing one tile at a time; a separate six-tile example leaves the current challenge to the Learner. The next delivery starts without the previous hint/example. Completing both deliveries is visibly acknowledged without claiming that an arithmetic result establishes understanding. Written reasons are preserved, not automatically judged for correctness.

## Application contract

- `ActivityLaunch` accepts `{ kind: "maths-game" }` through the existing owned session start operation. Launching and playing require no external provider.
- `LearningSession.game` is null before the starting-size choice and otherwise holds level, round, current server challenge, status, help, attempts and bounded replay receipts. Migration `07-maths-game.sql` stores it on the existing temporary session row.
- `POST /api/learners/:learnerId/session/:sessionId/game` accepts a stable `id` plus one of `{ intent: "choose", level: "smaller" | "bigger" }`, `{ intent: "attempt", round: 0 | 1, answer, reason }`, `{ intent: "help", round, kind: "hint" | "example" }`, or `{ intent: "next", round }`.
- The server defines the totals and trays: smaller deliveries are 12/3 and 20/4; bigger deliveries are 24/6 and 42/7. Client-supplied challenge/result fields grant no authority. Answers are whole numbers from 0 through 100; reasons contain 1–1,000 trimmed characters. A game permits at most 20 attempts and 40 commands.
- Every mutation checks the authenticated family, intended Learner, owned unexpired session and same origin. The session row lock serializes mutations. An unchanged replay returns the current snapshot; changed input under a used ID or a stale round is rejected. Generic coaching submissions cannot overwrite a game challenge. The existing `end` operation remains available.
- Each game attempt keeps its original challenge, entered answer, exact trimmed reason, server result/feedback and help used. It also creates a completed `CoachingAction` with explicit `intent: "attempt"`. Its `text` contains only neutral labels around the Learner-entered answer and reason; `reply` contains the game feedback. Hints, examples, level selections and round changes never become learner-authored attempts.

`MathsGame` is a separate client component; it aborts pending requests on unmount and keeps one unchanged command for an unconfirmed network retry. Learner and session keys prevent later results appearing in another workspace. Ending a game exposes persistence errors and permits retry.

## Retention and selected evidence

Game state and attempts inherit the fixed session expiry (default/maximum 24 hours), resume after a web-process restart, and disappear on explicit end or session cleanup. Neither reading nor playing extends expiry. Logical expiry is enforced on game mutations as well as existing reads. The already documented hosted purge schedule and backup retention still require deployment verification.

The shared written Portfolio control accepts only explicit game attempts. A Learner chooses which entered answers/reasons to keep and adds their own reflection; the server copies selected attempt text, never feedback or examples. Selected evidence remains available after the temporary game is ended. No game automatically creates a Portfolio entry, lasting interest record, transcript or parent report.

## Verification and limits

`tests/maths-game.spec.ts` uses real browser interactions, Better Auth, application routes and isolated PostgreSQL. The first play-through failed on the absent launcher before implementation. The challenge-ownership scenario failed when a generic question could overwrite the game problem, then passed after closing that path. The selected-evidence scenario failed on the absent save control before integrating the shared Portfolio component, then passed. No model mock substitutes for game evaluation; game scenarios assert that the external controlled Tutor receives no requests.

The 1366×768 active-game view was inspected and adjusted so the prompt, trays, answer, reason, submit button and help controls fit together. The completion view preserves the final challenge beside the Learner's reason. React guidance was reviewed for component boundaries, browser-safe type imports, form labels, bounded history, abort cleanup and request state.

This is fictional local validation. Actual topic/level suitability still needs the planned Learner usability trial; arithmetic checking does not assess a written explanation's quality. Hosting, actual provider credits/retention approval and live teaching quality remain the existing activation gates. No cloud resource, chargeable provider request or real learner data was used.

Final checks used Node 26.13.1 after merging integration `a3c4781` (metered access and written Portfolio):

- `npm run test:browser -- tests/maths-game.spec.ts tests/activity-discovery.spec.ts -g 'maths-game|launches biking'`: five passed. This includes all four game scenarios and the existing activity launch/retained-purpose scenario.
- `npm run test:browser -- tests/activity-discovery.spec.ts tests/text-coaching.spec.ts -g 'launches biking|hints, examples'`: two affected regressions passed. The full test suite was not run.
- `npm run typecheck`: passed.
- `npm run build` with explicit fictional auth URL/secret: Next.js and eve passed.
- Formatting and `git diff --check`: passed.

Inspected laptop artifacts are retained outside the repo in `/tmp/ai-tutor-research/ticket07/`: `maths-game-active-laptop.png`, `maths-game-complete-laptop.png`, and `activity-choices-laptop.png`. All five activity choices, the alternative-interest action and the direct-question start fit the revised desktop chooser.
