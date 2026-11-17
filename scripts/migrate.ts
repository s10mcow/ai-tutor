import { readdir, readFile } from "node:fs/promises";
import { getMigrations } from "better-auth/db/migration";
import { auth } from "../lib/auth.ts";
import { database } from "../lib/database.ts";

if (!process.env.DATABASE_URL)
  throw new Error("DATABASE_URL is required for migrations");
const client = await database.connect();
try {
  await client.query("SELECT pg_advisory_lock(670141)");
  // Use the schema shipped with the locked Better Auth version, including its indexes.
  await (await getMigrations(auth.options)).runMigrations();
  await client.query(
    "CREATE TABLE IF NOT EXISTS schema_migration (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  for (const name of (await readdir(new URL("../migrations/", import.meta.url)))
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    if (
      (
        await client.query(
          "SELECT name FROM schema_migration WHERE name = $1",
          [name],
        )
      ).rowCount
    )
      continue;
    await client.query("BEGIN");
    try {
      await client.query(
        await readFile(
          new URL(`../migrations/${name}`, import.meta.url),
          "utf8",
        ),
      );
      await client.query("INSERT INTO schema_migration (name) VALUES ($1)", [
        name,
      ]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  await client.query("SELECT pg_advisory_unlock(670141)");
  client.release();
  await database.end();
}
