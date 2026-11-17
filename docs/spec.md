# AI tutor for independent learning and critical thinking

Status: Accepted for implementation; published as [GitHub issue #1](https://github.com/s10mcow/ai-tutor/issues/1).

Intended triage role on publication: `ready-for-agent`.

## Problem Statement

A parent wants their two homeschooled children, ages 10 and 12, to learn independently with an AI tutor. The main goal is developing Critical thinking and problem-solving: asking useful questions, explaining reasons, checking evidence, considering alternatives, and revising conclusions. Factual knowledge supports this goal but is not the primary measure of success. AI literacy should be one subject the children can explore, not the purpose of every lesson.

The children need different starting experiences. The 12-year-old enjoys mountain biking, especially the freedom of jumping, and wants a patient coach alongside them when workbook maths becomes frustrating. The 10-year-old enjoys painting and drawing on paper, finds maths boring, and prefers short games to make learning more enjoyable. Both want spoken interaction on a computer; the older child also wants typing. Their interests are starting points rather than permanent learning tracks.

The parent does not want to choose every topic, supervise ordinary sessions, or rely on automatic progress reports. The children should discover activities with the Tutor, produce Learning evidence in their own words, and choose what to show and explain to their parent. The experience must remain available when the parent's computer is switched off.

## Solution

Provide a private hosted browser application with one parent account and separate Learner profiles. Each Learner can continue earlier work or discover a new activity with the Tutor, using voice, text, and uploaded pictures of workbook questions or artwork.

The Tutor coaches through small steps, questions, hints, examples, and attempts. It changes its approach when an explanation is not helping and checks understanding with a fresh problem or explanation that requires less assistance. Learners can challenge the Tutor, examine public sources, and revise their thinking. Short maths games, workbook coaching, interest-led exploration, paper-art discussion, and AI literacy belong within the same learning experience.

Each Learner has a Portfolio of their own work, attempts, discoveries, and reflections. The Tutor helps them explain what they tried, why, and what changed their thinking. The Learner chooses what to save and what to show their parent. Brief learning notes preserve useful continuity separately for each child.

Use the parent's preferred GPT-6.1 Sol model with separate speech capabilities. Target eligible, activated API credits from the existing $200/month Pro subscription. Establish suitable hosted API access and the required under-13 data-retention controls before processing the children's personal data in the app. Those account prerequisites do not prevent building and testing the application with fictional fixtures.

## User Stories

1. As a parent, I want a private family application, so that my children have a learning space intended for them.
2. As a parent, I want one parent account with two separate Learner profiles, so that I can set up access without requiring separate child email accounts.
3. As a Learner, I want to return to my own profile independently after setup, so that I can learn without waiting for my parent to operate the app.
4. As a Learner, I want my work and learning history kept separate from my sibling's, so that the Tutor responds to my own interests and needs.
5. As a parent, I want the Tutor hosted independently of my computer, so that the children can use it when my computer is off.
6. As a Learner, I want a comfortable computer or laptop interface with room for my work, so that I can see a problem while discussing it.
7. As a Learner, I want the Tutor to ask what interests me, so that I have a say in what I learn.
8. As a Learner, I want concrete suggestions when I do not know what to work on, so that I can get started without my parent choosing for me.
9. As a Learner, I want to choose a different activity from the Tutor's suggestion, so that my earlier interests do not become a fixed track.
10. As a Learner, I want to continue previous work or start something new, so that I can follow both ongoing projects and new curiosity.
11. As the older Learner, I want to explore mountain-biking questions for their own sake, so that I can investigate something I enjoy.
12. As the older Learner, I want workbook maths help as a separate choice from biking exploration, so that I can get support without turning every hobby conversation into maths.
13. As the younger Learner, I want short maths games, so that maths can feel enjoyable and approachable.
14. As the younger Learner, I want to keep drawing and painting on paper, so that learning with the Tutor supports the way I already enjoy making art.
15. As a Learner, I want art activities that can remain focused on art, so that every creative activity does not need to become a maths exercise.
16. As a Learner, I want to explore AI literacy as an activity, so that I can learn to use AI thoughtfully alongside other subjects.
17. As a parent, I want the app to complement our existing homeschooling, so that I can use it without adopting a prescribed curriculum or grading system.
18. As a Learner, I want to speak to the Tutor, so that I can explain ideas naturally.
19. As a Learner, I want to type when I prefer, so that I can choose the interaction that suits the moment.
20. As a Learner, I want to hear the Tutor's replies, so that I can have spoken coaching while looking at my work.
21. As a Learner, I want to switch between voice and text within the same activity, so that changing input method does not restart the conversation.
22. As a Learner, I want the question and relevant work visible during spoken interaction, so that I can follow the explanation on screen.
23. As a Learner, I want to upload a picture of a workbook question, so that I can get help without retyping the entire exercise.
24. As a Learner, I want to upload a picture of artwork, so that I can discuss something I made on paper.
25. As a Learner, I want the Tutor to check its interpretation of an uploaded picture, so that we work on the actual question or artwork.
26. As a Learner, I want to correct a misunderstood question, image, or spoken message, so that an input mistake does not become a learning mistake.
27. As a Learner, I want one manageable step at a time, so that a difficult problem feels possible to approach.
28. As a Learner, I want a hint when I need a little help, so that I can still work out part of the solution myself.
29. As a Learner, I want a clear example when a hint is not enough, so that I have a concrete starting point.
30. As a Learner, I want a chance to try after seeing an example, so that I practice my own thinking.
31. As a Learner, I want to ask the Tutor to slow down or explain differently, so that I can control the pace of coaching.
32. As a Learner, I want the Tutor to change an unhelpful example when my responses show continued difficulty, so that I do not need to make a forceful complaint to get help.
33. As a Learner, I want to choose another example, an easier starting point, or a break when frustrated, so that I can recover without being pushed through the same explanation.
34. As a Learner, I want mistakes treated as information about what to try next, so that I can experiment with an approach.
35. As a Learner, I want to explain why I chose an answer or strategy, so that I practice reasoning rather than only supplying a result.
36. As a Learner, I want to consider another possible explanation or solution, so that I learn to compare alternatives.
37. As a Learner, I want to test an idea against evidence, so that I can decide whether it holds up.
38. As a Learner, I want to revise a conclusion when evidence changes, so that changing my mind becomes part of learning.
39. As a Learner, I want to question the Tutor's answers, so that I do not treat AI as an unquestionable authority.
40. As a Learner, I want the Tutor to show the public sources it uses, so that I can inspect where a claim came from.
41. As a Learner, I want the Tutor to acknowledge uncertainty or a source it could not verify, so that unsupported confidence does not substitute for evidence.
42. As a Learner, I want a small fresh challenge with less help after guided work, so that I can find out what I can do independently.
43. As a parent, I want a correct answer without an explanation to lead to further exploration when appropriate, so that apparent success is not mistaken for understanding.
44. As a parent, I want progress reflected in reasoning and independent attempts, so that time spent, message counts, and polished AI output are not used as substitutes for learning.
45. As a Learner, I want to save an explanation, solution, or creation to my Portfolio, so that I have Learning evidence to revisit and show.
46. As a Learner, I want to include attempts and discoveries, so that my Portfolio can show how my thinking developed.
47. As a Learner, I want help reflecting on what I tried, why I tried it, and what changed my thinking, so that I can explain my learning.
48. As a Learner, I want my reflections to remain in my own words, so that the Portfolio represents my understanding.
49. As a Learner, I want to deliberately save a spoken reflection when I choose, so that my Portfolio can include explanations I prefer to say aloud.
50. As a Learner, I want ordinary voice interaction to remain distinct from saving a recording, so that speaking to the Tutor does not automatically create a permanent audio collection.
51. As a Learner, I want to choose which Portfolio entries to open and show my parent, so that I can explain my work myself.
52. As a parent, I want my children to demonstrate their learning directly, so that I can hear their reasoning through what they choose to share.
53. As a Learner, I want the Tutor to remember relevant interests and approaches that helped me, so that each visit has useful continuity.
54. As a Learner, I want a brief record of possible next steps, so that I can resume learning without reconstructing everything from scratch.
55. As a parent, I want learning notes, Portfolio entries, and saved media associated with the correct child, so that one child's information does not shape or appear in the other's session by mistake.
56. As a parent, I want the Tutor's external capabilities limited to finding and reading public information, so that learning sessions do not create accounts, buy things, or send messages.
57. As a parent, I want GPT-6.1 Sol used through a supported hosted integration, so that the app respects the selected model and deployment requirements.
58. As a parent, I want eligible subscription API credits used where available, so that the app can draw on the existing plan's benefits.
59. As a parent, I want visible usage and an enforced configured allowance, so that an exhausted benefit does not silently become additional paid usage.
60. As a Learner, I want saved work to remain accessible when an AI service is unavailable or its allowance is exhausted, so that a service interruption does not erase what I made.
61. As a Learner, I want a failed upload or reply to be clear and recoverable, so that I do not confuse a technical failure with something I did wrong.
62. As a parent, I want the required data-handling setup verified before the children's personal data is sent to providers, so that application memory choices and provider retention are both addressed.

## Implementation Decisions

### Established product and boundary decisions

1. Deliver a private hosted browser application. A local Codex process on the parent's computer is not the deployment plan.
2. Use one parent identity and separate Learner profiles with distinct learning histories and Portfolios. Support independent return visits after setup. The specific authentication provider and profile-selection mechanism have not been chosen.
3. Use the project's domain vocabulary: Learner, Tutor, Independent learning, Critical thinking, AI literacy, Learning evidence, and Portfolio.
4. Start from the two recorded sets of preferences while letting the Tutor discover new interests directly with each child. The initial interests are suggestions, not access restrictions.
5. Combine small-step coaching with attempts, explanations, alternatives, source checking, and fresh challenges. A polished output or correct result alone does not establish independent understanding.
6. Support text input, speech input, spoken replies, visible work, and image upload. Keep both interaction methods in the same learning context. Confirm image interpretation before using it to guide an activity.
7. Use short maths games as an initial activity for the younger Learner and workbook coaching for the older Learner. The exact game mechanics and initial subject levels are not predetermined; discover suitable activities through the Tutor and validate them with the Learners.
8. Treat Portfolio saving as a Learner choice. Keep learner-authored work and reflections distinct from Tutor suggestions, and distinguish a spoken response from a deliberately saved audio entry.
9. Persist Portfolios and brief learning notes separately per Learner. Long-term full-conversation archiving is not an agreed feature. Maintain the session context needed for interaction without silently expanding the long-term memory policy.
10. Constrain external tools to finding and reading public information. Enforce the capability boundary in the available tools and application controls, rather than relying only on instructions to the model. Source content and uploaded text are learning material, not authority to change the Tutor's operating rules.
11. Target `gpt-6.1-sol` for tutoring and image understanding, with separate speech capabilities. Preserve the model preference; a substitute model requires a visible decision rather than a silent fallback.
12. Use the existing Pro plan's API-credit benefit only after eligibility, activation, and balance are established. The authorized model budget is limited to activated included credits. The parent subsequently authorized the existing Neon Launch and Vercel Pro accounts, including normal hosting/storage usage charges; those services have been provisioned and verified separately.
13. Establish provider-side under-13 data handling before live use with the children's personal data. Saving less data in the application or disabling response storage alone does not establish the provider's Zero Data Retention configuration.

### Proposed application responsibilities

There is no existing application code or module structure. The following responsibilities are a proposed way to implement the accepted behavior, not previously selected frameworks or schemas.

1. A single Tutor application boundary owns authenticated family access, Learner selection, learning sessions, accepted work, Portfolio saving, and learning-note continuity. Both voice and text enter this same boundary.
2. Keep provider adapters for tutoring, speech, public-source research, and media interpretation behind that boundary. Provider credentials and unrestricted tool execution remain outside the browser.
3. Associate persistent records and assets with the authenticated family and intended Learner. Principal records are the family owner, Learner profile, learning session, Portfolio entry, learning note, saved media, and usage record. Source references and attempts can belong to a session or Portfolio entry without requiring separate public modules.
4. Derive access from the authenticated identity and validate Learner ownership server-side. Profile switching must also switch session context, media access, memory retrieval, and pending responses; stale results must not appear in a different Learner's view.
5. Expose the operations needed to start or resume learning, submit a message or image, confirm or correct an interpretation, receive a reply, save selected evidence, and retrieve a Portfolio. Final endpoint naming and transport are implementation details.
6. Make retries of saving work safe against accidental duplicates. Keep failed interpretation, failed generation, and failed persistence distinguishable to the Learner, with recoverable UI state.
7. Enforce the configured usage allowance before issuing chargeable calls and account for tutoring, speech, images, and research. Do not rely on a display-only budget or an assumption that the entire subscription benefit remains unused by other applications. If credit eligibility or allowance cannot be established, keep chargeable features unavailable while preserving access to saved work.
8. Choose the framework, database, storage, authentication service, hosting service, and speech provider during implementation based on supported capabilities and the recorded constraints. No prototype has established an alternative state machine or schema, and no specific technology selection is asserted by this spec.

## Testing Decisions

### Proposed primary test boundary

Use one primary behavioral boundary: the public application as exercised from the browser, through its backend, authorization, and test persistence. This is the highest practical seam for the requested experience. Replace external AI, speech, and research services with controlled adapters for repeatable automated scenarios; do not mock internal application modules merely to test their wiring.

The user's implementation request adopts this reviewed application boundary. Use it for the ticket implementations.

### What makes a good test

- Assert outcomes a Learner or parent can observe, plus externally meaningful guarantees such as access isolation, saved-work persistence, retained assets, and allowed external calls.
- Exercise real application authorization and an isolated test datastore. Provider fixtures supply known outputs or failures without bypassing the application logic under test.
- Use fictional Learners, workbook images, and artwork. Do not use the children's personal data to develop or evaluate provider integrations before the required account setup is verified.
- Assert behavior and meaning rather than exact Tutor wording, component trees, private helpers, or prompt-string snapshots.
- Test the smallest complete flow that demonstrates the behavior. Use scenario- or file-scoped commands; a full test-suite run is warranted only when targeted coverage cannot usefully cover a broad shared change.

### Behavioral coverage

1. Family setup, independent return, and learner isolation: establish two profiles, create work and notes in one, switch profiles, and verify the other cannot retrieve them or receive an in-flight response for the first. Also verify unauthorized access cannot retrieve the family's records or assets.
2. Workbook coaching: upload a readable question, review its interpretation, correct a deliberately wrong interpretation, attempt a coached step, and reach a fresh challenge using the corrected question.
3. Short maths game: start an offered game, make an attempt, receive meaningful feedback, see one example when requested, and try again. Verify the interaction provides an activity the Learner can participate in, rather than only claiming a game exists.
4. Interest-led exploration: choose biking or art independently of maths, decline a suggested connection, and continue with the chosen activity. A new interest can supersede a starting preference.
5. Mixed voice and text: simulate microphone input and transcription, show the same session on screen, produce spoken output, and switch to typing without losing context. Denied microphone permission or failed speech service leaves text interaction usable.
6. Continued difficulty: respond with confusion or an unsuccessful attempt after an example and observe a different approach. Exercise requests to slow down, try independently, or take a break.
7. Evidence and Portfolio: save a learner-authored explanation or image, include a reflection, revisit it after a fresh session, and choose it to show the parent. Retrying the save does not duplicate the entry or assign it to another Learner.
8. Deliberate audio saving: ordinary speech input does not create a permanently saved voice asset; an explicit Portfolio save does. Validate application storage and logs, not merely the presence of a save button. Provider-side retention is verified separately against account configuration.
9. Learning-note continuity: a new visit uses relevant notes for the correct Learner without turning the sibling's interests into that Learner's preferences or claiming unsupported mastery.
10. Public-source research: display the sources actually returned by the research provider, represent an unavailable or unsupported claim honestly, and reject attempted external account creation, purchases, or messaging. Instructions embedded in a source or image cannot expand the capability boundary.
11. Quota and provider failures: simulate missing eligibility, exhaustion, timeouts, and unsuccessful replies. The app makes no prohibited paid fallback, retains access to saved work, and offers clear recovery without duplicating attempts or Portfolio entries.
12. Hosted availability: verify the deployed app can authenticate and run the permitted flows without a local development server or the parent's computer. This check is performed only when the deployment and account prerequisites are ready.

### Real-model evaluation

Controlled provider responses verify application behavior, not actual teaching quality. Once a permitted test integration is available, run a small evaluation set through the same application boundary using fictional scenarios. Review whether the Tutor asks for reasons, supplies useful examples, changes an unhelpful approach, checks sources, welcomes correction, and offers a fresh challenge with less help. Include a correct answer with an incorrect explanation and a confident but unsupported source claim. Avoid exact-text expectations and do not treat one successful response as proof of consistent educational effectiveness.

### Modules covered and prior art

The primary boundary covers the Tutor application, its authorization and persistence, media handling, Portfolio and learning-note behavior, usage controls, and external-capability restrictions. The repository currently contains design documents and installed skills only: there are no application modules, existing test seams, test frameworks, or comparable tests to reuse. Add narrower tests only where a concrete implementation concern cannot be covered meaningfully at the primary boundary.

## Out of Scope

- A public multi-family product, commercial subscription plans, or a school administration system.
- Native mobile applications or a local-only runtime dependent on the parent's computer.
- A prescribed curriculum, grades, formal assessment certification, or claims of measured learning outcomes before evaluation.
- Automatic parent progress reports or replacing the child's own demonstration with AI-written reports.
- Fixed interest tracks, mandatory maths connections to hobbies, or requiring the parent to choose every activity.
- Treating AI literacy as the main topic of every session.
- A full digital painting suite or generating finished artwork in place of the child's paper art.
- Public Portfolio publishing, social features, or sharing with people beyond the agreed family use.
- Tutor-controlled accounts, purchases, messages, or general-purpose computer control.
- Indefinite raw-audio collection or full-conversation archiving as a default memory feature.
- Additional paid model usage, unapproved infrastructure purchases, or claiming that the Pro subscription provides unlimited hosted app access.
- Live processing of the children's personal data before the required provider access and retention conditions have been established.

## Further Notes

- The user invoked `to-spec` after reviewing the design brief. This document synthesizes the agreed product direction and the two Learners' separate preferences; it does not reopen the product interview.
- The specification and 14 implementation tickets are published in the user-selected GitHub repository. See [tracker index](tracker-index.json) for issue links and native blocker relationships.
- The implementation request adopts the browser-facing test boundary described above. Framework and implementation choices are made within each slice.
- The proposed session flow and application responsibilities are implementation guidance derived from the agreed behavior. The first usability trial should validate the Learners' experience of uploading paper work, speaking to the Tutor, and interacting with a short game.
- Model, subscription, and data-retention findings were checked against official documentation on 2026-11-16. Recheck eligibility and account state during setup rather than assuming that the documented benefit has already been claimed.
- OpenAI documents the preferred model's text and image input and text output, eligible Pro API-credit benefits, and under-13 data-handling requirements. Relevant sources are [GPT-6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol), [subscription API credits](https://developers.openai.com/api/docs/guides/chatgpt-api-credits), [under-18 API guidance](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance), and [data-retention controls](https://developers.openai.com/api/docs/guides/your-data#data-retention-controls-for-abuse-monitoring).
- Local references: [design brief](design-brief.md), [parent decisions](discovery/parent.md), [older Learner interview](discovery/learner-12.md), [younger Learner interview](discovery/learner-10.md), [model-access findings](discovery/model-access.md), [Glossary](../GLOSSARY.md), [read-only web access ADR](adr/0001-read-only-web-access.md), and [hosted application ADR](adr/0002-host-the-family-tutor.md).
