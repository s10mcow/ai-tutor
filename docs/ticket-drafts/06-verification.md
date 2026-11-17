# Ticket 06 verification and continuity contract

## Delivered behavior

After a completed exchange, **Remember for next time** lets the Learner write or confirm three brief statements: an interest mentioned, an approach that helped, and a possible next step. Fields start blank for a first note; existing notes can be revised. Each is capped at 240 characters, optional individually, and explicitly labelled as the Learner’s own statements. No model summary, inferred mastery, ability label, or automatic preference extraction is produced. Saving makes no provider call.

**Learning notes** is a separate workspace view for editing and clearing notes. There is one replaceable record per family/Learner, with no accumulating history or session/action text copied into it. It is independent of temporary activities and Portfolio evidence. A returning Learner with a next step can **Continue my next step** or **Choose something new**. Continuing opens a fresh activity with an editable question, then the Learner sends it when ready. An already-live activity remains available through the existing current-session flow.

## Application and provider contract

- `GET /api/learners/:learnerId/notes` returns `{ notes }`, either null or `{ interest, helpfulApproach, nextStep, origin: "learner-stated" }`.
- `PUT` on that route replaces those three strings. A first save must include `sessionId` for a live activity with at least one completed action. Every supplied source reference is checked against the authenticated family and intended Learner, including when replacing existing notes. Editing existing notes without a session reference remains available after source end/expiry and without provider allowance.
- `DELETE` clears the record. It is safe to repeat. All operations authenticate the real family; mutations enforce same origin. Strings are bounded server-side and rendered as text. Origin is server assigned. The schema has a composite family/Learner foreign key and no relationship to temporary session deletion.
- `POST /api/learners/:learnerId/session` additionally accepts `{ resume: true }`. It resolves the intended Learner’s current saved next step on the server into a custom activity; client-supplied notes never authorize or populate it. Existing current-session conflict behavior is preserved.
- `TutorRequest.learningNotes` is the owned `LearningNotes | null`, loaded at authorized dispatch time. Clearing or editing applies to subsequent requests, including an existing activity. Both scripted and direct Sol adapters receive it. Sol includes notes as user data in its first context item, with explicit guidance that statements are not mastery/fixed-ability evidence, old interests remain optional, and the current chosen activity takes precedence. No profile name or prior transcript is added to the direct provider request. The existing request-size ceiling and metered text operation remain in force.

Clearing notes does not rewrite an already-sent temporary conversation or a next step the Learner has already chosen as their current question. End activity retains its existing immediate deletion semantics. Normal session logical expiry and cleanup scheduling/backup limitations remain ticket 02/14 responsibilities. Notes are not raw transcript or audio archives. Learner statements can be mistaken; they are represented as statements, never measured outcomes. Concurrent deliberate replacements are serialized and the last committed edit is current; there is no multi-version editing interface.

The workspace is keyed by Learner, and reads/saves abort on unmount. A committed save whose browser response is delayed remains tied to its original path and cannot populate the sibling’s view. An unconfirmed save can be retried with the same values while the source remains live, or inspected in Learning notes. Closing the dialog discards unsaved input.

## Verification

The accepted Playwright seam uses real Better Auth, application HTTP routes and isolated PostgreSQL. Only the external Tutor services and a deliberately delayed browser response are controlled. The create/return scenario failed at the missing save action before implementation; the edit/clear scenario failed at missing clear; direct Sol context failed because learning notes were absent before the adapter change.

`tests/learning-continuity.spec.ts` covers source end, web restart, a fresh browser visit, new-session context without the old conversation, declining the next step, editing/clearing, direct metered context and sibling isolation, notes with exhausted allowance, source/family authorization, bounds, same origin and switching during a committed-but-unconfirmed edit. Notes and Portfolio remain separate in the HTTP assertions.

React guidance was reviewed for separate components, browser-safe types, labelled form fields, a native modal, narrow effect dependencies, and request abort/unmount cleanup. The 1366×768 return and editor views were inspected; the original screenshot caught primary-button contrast and form-height problems, which were corrected. Final screenshot artifacts are stored outside the repository at `/tmp/ai-tutor-research/ticket06/`.

Local checks use Node 26.13.1 and fictional data. Five continuity scenarios and typecheck passed before integration. Final integrated checks are recorded below. No complete repository suite was run, and no live provider call, paid resource or real child data was used. Hosted availability, provider credit/retention readiness, cleanup/backups and actual teaching quality remain external activation gates.
