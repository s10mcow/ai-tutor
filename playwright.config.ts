import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    actionTimeout: 10_000,
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
});
