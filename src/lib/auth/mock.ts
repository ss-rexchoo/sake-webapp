import { cookies } from "next/headers";

import {
  ADMIN_SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  devPassword,
  sessionSecret,
} from "./config";
import { safeEqual, signSessionToken, verifySessionToken } from "./token";
import type { StaffAuth } from "./types";

/**
 * Development stand-in for the shared staff login.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS IS NOT AUTHENTICATION.
 * ─────────────────────────────────────────────────────────────────────────────
 * It checks one password from an environment variable (`ADMIN_DEV_PASSWORD`,
 * defaulting to `sake-admin`) and sets a signed, httpOnly, 12-hour cookie. There
 * is no account, no rate limiting, no password reset and no audit trail. It is
 * here so the admin CRUD can be built and exercised before a real password hash
 * exists — exactly as `mockRepo` stands in for Postgres. Set
 * `ADMIN_PASSWORD_HASH` (see `npm run hash-password`) and `src/lib/auth/index.ts`
 * selects `passwordAuth` in `./staff.ts` instead.
 *
 * Every admin screen renders `<MockAuthBanner />` while this implementation is
 * selected, so nobody can mistake it for the real thing in a restaurant.
 */
export const mockAuth: StaffAuth = {
  mode: "mock",
  // No account exists, so asking for an email would be theatre.
  requiresEmail: false,

  async getSession() {
    const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
    const valid = await verifySessionToken(
      token,
      sessionSecret(),
      SESSION_MAX_AGE_SECONDS,
    );
    return valid ? { email: null, mode: "mock" } : null;
  },

  async signIn({ password }) {
    if (!safeEqual(password, devPassword())) {
      return {
        ok: false,
        error:
          "That is not the development password. It is set by ADMIN_DEV_PASSWORD in .env.local.",
      };
    }

    (await cookies()).set(ADMIN_SESSION_COOKIE, await signSessionToken(Date.now(), sessionSecret()), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return { ok: true };
  },

  async signOut() {
    (await cookies()).delete(ADMIN_SESSION_COOKIE);
  },
};
