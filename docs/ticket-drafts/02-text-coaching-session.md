# 02: Complete a typed coaching exchange

**What to build:** A Learner can start a learning session, type a question, work through one small step with the Tutor, request a hint or example, and try an answer while the problem and conversation remain visible.

**Blocked by:** 01 — Open a private family learning workspace.

**Status:** accepted for implementation; published issue linked in [tracker index](../tracker-index.json).

**Source stories:** 19, 22, 26, 27, 28, 29, 30, 31, 34, 61.

- [x] A Learner can start a session from their workspace, submit a question, and receive a visible Tutor reply associated with that session.
- [x] The flow supports a small step, a requested hint or example, and a subsequent Learner attempt. Requests to slow down or try independently remain part of the same context.
- [x] The Learner can correct a misunderstood typed question and continue using the correction.
- [x] The active session remains usable across a browser reload without committing to indefinite conversation archiving. Keep live session context distinct from long-term learning notes.
- [x] A failed reply leaves the Learner's input available for a clear retry; retrying does not create duplicate turns or reinterpret a service failure as a wrong answer.
- [x] Switching profiles while a reply is pending prevents the old response from appearing in the new profile.
- [x] A controlled Tutor provider drives browser scenarios through the real application and persistence. Verify observable steps and session ownership rather than private helper calls or exact wording.

**Demo:** Ask a fictional maths question, request an example, submit an attempt, correct the question, and recover from a simulated failed reply.

**Scope:** Introduce the minimal internal provider boundary required to run this complete session. Live model access, activity discovery, persistent learning notes, and Portfolio saving are subsequent slices.
