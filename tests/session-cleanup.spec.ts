import { test, expect } from "./fixture";

test("hourly cleanup requires its own secret, deletes idle expired sessions, and fails honestly", async ({
  page,
  app,
}) => {
  const endpoint = "/api/cron/purge-sessions";
  expect((await page.request.get(endpoint)).status()).toBe(401);
  expect(
    (
      await page.request.get(endpoint, {
        headers: { authorization: "Bearer undefined" },
      })
    ).status(),
  ).toBe(401);
  await page.goto("/");
  await page.getByRole("button", { name: "Set up family access" }).click();
  await page.getByLabel("Parent email").fill("parent@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Fictional-parent-password-42");
  await page.getByLabel("Family setup code").fill("fictional-family-invite");
  await page.getByRole("button", { name: "Create family account" }).click();
  await page.getByLabel("Learner name").fill("River");
  await page.getByRole("button", { name: "Add Learner" }).click();
  await page.getByRole("button", { name: "Open River’s workspace" }).click();
  await page.getByRole("button", { name: "Start an activity" }).click();
  await expect(page.getByLabel("Your question")).toBeVisible();
  await page.goto("about:blank");
  await app.configureDatabase(
    "UPDATE learning_session SET expires_at = now() - interval '1 second'",
  );
  // Avoid all session reads: they opportunistically purge and could mask a broken cron.
  expect((await page.request.get(endpoint)).status()).toBe(401);
  await app.restart({ CRON_SECRET: "fictional-cron-secret" });
  expect(
    (
      await page.request.get(endpoint, {
        headers: {
          authorization: "Bearer wrong",
          "user-agent": "vercel-cron/1.0",
        },
      })
    ).status(),
  ).toBe(401);
  const headers = { authorization: "Bearer fictional-cron-secret" };
  const purged = await page.request.get(endpoint, { headers });
  expect(purged.status()).toBe(200);
  expect(purged.headers()["cache-control"]).toBe("no-store");
  expect(await purged.json()).toEqual({ ok: true, deletedSessions: 1 });
  expect(await (await page.request.get(endpoint, { headers })).json()).toEqual({
    ok: true,
    deletedSessions: 0,
  });
  await app.configureDatabase(
    "ALTER TABLE learning_session RENAME TO deliberately_unavailable_session",
  );
  const failure = await page.request.get(endpoint, { headers });
  expect(failure.status()).toBe(503);
  expect(await failure.json()).toEqual({ ok: false });
});
