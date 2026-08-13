/**
 * Shared, dependency-free auth configuration.
 *
 * Deliberately imports nothing from `next/headers` or `node:crypto`, so that
 * `src/proxy.ts` (the route guard, which runs before rendering and outside the
 * Node runtime) and the server components can both read the same constants.
 * Password *hashing* lives in `./password.ts`, which is Node-only.
 */

/** Cookie carrying the staff session, in both real and mock mode. */
export const ADMIN_SESSION_COOKIE = "sake_admin_session";

/** One long restaurant shift. Staff should not be re-typing this mid-service. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

/**
 * The documented default for the local development stand-in. It is a default on
 * purpose — the mock is not a security boundary and pretending otherwise (by
 * refusing to start without a secret) would only make it look like one.
 */
export const DEFAULT_DEV_PASSWORD = "sake-admin";

/**
 * True once a real password hash exists. Same shape of test the data layer uses
 * in `src/lib/data/index.ts`, so auth and data can only end up in different
 * modes if you deliberately set one variable and not the other.
 *
 * `ADMIN_PASSWORD_HASH` is a scrypt hash produced by `npm run hash-password` —
 * never a plaintext password. See `src/lib/auth/password.ts`.
 */
export function isPasswordAuthConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD_HASH);
}

/** The dev-only staff password (mock mode only). */
export function devPassword(): string {
  return process.env.ADMIN_DEV_PASSWORD || DEFAULT_DEV_PASSWORD;
}

/**
 * HMAC key for the session cookie.
 *
 * Real mode uses `SESSION_SECRET` — a random string from Secrets Manager, kept
 * separate from the password hash so that rotating the staff password does not
 * have to invalidate every session, and so the cookie key is not derivable from
 * anything a login attempt reveals. It is required rather than defaulted: a
 * guessable signing key is a forged admin session, so failing loudly on a
 * missing one is the only honest option.
 *
 * Mock mode derives its key from the dev password instead, so changing that
 * password invalidates every session already handed out.
 */
export function sessionSecret(): string {
  if (!isPasswordAuthConfigured()) {
    return `sake-admin-dev-session:${devPassword()}`;
  }

  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET is missing or too short. Set it to at least 32 random " +
        "characters (e.g. `openssl rand -base64 48`) alongside " +
        "ADMIN_PASSWORD_HASH — see deploy/README.md.",
    );
  }
  return secret;
}
