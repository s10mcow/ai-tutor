# Ticket 01 verification

Behavioral test boundary: real browser → Next.js → Better Auth → isolated PostgreSQL. No model, speech or research provider is called.

Red/green evidence, one behavior at a time:

1. Parent setup and two Learners: first failed waiting for the missing “Set up family access” action; passed after the real auth/setup, profile persistence and workspace implementation.
2. Trusted return: failed after reload because River's workspace was absent; passed after persisting selection per authenticated session. The passing test also restarts the application and opens a new browser context with the existing cookie.
3. Ownership: failed because the owned Learner read route returned 404; passed with the authenticated ownership-constrained read. The same test checks anonymous access and a second real family's manipulated identifier with no leaked Learner data.
4. Pending switch: failed because Sky's workspace button remained enabled while clearing selection was pending; passed after locking selection during the real delayed response. The prior scratchpad disappears immediately and remains empty when returning.

`tests/family-workspace.spec.ts` is the narrow test file. `tests/fixture.ts` creates per-scenario temporary PostgreSQL storage and allocated network ports; no personal databases are used.

## Hosted verification

After the parent authorized normal usage charges on their existing Neon Launch and Vercel Pro accounts, the fictional-data preview was deployed at [Learning Studio](https://ai-tutor-ten-puce.vercel.app), with Vercel deployment protection retained. Deployment `dpl_Gusq7BtiNNDu7x1HGxhkfjzrctTs` runs exact commit `23adec6c419b8f860677f1c4a2c54480f712f872`; its Next.js/eve services run on Vercel in iad1 and its PostgreSQL16 database runs on Neon in aws-us-east-1. No local web server or tunnel serves these requests.

On November17,2026 UTC, a real browser created a separate invited fictional parent account and two fictional Learners, selected both workspaces, and returned in a fresh browser context with the trusted session. A second run signed in again and repeated the return check. The hosted family endpoint rejected unauthenticated access with401. The hosted model-access endpoint reported `ready:false`, `liveReady:false` and `missing_credentials`; no provider calls occurred. The real parent's account remains unclaimed so they can choose their own password.

The private one-off harness and generated credentials are ignored local artifacts, never committed; the visible workspace screenshot is at `/tmp/ai-tutor-research/hosted/returning-workspace.png`. The deployment is independent of local processes. A literal physical-computer power-off check, live teaching evaluation, actual device audio and provider prerequisites remain final-pilot observations rather than claims from this test. Temporary verification access must be removed when hosted verification is finished.

The database is fixed at0.25CU with five-minute idle suspension and a24-hour restore-history window. Logical deletion and restore-history retention are distinct; final-pilot retention verification still applies before child-data activation.

Final checks:

- `npm run test:browser -- tests/family-workspace.spec.ts`: 5 passed. Additional coverage verifies invite rejection, real password sign-in, independent device selection, sign-out, and rejected cross-origin writes.
- `TEST_APP_MODE=services npm run test:browser -- tests/family-workspace.spec.ts -g "parent establishes"`: passed through the complete Next.js/eve service graph, including denied eve session creation and streaming even for a signed-in family.
- `npm run typecheck` and `npm run build`: passed. The build uses a fictional auth secret only; no provider key or database connection is needed at build time.
- `eve info --json`: ready, zero diagnostics, no tools/subagents/schedules.
- `npm audit --omit=dev`: zero findings. The Vercel CLI development dependency tree still reports 37 moderate/high findings; a `tar` override to 7.5.23 removes the critical archive-parser finding. These tooling advisories are not represented as resolved by application tests.

The complete service check caught a Next development origin mismatch; the web dev command now binds explicitly to loopback. The production build caught Next forwarding Node's `--env-file-if-exists` flag into worker `NODE_OPTIONS`; `scripts/with-env.mjs` loads the root environment without forwarding that unsupported flag. Neither fix changes authentication rules.
