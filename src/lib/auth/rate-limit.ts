/**
 * Rate limiting for the staff sign-in.
 *
 * ── What this is, honestly ──────────────────────────────────────────────────
 * An in-memory fixed-window counter, per client IP, held in one Node process.
 * That means:
 *   - it is **per ECS task**. Two tasks behind the ALB give an attacker two
 *     budgets, and N tasks give N;
 *   - it **resets on deploy**, and on any task replacement;
 *   - it counts the IP the ALB reports, which is the real client only because
 *     `X-Forwarded-For`'s last hop is written by the ALB itself.
 *
 * For one shared staff password behind an ALB, with a service that runs one or
 * two tasks, that is enough: 10 attempts per 15 minutes per IP per task turns an
 * online guessing attack from "millions of tries" into "a few hundred a day",
 * while scrypt (~100 ms a check) makes each one expensive. It is not enough the
 * moment this becomes per-user accounts or the service scales out — at that
 * point move the counter to a shared store (ElastiCache/Redis, or a small
 * Postgres table) or put an AWS WAF rate-based rule on `/admin/login` at the
 * ALB, which is the cheaper of the two and needs no code.
 */

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;

interface Window {
  count: number;
  /** When the current window ends, in epoch ms. */
  resetAt: number;
}

/**
 * Survives Next's dev hot-reload for the same reason the pool does, and keeps
 * one map per process in production.
 */
const globalForLimit = globalThis as typeof globalThis & {
  __sakeLoginAttempts?: Map<string, Window>;
};

const attempts = (globalForLimit.__sakeLoginAttempts ??= new Map<
  string,
  Window
>());

/**
 * Drops expired windows. Called on each check, so the map cannot grow without
 * bound from spoofed `X-Forwarded-For` values — there is no timer to leak, and
 * the map is small enough that a full sweep is cheaper than any cleverness.
 */
function evictExpired(now: number): void {
  if (attempts.size < 512) return;
  for (const [key, window] of attempts) {
    if (window.resetAt <= now) attempts.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  /** Whole seconds until the window resets. Only meaningful when blocked. */
  retryAfterSeconds: number;
}

/**
 * Records one sign-in attempt from `key` and says whether it may proceed.
 *
 * Counts *attempts*, not failures: a successful login is cheap and rare, and
 * only counting failures lets an attacker reset the budget with a valid guess.
 */
export function recordLoginAttempt(key: string): RateLimitResult {
  const now = Date.now();
  evictExpired(now);

  const existing = attempts.get(key);

  if (!existing || existing.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  existing.count += 1;

  if (existing.count > MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * The client IP as the ALB sees it.
 *
 * `x-forwarded-for` is client-controlled *except* for its last entry, which the
 * ALB appends itself — so the last entry is the only one that can be trusted,
 * and it is the one used. With no proxy in front (local `npm run dev`) there is
 * no header at all and everything shares the `"local"` bucket, which is correct:
 * there is only one client.
 */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",");
    const last = hops[hops.length - 1]?.trim();
    if (last) return last;
  }
  return headers.get("x-real-ip")?.trim() || "local";
}
