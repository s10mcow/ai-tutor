# 10: Save and show Learning evidence in a Portfolio

**What to build:** A Learner chooses work from a learning session, adds a reflection in their own words, saves it to their Portfolio, and later opens selected entries to show and explain to their parent.

**Blocked by:** 02 — Complete a typed coaching exchange.

**Status:** accepted for implementation; published issue linked in [tracker index](../tracker-index.json).

**Source stories:** 45, 46, 47, 48, 51, 52, 55, 60.

- [x] A Learner can select an explanation, solution, attempt, or discovery from the current session to save as Learning evidence.
- [x] The Tutor may prompt a reflection about what was tried, why, and what changed the Learner's thinking; the saved reflection remains editable and in the Learner's own words.
- [x] The saved entry distinguishes the Learner's work from Tutor suggestions and does not present AI-written prose as the Learner's independent explanation.
- [x] Portfolio entries persist across new visits and can be opened individually when the Learner wants to show their parent.
- [x] Entries and direct retrieval operations are scoped to the correct family and Learner; switching profiles shows the corresponding Portfolio.
- [x] Retrying a save after a failed response does not create a duplicate entry or save it under another profile.
- [x] Reading existing entries remains available when the model provider is unavailable or allowance is exhausted.
- [x] A browser scenario saves an attempt and reflection, retries the save, returns in a fresh session, chooses an entry to show, and verifies sibling isolation and readable offline-provider state.

**Demo:** Save a written explanation and a reflection, return later, and let the Learner choose that entry to explain to a parent.

**Scope:** This slice saves written evidence. It does not wait for image handling, voice, learning notes, or a game; those features can later provide additional evidence.

Implementation evidence and media extension contracts: [ticket 10 verification](10-verification.md). Hosted/live-family activation remains separate.
