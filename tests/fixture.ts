import { test as base, expect } from "@playwright/test";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:net";

import { controlledTutor } from "./tutor-provider";

const pgBin = process.env.TEST_PG_BIN ?? "/opt/homebrew/opt/postgresql@16/bin";
async function freePort() {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test port");
  const port = address.port;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}
export const test = base.extend<{
  app: { url: string; restart: () => Promise<void> };
  tutor: Awaited<ReturnType<typeof controlledTutor>>;
  sessionRetentionSeconds: number;
  controlledTutorEnabled: boolean;
}>({
  sessionRetentionSeconds: [86400, { option: true }],
  controlledTutorEnabled: [true, { option: true }],
  tutor: async ({}, use) => {
    const tutor = await controlledTutor();
    try {
      await use(tutor);
    } finally {
      await tutor.close();
    }
  },
  app: [
    async (
      { tutor, sessionRetentionSeconds, controlledTutorEnabled },
      use,
      testInfo,
    ) => {
      const directory = await mkdtemp(
        path.join(tmpdir(), "learning-studio-test-"),
      );
      const databasePort = await freePort();
      const appPort = await freePort();
      const url = `http://127.0.0.1:${appPort}`;
      let processHandle: ChildProcess | undefined;
      let output = "";
      const env = {
        ...process.env,
        DATABASE_URL: `postgresql://test_parent@127.0.0.1:${databasePort}/postgres`,
        BETTER_AUTH_URL: url,
        BETTER_AUTH_SECRET:
          "fictional-tests-only-5ea59727371e4da89cef7754b1c6e381",
        FAMILY_SETUP_EMAILS: "parent@example.test,other@example.test",
        FAMILY_SETUP_CODE: "fictional-family-invite",
        NEXT_TELEMETRY_DISABLED: "1",
        TUTOR_PREVIEW_URL: controlledTutorEnabled ? tutor.url : "",
        TUTOR_SESSION_RETENTION_SECONDS: String(sessionRetentionSeconds),
      };
      async function stop() {
        if (
          processHandle?.pid &&
          processHandle.exitCode === null &&
          processHandle.signalCode === null
        ) {
          const ended = new Promise<void>((resolve) =>
            processHandle!.once("exit", () => resolve()),
          );
          const pid = processHandle.pid;
          process.kill(-pid, "SIGTERM");
          const deadline = setTimeout(() => {
            try {
              process.kill(-pid, "SIGKILL");
            } catch {
              /* already stopped */
            }
          }, 5000);
          await ended;
          clearTimeout(deadline);
        }
      }
      async function start() {
        output = "";
        const args =
          process.env.TEST_APP_MODE === "services"
            ? [
                "scripts/with-env.mjs",
                "node_modules/vercel/dist/vc.js",
                "dev",
                "--local",
                "--listen",
                String(appPort),
                "--yes",
              ]
            : [
                "node_modules/next/dist/bin/next",
                "dev",
                "apps/web",
                "--hostname",
                "127.0.0.1",
                "--port",
                String(appPort),
              ];
        processHandle = spawn(process.execPath, args, {
          env,
          detached: true,
          stdio: "pipe",
        });
        processHandle.stdout?.on("data", (chunk) => {
          output += chunk;
        });
        processHandle.stderr?.on("data", (chunk) => {
          output += chunk;
        });
        for (let attempt = 0; attempt < 120; attempt++) {
          if (processHandle.exitCode !== null) throw new Error(output);
          try {
            if ((await fetch(url, { signal: AbortSignal.timeout(2000) })).ok)
              return;
          } catch {
            /* server starting */
          }
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        throw new Error(`Test application did not start: ${output}`);
      }
      try {
        execFileSync(
          path.join(pgBin, "initdb"),
          [
            "-D",
            `${directory}/pg`,
            "-U",
            "test_parent",
            "-A",
            "trust",
            "--no-locale",
          ],
          { stdio: "pipe" },
        );
        execFileSync(
          path.join(pgBin, "pg_ctl"),
          [
            "-D",
            `${directory}/pg`,
            "-l",
            `${directory}/postgres.log`,
            "-o",
            `-h 127.0.0.1 -p ${databasePort} -k ${directory}`,
            "-w",
            "start",
          ],
          { stdio: "pipe" },
        );
        execFileSync(process.execPath, ["scripts/migrate.ts"], {
          env,
          stdio: "pipe",
        });
        await start();
        await use({
          url,
          restart: async () => {
            await stop();
            await start();
          },
        });
      } finally {
        if (testInfo.status !== testInfo.expectedStatus)
          await testInfo.attach("application-log", {
            body: output,
            contentType: "text/plain",
          });
        await stop();
        try {
          execFileSync(
            path.join(pgBin, "pg_ctl"),
            ["-D", `${directory}/pg`, "-m", "immediate", "-w", "stop"],
            { stdio: "pipe" },
          );
        } catch {
          /* already stopped */
        }
        await rm(directory, { recursive: true, force: true });
      }
    },
    { timeout: 90_000 },
  ],
  baseURL: async ({ app }, use) => use(app.url),
});
export { expect };
