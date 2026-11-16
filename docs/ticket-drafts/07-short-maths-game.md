# 07: Play a short coached maths game

**What to build:** A Learner chooses a short maths game, makes actual interactive attempts, receives useful feedback, sees a small example when needed, and tries again.

**Blocked by:** 04 — Discover and choose learning activities.

**Status:** accepted for implementation; published issue linked in [tracker index](../tracker-index.json).

**Source stories:** 13, 27, 28, 29, 30, 34, 35.

- [ ] The activity chooser can launch one small, complete maths game appropriate to an initial topic discovered with the Learner.
- [ ] The game presents a concrete challenge, accepts an action or answer, evaluates an attempt, and reaches a visible completion state. A conversational promise to play a game does not satisfy the ticket.
- [ ] The Learner can ask for one hint or small example and then retry without the Tutor taking over the remaining work.
- [ ] Feedback can ask why a choice was made and supports another attempt rather than presenting a mistake as a technical failure.
- [ ] The session retains the challenge, attempts, and result sufficiently for coaching and subsequent evidence-saving features.
- [ ] Game content and answer checking agree; controlled cases include correct and incorrect attempts, a hint, an example, retry, and completion.
- [ ] A browser scenario plays the game from the activity chooser through completion using the real application boundary and test storage.

**Demo:** Launch a short game, make one incorrect attempt, request an example, explain a retry, and finish the activity.

**Scope:** Deliver one complete game interaction first. A catalogue of game genres, elaborate rewards, or a separate game platform is not required.
