/**
 * Signing for the *mock* staff session cookie.
 *
 * This exists so the development stand-in is at least internally honest: the
 * cookie states when it was issued and carries an HMAC over that, so it expires
 * on its own and cannot be hand-written in devtools. It is emphatically **not**
 * a replacement for real authentication — there is one shared password and no
 * identity behind it. See `mock.ts` and the banner on the admin screens.
 *
 * Web Crypto only (no `node:crypto`, no `Buffer`) so the same functions run in
 * `src/proxy.ts` and in server components without a second implementation.
 */

const encoder = new TextEncoder();

async function hmac(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));

  let binary = "";
  for (const byte of new Uint8Array(signature)) {
    binary += String.fromCharCode(byte);
  }
  // base64url — cookie values must not contain `+`, `/` or `=`.
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Length-independent, content-constant-time string compare. Used for the
 * signature and for the password itself so neither leaks through timing.
 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** `<issuedAtMs>.<signature>` */
export async function signSessionToken(
  issuedAt: number,
  secret: string,
): Promise<string> {
  const payload = String(issuedAt);
  return `${payload}.${await hmac(payload, secret)}`;
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string,
  maxAgeSeconds: number,
): Promise<boolean> {
  if (!token) return false;

  const separator = token.lastIndexOf(".");
  if (separator <= 0) return false;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  const issuedAt = Number(payload);
  if (!Number.isFinite(issuedAt)) return false;

  const age = Date.now() - issuedAt;
  // A token issued in the future is as broken as an expired one.
  if (age < 0 || age > maxAgeSeconds * 1000) return false;

  return safeEqual(signature, await hmac(payload, secret));
}
