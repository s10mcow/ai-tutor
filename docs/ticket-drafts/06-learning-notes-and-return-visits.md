# 06: Resume learning with brief personal notes

**What to build:** A returning Learner can continue a useful next step, and the Tutor remembers relevant interests and approaches that helped that Learner without inheriting the sibling's history.

**Blocked by:** 02 — Complete a typed coaching exchange.

**Status:** accepted for implementation; published issue linked in [tracker index](../tracker-index.json).

**Source stories:** 10, 53, 54, 55.

- [x] A completed or paused learning exchange can retain brief notes about an expressed interest, an approach that helped, and a possible next step.
- [x] A new visit can present the next step and use the correct Learner's notes in the new session.
- [x] The Learner can choose something new instead of accepting the previous next step.
- [x] Notes reflect observed or stated information and do not infer mastery, fixed ability, or preferences unsupported by the exchange.
- [x] Persistent memory remains brief learning notes rather than silently archiving every conversation or raw recording.
- [x] Server-side ownership checks protect note retrieval and updates; profile switching cannot send the prior Learner's notes into a new session.
- [x] Browser scenarios create notes through a session, open a fresh visit, resume or decline the next step, and verify sibling isolation against the real test datastore.

**Demo:** Finish a fictional learning exchange, return later to its proposed next step, then switch profiles and show that the notes do not transfer.

**Scope:** Notes can arise from any text coaching exchange, so activity discovery, games, and Portfolios are not prerequisites.
