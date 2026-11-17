# Learning Studio

A private hosted learning space with one parent account and separate Learner profiles. Learners choose workbook coaching, paper art, biking exploration, AI literacy, a short maths game or another interest. They can type, review spoken input, confirm/correct uploaded pictures, ask for hints or a different explanation, try a fresh challenge and check public sources. Brief learner-stated notes support return visits. Learners deliberately save their own written work, selected pictures and new spoken reflections in a Portfolio to show their parent.

The [hosted website](https://ai-tutor-ten-puce.vercel.app) uses the authorized existing Vercel Pro and Neon Launch accounts. Its canonical URL reaches application sign-in; family data requires application authentication. It remains a fictional-data preview until actual model funding and provider/application retention prerequisites are verified. A subscription or API key alone does not activate live family learning. **Model access** shows setup, live or paused status, individual operation gates, and the app allowance; saved work remains available during outages or exhausted allowance.

## Run locally

Use Node 26 (`.nvmrc` pins 26.13.1), npm and PostgreSQL 16+. The app does not provision a database.

```sh
nvm use
npm ci
cp .env.example .env
```

Set `DATABASE_URL`, the exact `BETTER_AUTH_URL` origin, independently generated `BETTER_AUTH_SECRET` and `FAMILY_SETUP_CODE`, and the invited parent's `FAMILY_SETUP_EMAILS`. Generate each secret separately with `openssl rand -hex 32`; never commit them. Use verified TLS for hosted PostgreSQL. Apply append-only migrations explicitly:

```sh
npm run db:migrate
npm run dev
```

`npm run dev` runs the full Next.js/eve service graph locally without a linked cloud project. Open `http://localhost:3000`, choose **Set up family access**, and enter the invited email and private setup code. Before live prerequisites pass, add fictional Learners such as River and Sky. They need no email addresses. A trusted browser session lasts up to 30 days; sign out on shared/public computers.

`npm run dev:web` runs only Next.js. `npm run build` builds Next.js and eve; `npm run start:web` serves the built web app alone. Root `vercel.ts` defines the hosted service graph and hourly cleanup. Keep app authentication and deployment protection; a Vercel automation bypass does not authorize family APIs or cleanup.

## Fictional coaching and verification

For a small manual scripted demonstration, run `npm run preview:tutor` in one terminal and `TUTOR_PREVIEW_URL=http://127.0.0.1:4321 npm run dev:web` in another. Ask how to share 24 pencils among six cups. This local fixed script demonstrates controls, not arbitrary teaching or model quality. Production ignores it. The automated browser fixtures instead control external model/transcription/research HTTP while retaining real browser behavior, auth and isolated PostgreSQL.

```sh
npx playwright install chromium
npm run test:browser -- tests/pilot-readiness.spec.ts
npm run test:browser -- tests/session-cleanup.spec.ts
npm run test:browser -- tests/pilot-journeys.spec.ts
npm run typecheck
npm run build
```

Choose the file or `-g "scenario text"` covering a change; do not run every test by default. Each scenario owns a temporary PostgreSQL cluster, removes it afterward, and never uses an existing database. Set `TEST_PG_BIN` if PostgreSQL tools are not at `/opt/homebrew/opt/postgresql@16/bin`. `TEST_APP_MODE=services npm run test:browser -- tests/family-workspace.spec.ts -g "parent establishes"` checks the complete local service composition. Generated screenshots/traces remain in ignored `test-results/` and contain fictional test data only.

## Privacy, saved work and model allowance

Every family/session/note/Portfolio/media route checks server-side ownership. Profile switching disposes of previous session/media/delayed-response UI. Images and deliberately saved audio are private PostgreSQL assets, never public upload URLs. Ordinary speech is temporary, transcribed only after recording, and reviewed before sending. Explicit spoken Portfolio saves use a separate recording and no model request. Read-aloud requires an installed local device voice; test the actual computer's microphone and speakers before use.

Activities expire after at most 24 hours from creation; reads do not extend their life. End activity deletes current context. Hourly native cleanup deletes expired session/action/unsaved-picture rows from active tables; outages can delay scheduling. Database recovery history may retain earlier states for a further 24 hours on the configured hosted project. This is not a promise of universal per-record erasure at 24 hours. Learning notes and deliberate Portfolio copies remain until deleted. [The operator runbook](docs/pilot-operations.md) covers scheduled proof, recovery history, telemetry, restore safeguards and failure recovery.

All chargeable operations share a transactional allowance. Text/image requests reserve $3.718, transcription up to $0.0045, and public-source checks $7.446 before dispatch. Valid authoritative usage releases proven unused reservation; unknown outcomes keep the full hold. These conservative ceilings are admission requirements, not predictions of typical cost. A retry is a separate reserved attempt. The meter is not a provider live balance check. No automatic credit purchase, recharge, allowance increase, provider fallback or new cloud resource is enabled.

Direct Sol runs Standard foreground Responses with `store:false`, explicit caching without breakpoints and no automatic application retry. Public-source checks permit only the built-in read-only web search capability; external source text cannot grant tools. eve's separate routes remain closed, without model/tool access or content tracing. Endpoint-specific retention approval and the hosted application-retention evidence gate every live provider request. See [model-access contract](docs/ticket-drafts/03-verification.md), [public-source contract](docs/ticket-drafts/13-verification.md), and [activation and account-recovery steps](docs/pilot-operations.md).

## Deployment and remaining pilot checks

[Hosted verification](docs/hosted-verification.md) records the deployed revision, successful native cleanup, saved-media return, access checks and fixture cleanup. [Final review](docs/final-review.md) records both review axes and their fixes.

Use this repository root, Node 26 and the existing `vercel.ts`. Set server environment on the intended production target, run migrations through ticket 14 against the correct database, deploy the exact tested commit, and verify the native cron. `CRON_SECRET` is independent of family login and model credentials. Follow [the deployment verification recipe](docs/ticket-drafts/14-verification.md) before claiming hosted cleanup or telemetry evidence.

Actual API-credit eligibility/activation/balance, under-13 project/endpoint approval, synthetic real-model evaluation, real child/device usability, and the physical parent-computer-off trial remain external observations. Controlled journeys prove app behavior only. The [synthetic evaluation](docs/evaluations/14-private-pilot.md) is defined and unrun; it must use the real app boundary after permitted access is established. The pilot does not measure long-term educational outcomes.
