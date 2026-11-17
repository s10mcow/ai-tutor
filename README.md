# Learning Studio

A private family workspace with one parent account, separate Learner profiles, and a remembered profile on each trusted browser. This preview accepts fictional information only. Typed activities support questions, hints, examples, attempts, corrections, and pace changes through a controlled local Tutor service. Live model and speech access remain closed.

## Run locally

Requirements: Node 26 (`.nvmrc` pins 26.13.1), npm, and PostgreSQL 16 or newer. The app needs a PostgreSQL database you control; it does not create a hosted resource.

```sh
nvm use
npm ci
cp .env.example .env
```

Fill in `.env`:

| Variable              | Value                                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`        | Connection string for your application database; use the provider's TLS settings for hosted storage. |
| `BETTER_AUTH_URL`     | The browser's exact origin, locally `http://localhost:3000`.                                         |
| `BETTER_AUTH_SECRET`  | A new random secret of at least 32 characters.                                                       |
| `FAMILY_SETUP_CODE`   | A separate private invitation code of at least 16 characters.                                        |
| `FAMILY_SETUP_EMAILS` | The invited parent's email address.                                                                  |

Generate each secret separately with `openssl rand -hex 32`. Keep `.env` private. Startup does not automatically migrate databases; apply the versioned migrations explicitly:

```sh
npm run db:migrate
npm run dev
```

`npm run dev` runs the complete Next.js and eve service graph through `vercel dev --local`, without requiring a linked Vercel project. Open `http://localhost:3000`, choose **Set up family access**, and use the invited parent email and setup code. Add two fictional Learners such as River and Sky. The Learners need no email addresses.

`npm run dev:web` runs only the web service for focused interface work. Root `.env` values are loaded by these scripts. `npm run build` builds both services; `npm run start:web` runs the built web service alone. The deployed composition is defined in `vercel.ts`.

## Verify the workspace

Install the browser once:

```sh
npx playwright install chromium
npm run test:browser -- tests/family-workspace.spec.ts
npm run test:browser -- tests/text-coaching.spec.ts
npm run typecheck
npm run build
```

The browser harness starts a fresh temporary PostgreSQL cluster on an available port for every scenario. It uses real Better Auth and HTTP requests, fictional profiles, and no internal mocks. It shuts down and removes its own storage afterward. Existing databases are never used. On macOS it defaults to `/opt/homebrew/opt/postgresql@16/bin`; set `TEST_PG_BIN` to the directory containing `initdb` and `pg_ctl` elsewhere.

The return scenario restarts the actual application process against the same isolated database, then opens a new browser context with the trusted session cookie. The switching scenario delays a real HTTP response to check the pending state. Screenshots and failure traces are under ignored `test-results/`.

Verify the same complete service command used for local development:

```sh
TEST_APP_MODE=services npm run test:browser -- tests/family-workspace.spec.ts -g "parent establishes"
```

Run one scenario with `-g "scenario text"` when changing a narrow behavior. Do not run every future ticket's tests by default.

## Access and ownership

- Better Auth handles parent password hashing, session cookies, origin checks, and sign-out. Setup requires both a server-configured email invitation and the private setup code, including requests sent directly to the auth API.
- A trusted browser session lasts up to 30 days and renews while active. Sign out on public computers. A new authenticated browser session selects its own Learner independently.
- `lib/family.ts` resolves family identity from the authenticated session. Learner IDs are selectors; every read and write constrains ownership on the server. Selection belongs to the auth session, not a global family preference.
- The scratchpad is temporary browser state. Switching unmounts the previous workspace immediately, and no new workspace opens while selection is pending. It is not saved in local storage or sent to the Tutor.
- eve has no exposed tools, all session access is denied, model calls are blocked, and sandbox creation is disabled. Later tickets must add app-owned learning-session authorization and metering before opening access. There is no development authentication bypass.

## Hosted preview

