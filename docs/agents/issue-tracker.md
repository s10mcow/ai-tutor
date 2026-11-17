# Issue tracker: GitHub

Specs and implementation tickets live in https://github.com/s10mcow/ai-tutor/issues. Use the authenticated GitHub CLI in this repository, with `s10mcow/ai-tutor` as the explicit target when working from elsewhere.

Create one issue per spec or ticket using a body file for multiline Markdown. Apply the configured `ready-for-agent` role to implementation-ready work. Link implementation tickets to the spec using GitHub sub-issues and express blockers using native issue dependencies.

The implementation frontier consists of open tickets whose blocking code and tests are complete. Ordinarily their blocking tickets are closed. When a blocker has only an external activation criterion pending, keep it open, record that limitation, and allow dependent fictional-data development to proceed; ticket 14 explicitly says external prerequisites must not halt earlier development. Claim work by assigning it to the current owner, and verify its acceptance criteria before treating it as resolved. Implementation happens on the integration branch; merge each ticket branch only after its targeted checks pass.

Close implementation tickets with a concrete outcome and validation evidence after their work is integrated. Keep externally blocked live-pilot work open. A draft integration PR links the source spec and all tickets; mark it ready only when the requested work and review are complete. Never close an incomplete parent spec.

PRs as a request surface: no.
