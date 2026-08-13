import { cookies } from "next/headers";

import {
  ADMIN_SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  sessionSecret,
} from "./config";
import { verifyPassword } from "./password";
import { signSessionToken, verifySessionToken } from "./token";
import type { StaffAuth } from "./types";

/**
 * The real shared staff login.
 *
 * One password, checked against the scrypt hash in `ADMIN_PASSWORD_HASH`, and on
 * success the same signed, httpOnly, 12-hour cookie the mock uses — see
 * `./token.ts`, which is unchanged and carries the HMAC, the constant-time
 * compare and the expiry. Only the *credential check* differs between this and
 * `./mock.ts`: the mock compares a plaintext dev password, this derives a key
 * and compares it in constant time.
 *
 * Rate limiting is not here but in the sign-in server action
 * (`src/app/actions/admin.ts`), because that is where the client's IP is
 * readable. See `./rate-limit.ts`.
 *
 * There is no account and no email — plan v2 §11 puts per-user staff accounts
 * out of v1 — so `requiresEmail` is false in both modes and the login form asks
 * for a password only.
 */
export const passwordAuth: StaffAuth = {
  mode: "password",
  requiresEmail: false,

  async getSession() {
    const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
    const valid = await verifySessionToken(
      token,
      sessionSecret(),
      SESSION_MAX_AGE_SECONDS,
    );
    return valid ? { email: null, mode: "password" } : null;
  },

  async signIn({ password }) {
    const ok = await verifyPassword(password, process.env.ADMIN_PASSWORD_HASH);

    if (!ok) {
      // One message for every failure. There is a single account, so there is
      // nothing to distinguish "no such user" from "wrong password" — and a
      // misconfigured hash must not announce itself here either.
      return { ok: false, error: "That password did not match." };
    }

    (await cookies()).set(
      ADMIN_SESSION_COOKIE,
      await signSessionToken(Date.now(), sessionSecret()),
      {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        // Always secure in real mode: this cookie only exists behind the ALB,
        // which terminates TLS.
        secure: true,
        maxAge: SESSION_MAX_AGE_SECONDS,
      },
    );

    return { ok: true };
  },

  async signOut() {
    (await cookies()).delete(ADMIN_SESSION_COOKIE);
  },
};
