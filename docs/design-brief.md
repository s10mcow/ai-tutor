# AI tutor design brief

Status: Draft for final review after the parent and learner interviews.

## Purpose

Build a private browser tutor for two homeschooled children, ages 10 and 12. Its main purpose is to develop critical thinking and problem-solving through activities the children help choose. Success means a learner can explain a reason, check evidence, consider alternatives, revise an idea, or approach a fresh problem with less help.

The tutor complements existing homeschooling. A prescribed curriculum, grades, and automatic parent reports are outside the initial scope. AI literacy is one topic to explore, alongside other interests.

## Shared learning experience

- Discover interests with each learner and offer concrete activities they can choose between.
- Coach in small steps, with hints and clear examples followed by a chance to try.
- Change an explanation when it is not helping. Offer another example, an easier starting point, or a break when appropriate.
- Invite learners to question the tutor and inspect sources. Check understanding with a fresh challenge, including when an earlier answer was correct but its reasoning was unclear.
- Support speaking and typing, spoken tutor replies, and visible problems and work on screen.
- Accept pictures of workbook questions and artwork. Check that the tutor understood the image before offering help.
- Support independent sessions after the parent's initial setup.

## Starting preferences

| Learner | Initial interests and activities | Coaching and device preferences |
| --- | --- | --- |
| Age 12 | Mountain biking exploration and help with maths from a workbook, as separate choices | A patient coach; small steps and examples; laptop; speaking or typing with spoken replies |
| Age 10 | Short maths games, plus drawing and painting on paper | One small example before trying; computer; prefers speaking |

These are starting preferences, not fixed tracks. Both children can discover new interests and choose other activities.

## Showing learning

Each learner has a portfolio of their own explanations, solutions, creations, attempts, and discoveries. The tutor helps them reflect on what they tried, why they tried it, and what changed their thinking, in their own words. Learners choose what to show their parent and explain it themselves.

Retain portfolios and brief learning notes separately for each learner. Notes can include interests, teaching approaches that helped, and next steps. Save a voice recording only when the learner deliberately adds it to their portfolio.

## Access and capabilities

Use a private hosted website with one parent account and separate learner profiles. It remains available when the parent's computer is off.

The tutor can find and read public web sources and show where information came from. Creating accounts, making purchases, and sending messages are outside its capabilities. See the [web access decision](adr/0001-read-only-web-access.md) and [hosting decision](adr/0002-host-the-family-tutor.md).

## Proposed session flow

1. Open the learner's profile and continue previous work or choose a new activity.
2. Talk or type with the tutor; add an image when useful.
3. Explore, attempt, explain, check, and revise, with coaching adapted to the learner's responses.
4. Try a fresh challenge when it helps establish understanding.
5. Choose work or a reflection to save to the portfolio and a possible next step.

This flow is a design proposal for review, not an implemented product.

## Model, funding, and readiness

The parent prefers `gpt-6.1-sol` and has the $200/month ChatGPT Pro plan. Target the plan's included API-credit benefit, once eligible and activated, for model and speech usage. This is not an additional $200/month spending authorization. Hosting and storage availability must be checked separately.

Before using the app with the children's personal data, establish a supported API setup with the required under-13 data-retention controls. Verify credit activation, usable balance, model and speech access, and quota handling. Application storage choices alone do not establish provider-side retention settings. Findings and official sources are in [model access](discovery/model-access.md).

## Interview records and terminology

- [Parent decisions](discovery/parent.md)
- [Age 12 interview](discovery/learner-12.md)
- [Age 10 interview](discovery/learner-10.md)
- [Glossary](../GLOSSARY.md)
