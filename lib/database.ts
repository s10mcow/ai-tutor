import pg from "pg";
const globalDatabase = globalThis as typeof globalThis & {
  familyPool?: pg.Pool;
};
export const database =
  globalDatabase.familyPool ??
  new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
if (process.env.NODE_ENV !== "production") globalDatabase.familyPool = database;
