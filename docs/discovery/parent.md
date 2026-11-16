# Parent interview decisions

## Purpose and learning approach

- Build a dedicated browser tutor for two homeschooled children, ages 10 and 12, with separate learning histories.
- Host it as a private website that remains available when the parent's computer is switched off.
- Prioritize critical thinking and problem-solving: asking useful questions, explaining reasons, checking evidence, considering alternatives, and revising conclusions. Learners should also question the tutor.
- Include AI literacy as one subject rather than the main focus of every activity.
- Discover interests and choose activities with each child directly. Initial preferences are recorded in [the older learner's interview](learner-12.md) and [the younger learner's interview](learner-10.md).
- Support independent sessions without requiring the parent to choose topics or sit alongside the children.
- Use questions, hints, attempts, and explanations. Offer a fresh challenge with less help to check independent understanding.
- Complement existing homeschooling without a prescribed curriculum or grades in the initial version.

## Work and interaction

- Support voice and text, including spoken tutor replies.
- Let children upload images of workbook questions and artwork. Check the tutor's interpretation of the image before helping.
- Maintain portfolios of learner-created work, attempts, and reflections in their own words. Children choose what to show and explain to their parent; automatic parent reports are not the chosen reporting approach.
- Find and read public web sources and show where information came from. See [the web access decision](../adr/0001-read-only-web-access.md).

## Family access and memory

- Keep the first version private to the family, with one parent account and separate child profiles. The parent handles initial setup; children return independently to their own work.
- Retain portfolios and brief learning notes, including interests, useful teaching approaches, and next steps, separately for each learner.
- Save voice recordings only when a child deliberately adds one to their portfolio. Provider-side retention requirements still need to be verified separately from application storage.

## Model and cost preference

- The parent prefers GPT-6.1 Sol and intends to use the existing ChatGPT subscription.
- The parent confirmed a $200/month ChatGPT Pro subscription. This is the existing subscription cost, not authorization for an additional $200/month of charges.
- The funding target is the subscription's included API benefit, subject to eligibility and activation. No additional paid API allowance has been specified.
- The integration route remains unresolved. See [current model-access findings](model-access.md).
