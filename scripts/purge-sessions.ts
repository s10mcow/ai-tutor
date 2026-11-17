import { purgeExpiredSessions } from "../lib/coaching.ts";
import { database } from "../lib/database.ts";
try {
  await purgeExpiredSessions();
} finally {
  await database.end();
}
