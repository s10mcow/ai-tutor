import { spawn } from "node:child_process";
import { loadEnvFile } from "node:process";

try {
  loadEnvFile(new URL("../.env", import.meta.url));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
// Load the root .env without putting --env-file in execArgv. Next.js propagates
// execArgv to build workers via NODE_OPTIONS, which cannot contain that flag.
const child = spawn(process.execPath, process.argv.slice(2), {
  stdio: "inherit",
  env: process.env,
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal === "SIGINT" ? 130 : 1);
});
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
