# 03: Connect model access with visible usage controls

**What to build:** The parent can see whether model access is configured and funded, and an eligible learning session can use GPT-6.1 Sol within the available allowance. Missing eligibility, exhausted allowance, and provider errors produce an understandable unavailable state without additional paid fallbacks.

**Blocked by:** 02 — Complete a typed coaching exchange.

**Status:** accepted for implementation; published issue linked in [tracker index](../tracker-index.json).

**Source stories:** 57, 58, 59, 60, 61, 62.

- [x] The parent-facing setup state distinguishes missing credentials, unverified funding, exhausted allowance, and available access; it never reports activation merely because a Pro plan exists.
- [x] The hosted provider integration targets `gpt-6.1-sol` and keeps credentials server-side. No silent substitute model or local parent-computer dependency is introduced.
- [x] A session response and its measured usage travel through the same application boundary as the controlled-provider session.
- [x] Chargeable requests require an established allowance and reserve sufficient allowance before dispatch. Concurrent calls and retries cannot independently spend the same remaining allocation.
- [x] Report usage honestly and reconcile reservations after outcomes. Define how the budget accounts for subscription credits used elsewhere; a display-only budget or assumed untouched $200 balance is insufficient.
- [x] All future chargeable provider operations can use the same allowance enforcement. This slice implements and tests the text-model path; subsequent slices add their own operation costs.
- [x] A provider failure, missing entitlement, or exhausted allowance preserves the current work and readable application state. No auto-recharge, purchased-credit fallback, or extra paid service is enabled by this ticket.
- [x] Live-family eligibility is closed until the required account and retention evidence is verified. A parent-facing readiness display distinguishes code configuration from approved live-family access.
- [x] Browser scenarios with controlled provider responses verify success, rejection before dispatch, concurrent exhaustion, retries, and recoverable failure. They require no purchase or transmission of child data.

**Demo:** Run a fictional session against a controlled provider, observe the usage update, then exhaust the configured allowance and demonstrate that another chargeable call is prevented.

**Scope:** This ticket delivers the integration and enforceable states; it does not claim credits or obtain external approval. Real account verification and live-family activation belong to the final pilot ticket, so those dependencies do not block implementation with fictional fixtures.
