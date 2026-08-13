import { mockRepo } from "./mock";
import { postgresRepo } from "./postgres";
import type { SakeRepository } from "./repository";

/**
 * The one-line swap. With `DATABASE_URL` present the app talks to RDS Postgres
 * through `src/lib/db.ts`; without it, it runs on the in-memory seed. Nothing
 * else in the app changes.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SERVER ONLY. `DATABASE_URL` is intentionally *not* `NEXT_PUBLIC_`: it carries
 * the database password. Because Next only inlines `NEXT_PUBLIC_` variables into
 * client bundles, `process.env.DATABASE_URL` is `undefined` in the browser —
 * which means a client component that imported this module would silently get
 * `mockRepo` and ship `pg` into the bundle. Nothing under `src/components` may
 * import it. Every consumer today is a server component or a server action; the
 * client-side `/search` filter takes a plain flattened array as a prop instead.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const repo: SakeRepository = process.env.DATABASE_URL
  ? postgresRepo
  : mockRepo;

/** True when the app is running on the in-memory mock rather than Postgres. */
export const isMockData = repo === mockRepo;

export type { SakeRepository } from "./repository";
