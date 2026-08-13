import fs from "node:fs";
import { Pool, type PoolConfig, type QueryResultRow } from "pg";

/**
 * The one Postgres connection pool.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SERVER ONLY. Nothing in `src/components` may import this, directly or through
 * `src/lib/data/postgres`. `DATABASE_URL` is deliberately not `NEXT_PUBLIC_`, so
 * a client-side import would both leak `pg` into the browser bundle and fail at
 * runtime with a confusing "Database is not configured".
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The app runs inside the VPC (ECS task → RDS Postgres on 5432). There is no
 * public database endpoint and no browser-to-database path, which is why the
 * Supabase-era row-level-security policies were dropped from the schema — see
 * `db/schema.sql`.
 */

/**
 * Next's dev server re-evaluates modules on every hot reload. Without this the
 * old pool's sockets are never closed and a morning's editing ends in
 * "too many clients already" from RDS. Stashing the pool on `globalThis`
 * survives module re-evaluation. In production the module is evaluated once and
 * this is simply a module-level singleton.
 */
const globalForDb = globalThis as typeof globalThis & {
  __sakePool?: Pool;
};

/**
 * Connections per Node process.
 *
 * Each ECS task is one Node process with one pool of this size, so the number
 * that matters to RDS is `desired_task_count × PGPOOL_MAX` (plus any psql
 * session you have open, plus `rds_superuser_reserved_connections`). That total
 * must stay comfortably under the instance's `max_connections` — a db.t4g.micro
 * caps out around 80. Default 10 is sized for a restaurant admin tool and a
 * QR-code guest journey that is mostly cached page renders; raise it only with
 * that arithmetic in front of you. If you ever need more tasks than the maths
 * allows, put RDS Proxy in front of the database rather than shrinking the pool
 * to nothing — see `deploy/README.md`.
 */
const DEFAULT_POOL_MAX = 10;

function poolMax(): number {
  const raw = Number(process.env.PGPOOL_MAX);
  return Number.isInteger(raw) && raw > 0 ? raw : DEFAULT_POOL_MAX;
}

/**
 * TLS to RDS.
 *
 * RDS accepts TLS on the standard port and (with `rds.force_ssl=1`, which you
 * should set) requires it. There are two honest configurations:
 *
 *  1. `PGSSLROOTCERT` points at the AWS RDS CA bundle on disk — the image bakes
 *     one in at `/etc/ssl/rds/rds-ca-bundle.pem`. The certificate chain and the
 *     hostname are both verified. This is the one to run in production.
 *
 *  2. `PGSSLROOTCERT` is unset. The connection is still encrypted, but the
 *     server certificate is not verified, so the encryption is not proof
 *     against an in-VPC man-in-the-middle. That is a real weakening, not a
 *     formality, so it is logged once at startup rather than quietly defaulted.
 *
 * `PGSSLMODE=disable` turns TLS off entirely. That exists so the Postgres
 * repository can be exercised against a local Postgres (a docker container, a
 * homebrew install) which has no certificate — without it there would be no way
 * to run this code at all before an RDS instance exists. It is a
 * local-development escape hatch and it announces itself in the log. It cannot
 * become a production accident on its own: RDS with `rds.force_ssl=1` refuses
 * the connection outright.
 */
function sslConfig(): PoolConfig["ssl"] {
  if (process.env.PGSSLMODE === "disable") {
    console.warn(
      "[db] PGSSLMODE=disable — connecting to Postgres in PLAINTEXT. This is " +
        "for a local database only. Never set it against RDS.",
    );
    return false;
  }

  const caPath = process.env.PGSSLROOTCERT;

  if (caPath) {
    return {
      ca: fs.readFileSync(caPath, "utf8"),
      rejectUnauthorized: true,
    };
  }

  console.warn(
    "[db] PGSSLROOTCERT is not set. Connecting to Postgres over TLS *without* " +
      "verifying the server certificate. Traffic is encrypted but not " +
      "authenticated. Set PGSSLROOTCERT to the AWS RDS CA bundle " +
      "(/etc/ssl/rds/rds-ca-bundle.pem in the container image) before this " +
      "handles real inventory.",
  );

  return { rejectUnauthorized: false };
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** Thrown rather than returned, mirroring how the Supabase client behaved. */
export function databaseNotConfigured(): Error {
  return new Error(
    "Database is not configured. Set DATABASE_URL (see .env.local.example), " +
      "or leave it unset to run on the in-memory mock repository.",
  );
}

export function getPool(): Pool {
  if (globalForDb.__sakePool) return globalForDb.__sakePool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw databaseNotConfigured();

  const pool = new Pool({
    connectionString,
    max: poolMax(),
    // A task that cannot reach RDS should fail its request quickly and let the
    // ALB retry, not hold a render open until the browser gives up.
    connectionTimeoutMillis: 5_000,
    // Long enough that a lunch rush reuses connections, short enough that idle
    // tasks give them back overnight.
    idleTimeoutMillis: 30_000,
    ssl: sslConfig(),
  });

  // `pg` emits 'error' on idle clients killed by the server (an RDS failover, a
  // maintenance window). Unhandled, that is an uncaught exception and the task
  // dies. The pool removes the dead client on its own; all this has to do is
  // not crash the process.
  pool.on("error", (error) => {
    console.error("[db] idle client error:", error.message);
  });

  globalForDb.__sakePool = pool;
  return pool;
}

/** Convenience wrapper so callers never touch `pg` types directly. */
export async function query<Row extends QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<Row[]> {
  const result = await getPool().query<Row>(text, params as unknown[]);
  return result.rows;
}
