# Allowance and activity recovery review fixes

Review baseline: `f682e10`. Implementation: `da9d15b` on `integration/ai-tutor`.

## Changes

- Every Sol Responses operation validates aggregate input/output token totals. Contradictory usage retains the conservative allowance reservation.
- Picture interpretation checks the owned, unexpired activity's pause state under the same session lock used for admission. A picture that finishes uploading during a break remains available for interpretation after resuming.
- Picture confirmation and removal remain available after a failed or unsent reply. Reply retries wait until the picture is confirmed or removed.
- Context exhaustion persists a specific failure reason. The Learner receives guidance to save work and start another activity, and the server rejects futile retries. Ordinary provider failures retain their existing retry path.
- Portfolio reflection editing uses one shared browser/server eligibility rule. Saved audio permits an empty written reflection alongside a picture.
- Four tests no longer assert literal prompt wording. Existing data-selection, input/instruction separation, model, tool, and capability checks remain. Real-model teaching evaluation remains a separately gated activity.

Apply `migrations/15-coaching-failures.sql` through the normal migration command before deploying this application version. It adds a nullable context-limit reason to existing activity actions. No hosted migration or deployment was performed as part of these fixes.

## Validation

The agreed seam uses the browser and application API with real authentication and isolated PostgreSQL. Only external providers and capture devices use fictional fixtures.

Seven focused regression scenarios failed before their corresponding fixes and then passed:

- Text and image contradictory usage each settled incorrectly before the fix; both now retain the full unresolved hold and prevent another request from spending it.
- Interpretation after a paused upload previously returned success and contacted the provider; it now returns a recoverable pause response without dispatch and succeeds after resume.
- Confirmation and removal were each disabled after the upload/reply race and reload; both now allow the original reply to recover without a duplicate action.
- Context exhaustion previously displayed a generic service failure; its guidance now survives an application restart, blocks direct retries, and permits saving the last attempt before starting a new activity.
- A picture with saved audio previously could not clear an added written reflection; editing now preserves the picture and audio while clearing the optional text.

Typechecking passed throughout. The Next.js and eve production build completed successfully. The local build shell did not supply Better Auth's runtime URL/secret, so it emitted configuration warnings; authenticated browser scenarios use their own isolated runtime configuration.

`npm run test:browser`: all 100 scenarios passed (13.7 minutes). This full run was explicitly requested by the implement skill. It covered the complete existing suite, including all seven regression scenarios, without real provider calls or child data.

After the review's test-only helper cleanup, `npm run test:browser -- tests/image-coaching.spec.ts -g 'taking a break during upload|failed reply during upload'` passed all three affected scenarios. Final typechecking and whitespace checks also passed. No application behavior changed after the full-suite run.

## Standards

No remaining findings. The review's optional Duplicated Code observation in delayed-upload test setup was resolved with the file-local `holdPictureUpload` helper. A read-only follow-up confirmed that the helper preserves start observation, release, and cleanup.

## Spec

No findings. The independent review confirmed all five requested behavior fixes, preserved application boundaries, and no added scope.

Standards: 0 remaining findings, no worst issue. Spec: 0 findings, no worst issue.