The code is prepared for a Vercel project with managed PostgreSQL. Use this repository's root as the project root, Node 26, and the root `vercel.ts`; it composes Next.js and eve under one origin. Set all five environment variables above on the target deployment, with `BETTER_AUTH_URL` matching the actual preview URL, then run migrations against the intended hosted database before verification. Use deployment protection as available and retain application authentication.

**The hosted acceptance criterion is pending.** No cloud database or deployment is provisioned by this ticket. Existing paid account availability is not authorization for extra spending. The coordinating implementation must establish suitable hosting/storage and verify the fictional-data flow at a remotely accessible preview URL.

Live-family readiness, approved provider retention, eligible credit access, allowance enforcement, and real-model teaching evaluation belong to later tickets. No OpenAI key is needed for this slice.

## Temporary typed activities

Choose **Start an activity**, type a fictional question, and use the hint, example, attempt, correction, or pace controls. The browser scenarios supply a local HTTP Tutor with controlled replies and failures; the real application still enforces parent authentication, Learner ownership, and PostgreSQL persistence. Without a configured service the app preserves the question and offers retry or End activity. `TUTOR_PREVIEW_URL` is development-only and must point to `http://127.0.0.1:<port>`; production never dispatches through it. No key, live provider, paid fallback, or publicly reachable eve route is enabled.

Each Learner has one current activity. Its question and turns survive reloads and web-process restarts for a fixed maximum of **24 hours from creation**, without extending on use. `TUTOR_SESSION_RETENTION_SECONDS` can shorten that period, never lengthen it. An activity accepts at most 40 Learner actions, with 2,000 characters per input and 6,000 per Tutor reply. Scratchpad contents remain local temporary state and are never sent to the provider.

**End activity immediately deletes the activity and its turns.** Expired activities cannot be read or resumed. Session access opportunistically deletes expired records, and `npm run sessions:purge` deletes them without waiting for another visit. The hosted deployment must schedule that command at least hourly and verify deletion before live-family activation. Until the scheduler is installed, logical expiry is enforced but physical deletion during idle periods is not guaranteed. Database backups need a separately verified retention policy. Current activity context is distinct from later learning notes and explicit Portfolio saves.

Submitted actions keep their identity across retries. Replaying a completed or pending action returns its existing state; changed input with the same identity is rejected. Failed replies retain the input, and a retry creates a new provider-attempt identity for the same Learner turn. The local provider timeout is 15 seconds; an orphaned pending action becomes retryable after 30 seconds. These are application recovery rules, not proof of zero provider spend after an ambiguous failure. Ticket 03 must reserve and reconcile each real attempt before enabling chargeable dispatch.

Implementation and follow-on contracts are recorded in [ticket 02 verification](docs/ticket-drafts/02-verification.md).

### Try the fictional coaching demo manually

After the local setup and migrations above, open two terminals in this repository with Node 26 selected. In the first:

```sh
npm run preview:tutor
```

In the second:

```sh
TUTOR_PREVIEW_URL=http://127.0.0.1:4321 npm run dev:web
```

Open `http://localhost:3000`, sign in with your invited fictional parent account, and choose a fictional Learner. Start an activity and ask **How can I share 24 pencils equally among 6 cups?** Try **Show an example**, share an attempt, then choose **Correct question** and change 24 to 30 pencils. The service is a fixed pencil-sharing script: it demonstrates the controls and context, and does not evaluate answers or support arbitrary topics. The page labels it **Scripted Tutor preview**.

To simulate one service failure, run this in another terminal before the next action:

```sh
curl -X POST http://127.0.0.1:4321/fail-next
```

Send an attempt or request a hint, reload to see the saved input, and choose **Retry reply**. The retry succeeds without adding another Learner turn. **End activity** clears the temporary conversation. Stop the preview service and web server with Ctrl-C. This demo uses your configured local application database; automated tests instead create and delete an isolated PostgreSQL cluster.
