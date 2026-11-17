# Implementation coordination

The user invoked implement-spec after the spec and 14-ticket review, then selected the GitHub repository and explicitly requested the initial push. Implement the existing spec and graph on `integration/ai-tutor`.

## Context pointers

- Product behavior: [specification](spec.md), [glossary](../GLOSSARY.md), and [ADRs](adr/).
- Task graph: [ticket plan](ticket-plan.md); each ticket draft remains a stable local description and the tracker index records its GitHub issue.
- Tracker operations: [issue tracker](agents/issue-tracker.md) and [triage labels](agents/triage-labels.md).
- Research: `/tmp/ai-tutor-research/architecture.md` holds shared implementation research outside the repository.

## Worktree discipline

Use a fresh implementer for each ticket, in its own worktree and branch created from the current integration tip. Confirm the base before editing. Read the TDD skill and its test/mocking references. Commit the ticket work, merge the latest integration tip into the ticket branch, rerun the necessary targeted checks, and report commit, tests, and unmet criteria. A separate merger agent integrates the completed branch. Do not edit another worktree or branch.

## Test boundary and verification

The implementation request covers the reviewed spec and ticket plan, including their browser-facing application boundary. Exercise the real application authorization and isolated persistence; substitute controlled external model, speech, and research services. Add one failing behavioral test before its implementation, then proceed to the next behavior. Avoid tests of private functions or internal call sequences.

Prefer the narrowest scenario- or file-scoped test command for the changed behavior. A broad suite requires a specific shared-behavior reason and an explanation before running. Build/setup overhead does not justify widening tests. Use fictional learners and media until live-family prerequisites are verified.

Run relevant compilation/build checks. Later ticket changes should not convert a real dependency into a fake or remove required assertions merely to pass. Report external account and deployment limitations accurately; never mark unmet live criteria complete.

## Product and interface direction

Build a coherent, accessible Learning Studio for computer use: warm paper backgrounds, legible dark text, clear color accents, generous spacing, and large obvious controls. Keep the task or work visible beside the coaching conversation. Avoid babyish visual treatment. The two learners have different starting interests, not different access to app features. All controls shown as actions must work.

Private family access, profile isolation, server-side credentials, explicit Portfolio saves, and the read-only external capability boundary apply from the first slice that handles the corresponding data. Real-family AI access is closed until the required account readiness is established. A clearly labeled fictional-data preview supports development without claiming live teaching readiness.
