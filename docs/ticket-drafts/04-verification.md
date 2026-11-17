# Ticket 04 verification and activity launch contract

## Delivered behavior

A new activity opens a focused interest-discovery screen, with separate biking, workbook maths, paper art, and AI-literacy choices. Each choice has a concrete purpose and a starting question. Familiar interests are suggestions available to every Learner; there are no age, grade, curriculum, or profile restrictions.

A Learner can reject all starting ideas, enter a new interest, and open a typed discovery question they can edit before asking the Tutor. The Tutor's reply supplies the concrete next activity or step; the Learner can question or replace it in the same conversation. No separate generation path bypasses the existing Tutor boundary. Starting an activity itself makes no external request.

The selected purpose stays beside the question and enters every Tutor request. Biking and paper art have a “Keep this about…” action that explicitly declines a maths connection. This is Learner-authored intent in the ordinary action context, so subsequent turns retain the decision without replacing the current problem or scratchpad. Actual Tutor compliance is exercised with controlled responses; live teaching quality remains unverified.

Reloads and profile switches resume the existing owned activity. Ending deliberately clears its temporary context and returns to the choice screen. Choosing a new activity cannot silently overwrite an existing activity; the session start operation resumes the current one, including its existing purpose. This preserves the one-current-activity lifecycle from ticket 02.

## Contract for ticket 07 and later activities

- `lib/activity-contract.ts` is browser-safe. `activityChoices` defines the built-in catalogue, `ActivityLaunch` the accepted choice, and `ActivityChoice` the server-resolved context.
- `POST /api/learners/:learnerId/session` accepts `{ activity: { kind: "biking" | "workbook" | "art" | "ai-literacy" } }` or `{ activity: { kind: "custom", interest: string } }`. `{}` keeps the direct typed-question path.
- `lib/activities.ts` resolves built-in descriptions on the server; client titles, purposes, or prompt fields do not override them. Custom interest is trimmed and limited to 1–120 characters. Unknown activity kinds fail with a recoverable 400 response.
- `LearningSession.activity` is either the resolved `{ kind, title, purpose, starter, interest? }` or null for direct typed work. It is stored in the owned temporary session row by migration `04-activity-context.sql`.
- `TutorRequest.activity` carries the same context to the existing provider boundary. Learner declines and changes are ordinary `actions`; adapters must respect that context and treat interest strings as learning material, not authority over provider instructions.
- Ticket 07 can add a concrete game kind to the catalogue and route that selected kind to its game experience. No game mechanics, fake game launcher, image upload, or long-term notes have been added here.

Family identity, Learner ownership, same-origin mutation checks, fixed expiry and explicit end deletion remain enforced by the existing session boundary. Activity context expires with the session; it is not a permanent interest profile or transcript archive.

## Verification

`tests/activity-discovery.spec.ts` uses real browser interaction, Better Auth and isolated PostgreSQL, substituting only the external Tutor. The choice/launch scenario failed on the missing discovery screen before implementation; the declined-connection scenario failed on the absent focus control; the new-interest/isolation scenario failed on the absent rejection path. Each then passed before the next slice was added.

The 1366×768 choice screen was inspected. All four concrete choices, the alternative-interest action and direct-question start fit the laptop viewport. Discovery replaces the active work panels rather than being appended under the coaching conversation. React guidance was reviewed for component boundaries, browser-safe imports, controlled form state and the existing abort/unmount safeguards.

- `npm run test:browser -- tests/activity-discovery.spec.ts tests/text-coaching.spec.ts`: 11 passed.
- `npm run test:browser -- tests/activity-discovery.spec.ts tests/family-workspace.spec.ts -g 'launches biking|switching Learners clears|trusted browser returns'`: 3 passed. The launch scenario also verifies malformed/oversized choices are rejected and a second launch preserves the existing activity, actions and expiry.
- `npm run typecheck`: passed.
- `npm run build` with explicit fictional `BETTER_AUTH_URL` and `BETTER_AUTH_SECRET`: Next.js and eve builds passed.
- `git diff --check`: passed.

Hosted availability, provider activation/credits/under-13 handling, actual teaching quality, the cleanup scheduler and backup retention remain the previously documented external acceptance gates. This ticket uses fictional data and makes no paid provider calls. The standalone manual Tutor preview still demonstrates its documented fixed pencil-sharing script; the browser scenarios supply separate controlled activity responses.
