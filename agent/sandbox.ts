import { defineSandbox } from "eve/sandbox";
import { defineSandboxProvider } from "eve/sandbox/provider";

// An explicit provider prevents eve's automatic Docker/Vercel template creation.
// No commands, files, containers, or paid sandbox resources can be created.
const DisabledSandbox = defineSandboxProvider({
  name: "learning-studio-disabled",
  environment() {
    return {
      async prepare() {
        return { disabled: true };
      },
      async start(): Promise<never> {
        throw new Error("Sandbox access is disabled for the Learning Studio.");
      },
      async resume(): Promise<never> {
        throw new Error("Sandbox access is disabled for the Learning Studio.");
      },
      async onSessionEnd() {},
    };
  },
});
export const environment = DisabledSandbox.environment();
export default defineSandbox(() => environment.open());
