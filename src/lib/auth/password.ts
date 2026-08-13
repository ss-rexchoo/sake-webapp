import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Password hashing for the single shared staff login (plan v2 §11 — no per-user
 * accounts in v1).
 *
 * ── Why scrypt and not bcrypt/argon2 ────────────────────────────────────────
 * `node:crypto.scrypt` is a real memory-hard password KDF, standardised in
 * RFC 7914 and implemented by OpenSSL underneath. It is in the runtime already.
 * Adding bcrypt or argon2 would mean a native module in the container build for
 * no security gain, to protect exactly one credential.
 *
 * ── Format ──────────────────────────────────────────────────────────────────
 *   scrypt$<N>$<r>$<p>$<salt-b64>$<hash-b64>
 * Self-describing, so the cost parameters can be raised later without breaking
 * hashes already sitting in Secrets Manager: the stored values are the ones used
 * to verify, and only newly generated hashes pick up the new defaults.
 *
 * Generate one with `npm run hash-password` and paste it into
 * `ADMIN_PASSWORD_HASH`. This module never sees a plaintext password from
 * anywhere but the sign-in form.
 */

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/** Cost parameters for newly generated hashes. ~32 MiB and ~100 ms per check. */
export const SCRYPT_N = 32768;
export const SCRYPT_R = 8;
export const SCRYPT_P = 1;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

/**
 * Node's default `maxmem` is 32 MiB and the check is strict `<`, so N=32768,
 * r=8 (exactly 32 MiB of state) is refused by one byte without this.
 */
const MAXMEM = 128 * 1024 * 1024;

function b64(buffer: Buffer): string {
  return buffer.toString("base64");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scrypt(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: MAXMEM,
  });
  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    b64(salt),
    b64(derived),
  ].join("$");
}

/**
 * Constant-time verification of `password` against a stored hash.
 *
 * Returns false — never throws — on a malformed stored hash, so a typo in
 * Secrets Manager locks staff out with "that password did not match" rather
 * than 500-ing the login screen and revealing that the secret is broken.
 */
export async function verifyPassword(
  password: string,
  stored: string | undefined,
): Promise<boolean> {
  if (!stored) return false;

  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return false;
  }
  // Refuse absurd parameters rather than letting a corrupted secret turn one
  // login attempt into a multi-gigabyte allocation.
  if (N < 1024 || N > 1 << 20 || r < 1 || r > 32 || p < 1 || p > 16) {
    return false;
  }

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[4], "base64");
    expected = Buffer.from(parts[5], "base64");
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;

  let derived: Buffer;
  try {
    derived = await scrypt(password, salt, expected.length, {
      N,
      r,
      p,
      maxmem: MAXMEM,
    });
  } catch {
    return false;
  }

  // Equal lengths by construction (`expected.length` was the keylen), so
  // timingSafeEqual cannot throw here — but the guard costs nothing.
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}
