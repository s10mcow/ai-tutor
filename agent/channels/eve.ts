import { eveChannel } from "eve/channels/eve";
// Closed until app-owned learning sessions enforce family/Learner authorization.
// Do not add localDev(), none(), or OIDC as an authentication fallback.
export default eveChannel({ auth: [async () => null] });
