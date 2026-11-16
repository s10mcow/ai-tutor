# Learning Studio

A private family workspace with one parent account, separate Learner profiles, and a remembered profile on each trusted browser. This preview accepts fictional information only. Tutor access is closed; no model or speech calls are made.

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

Live-family readiness, approved provider retention, eligible credit access, allowance enforcement, and tutoring behavior belong to later tickets. No OpenAI key is needed for this slice.
