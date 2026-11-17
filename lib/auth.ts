import { timingSafeEqual } from "node:crypto";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { database } from "./database.ts";

export const auth = betterAuth({
  database,
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: { enabled: true, minPasswordLength: 12 },
  session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
  hooks: {
    before: createAuthMiddleware(async (context) => {
      if (context.path !== "/sign-up/email") return;
      const emails = (process.env.FAMILY_SETUP_EMAILS ?? "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean);
      const expected = process.env.FAMILY_SETUP_CODE ?? "";
      const supplied = context.headers?.get("x-family-setup-code") ?? "";
      const matches =
        expected.length >= 16 &&
        Buffer.byteLength(expected) === Buffer.byteLength(supplied) &&
        timingSafeEqual(Buffer.from(expected), Buffer.from(supplied));
      if (
        !emails.includes(String(context.body?.email ?? "").toLowerCase()) ||
        !matches
      ) {
        throw new APIError("FORBIDDEN", {
          message:
            "Family setup is invite-only. Check your parent email and setup code.",
        });
      }
    }),
  },
});
