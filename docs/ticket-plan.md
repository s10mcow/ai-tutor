# AI tutor ticket breakdown

Status: Accepted for implementation and published to GitHub with `ready-for-agent` labels and native dependencies. See [tracker index](tracker-index.json).

Source: [AI tutor specification](spec.md), the [Glossary](../GLOSSARY.md), and the two existing ADRs. There is no application code to prefactor and no existing test suite to reuse.

## Implementation slices

Each linked draft contains its end-to-end behavior, direct blockers, acceptance criteria, source-story coverage, and a demo. A ticket's schema, application behavior, interface, and verification are delivered together.

| Ticket | Direct blockers | Observable delivery |
| --- | --- | --- |
| [01: Family workspace](ticket-drafts/01-private-family-workspace.md) | None | Private hosted access, two persistent Learner profiles, and isolated workspaces. |
| [02: Text coaching](ticket-drafts/02-text-coaching-session.md) | 01 | A typed question, small-step coaching, an example, and a Learner attempt. |
| [03: Model and usage controls](ticket-drafts/03-metered-model-access.md) | 02 | Supported Sol integration, visible readiness and usage, and enforced allowance handling. |
| [04: Activity discovery](ticket-drafts/04-interest-led-activities.md) | 02 | The Learner discovers and selects interests and activities independently. |
| [05: Reasoning and adaptive coaching](ticket-drafts/05-reasoning-and-adaptive-coaching.md) | 02 | Explanations, alternatives, changed teaching approaches, breaks, and fresh challenges. |
| [06: Learning continuity](ticket-drafts/06-learning-notes-and-return-visits.md) | 02 | Brief personal learning notes and useful next steps across visits. |
| [07: Short maths game](ticket-drafts/07-short-maths-game.md) | 04 | One playable maths game with feedback, hints, examples, and retries. |
| [08: Workbook and artwork images](ticket-drafts/08-workbook-and-artwork-images.md) | 03 | Upload, confirm or correct interpretation, and learn from paper work. |
| [09: Voice and text](ticket-drafts/09-spoken-and-typed-coaching.md) | 03 | Spoken input and replies alongside typed turns and visible work. |
| [10: Written Portfolio](ticket-drafts/10-written-portfolio-evidence.md) | 02 | Save learner-authored evidence and reflections, then choose entries to show. |
| [11: Picture Portfolio](ticket-drafts/11-picture-portfolio-evidence.md) | 08, 10 | Keep selected images and explanations together as lasting evidence. |
| [12: Spoken Portfolio](ticket-drafts/12-spoken-portfolio-evidence.md) | 09, 10 | Explicitly save, retain, and replay a chosen spoken reflection. |
| [13: Public-source research](ticket-drafts/13-public-sources-and-claim-checking.md) | 03 | Inspect actual public sources and check claims within the read-only capability boundary. |
| [14: Family pilot](ticket-drafts/14-activate-private-family-pilot.md) | 05, 06, 07, 11, 12, 13 | Verify external readiness, activate family use, and exercise both complete learning journeys. |

## Dependency rationale

- Ticket 01 can begin immediately after publication; ticket 02 establishes the shared session behavior used by later slices.
- Tickets 03, 04, 05, 06, and 10 can proceed independently once 02 is complete. Their order in the list is not an artificial serial dependency.
- Ticket 07 extends the activity-launch behavior in 04. Images, speech, and research depend on 03 because their provider calls must reuse the shared access and usage enforcement.
- Picture and spoken Portfolio entries need both their media interaction and the written Portfolio foundation. They do not depend on one another.
- The final pilot lists only terminal prerequisites. All other tickets are reached transitively; it does not add redundant blockers.
- No external API approval is required to implement and verify earlier slices with controlled providers and fictional Learners. Live-family activation stays gated in 14.

## Verification approach

Use the browser-facing application as the primary behavioral test boundary, including real application authorization and isolated test persistence. Replace external model, speech, and research services with controlled responses for deterministic scenarios. Each slice adds only the narrow scenarios needed for its behavior; avoid tests coupled to implementation details and avoid broad test-suite runs without a concrete reason.

A separate small real-model evaluation uses fictional cases through the same application boundary when authorized access is available. It checks educational behavior that a scripted provider cannot establish. The final pilot verifies account readiness and actual hosted integration before child data is used.

## Publication and implementation

The user invoked implement-spec, selected GitHub, and supplied the repository URL. All tickets are published under the [source specification](https://github.com/s10mcow/ai-tutor/issues/1). Work proceeds on `integration/ai-tutor` with separate implementer branches, targeted browser scenarios, and a merger agent. External activation criteria remain open until verified; completed local implementation is not evidence of hosted or live-family readiness.
