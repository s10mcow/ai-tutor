# 01: Open a private family learning workspace

**What to build:** A parent can sign in, create two Learner profiles, and let each Learner open their own learning workspace on a computer. The private application runs on hosted infrastructure independently of the parent's computer.

**Blocked by:** None (can start immediately).

**Status:** implemented and verified locally and on the private hosted fictional-data preview. See [verification](01-verification.md) and the published issue in the [tracker index](../tracker-index.json).

**Source stories:** 1, 2, 3, 4, 5, 6, 55.

- [x] The parent can establish the family account and two distinct Learner profiles without creating child email accounts.
- [x] An authenticated family session can return to the selected Learner's workspace without repeating parent setup on every visit.
- [x] Profile records persist across browser reloads and new application processes; a computer-sized workspace visibly identifies the selected Learner.
- [x] Unauthenticated requests cannot read family records. Server-side ownership checks reject access to another family's records, including manipulated identifiers.
- [x] Switching Learners changes the active workspace and clears pending or visible state belonging to the prior Learner.
- [x] A private hosted preview can be opened without a local development server or the parent's computer. Use fictional profiles while live-family readiness remains incomplete.
- [x] A browser-driven scenario exercises parent setup, persisted profiles, a return visit, switching, and unauthorized access through the real application boundary and isolated test storage.

**Demo:** Sign in, create two fictional Learners, reload, select each workspace, and demonstrate that unauthorized access is rejected on the hosted preview.

**Scope:** Establish the smallest application and test setup required for this behavior. Select and document the implementation stack as part of the slice; do not introduce separate framework, database, or UI-only setup tickets. Model calls and live child data are not needed.
