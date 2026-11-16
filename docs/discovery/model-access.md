# Model access findings

Checked against official documentation on 2026-11-16. These are feasibility findings, not a selected architecture.

- [GPT-6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol) has the model identifier `gpt-6.1-sol`, accepts text and images, and outputs text. Voice needs a separate speech capability.
- [Codex app-server authentication](https://learn.chatgpt.com/docs/app-server#auth-endpoints) supports local/open-source custom integrations with ChatGPT authentication; commercial and hosted services require a different supported route. This does not establish that the parent's subscription covers independent use by children.
- [Sign in with ChatGPT preview restrictions](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations) exclude audio input and transcription through that flow. Subscription allowance and model entitlement still apply.
- Eligible Pro and Business subscriptions can claim [API credits](https://developers.openai.com/api/docs/guides/chatgpt-api-credits), which cover Responses, voice APIs, and other supported API usage. The parent confirmed the $200/month Pro tier, which is listed for $200 in API credits per billing cycle once eligible and activated; the first grant is prorated. Eligibility also requires a paid subscription at least seven days old, matching account email, and ownership of the linked API organization. Activation and available balance have not been verified. No credits have been claimed.
- OpenAI's [under-18 API guidance](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance) says not to process personal data of children under 13 without first implementing zero data retention in the API. Both intended learners are under 13. An eligible data-handling route must be established before using their personal data in the app; omitting local audio storage or setting `store: false` does not establish provider-side zero data retention.
- [Zero Data Retention controls](https://developers.openai.com/api/docs/guides/your-data#data-retention-controls-for-abuse-monitoring) require prior OpenAI approval and have endpoint-specific limitations. Availability for this account has not been established.

The parent selected a private hosted website that remains available when their computer is switched off. The local subscription integration is therefore not the selected deployment approach.

Remaining setup checks: API-credit activation and balance, supported authorization and provider-side retention for the intended users, speech integration, and enforcement of the available included-credit budget. No additional paid allowance has been authorized.
