# 05: Practice reasoning and adapt unhelpful coaching

**What to build:** A Learner explains a strategy, considers another possibility, tests an idea, and tries a fresh challenge with less help. When an example is not helping, the Tutor changes approach and offers a manageable next step or a break.

**Blocked by:** 02 — Complete a typed coaching exchange.

**Status:** accepted for implementation; published issue linked in [tracker index](../tracker-index.json).

**Source stories:** 32, 33, 34, 35, 36, 37, 38, 39, 42, 43, 44.

- [x] The session supports asking for the Learner's reasons, comparing alternatives, checking supplied evidence, and revising an answer.
- [x] A correct result with an incorrect or missing explanation can lead to further exploration instead of an unsupported conclusion that the skill is mastered.
- [x] The Tutor offers a small fresh challenge when useful and allows an attempt with less support, retaining enough context to distinguish the coached example from the new attempt.
- [x] Continued difficulty or a simple statement of confusion can trigger a different example; a forceful complaint is not required. Do not infer emotions from unprovided sensor data.
- [x] The Learner can choose an easier starting point, a different explanation, or a break and return to the activity without losing their work.
- [x] Questioning the Tutor's answer is treated as a valid learning action, including revising the Tutor's claim when supplied evidence contradicts it.
- [x] Browser scenarios cover an incorrect explanation accompanying a correct answer, repeated confusion, an alternative approach, a break, and a fresh challenge. Use controlled provider outputs to test application behavior.
- [x] Define a small synthetic real-model evaluation for these same behaviors. Controlled fixtures do not count as proof of teaching quality; run the live evaluation when permitted access is ready for the pilot.

**Demo:** Submit a correct answer with weak reasoning, request another explanation, challenge a claim with fictional evidence, and try a related problem with less help.

**Scope:** Evidence can be supplied within the session, so live web research is not a blocker. No grading system or formal mastery certification is added.
