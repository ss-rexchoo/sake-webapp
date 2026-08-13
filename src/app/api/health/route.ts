import { getPool, isDatabaseConfigured } from "@/lib/db";

/**
 * Health check for the ALB target group.
 *
 * ── Why a database failure does not fail this check ─────────────────────────
 * The ALB uses this endpoint to decide whether to keep a task in service. If it
 * returned 503 whenever Postgres was unreachable, then any database-side event —
 * an RDS failover, a maintenance window, a security-group change, a
 * `max_connections` ceiling — would fail the check on *every* task at once. ECS
 * would then drain and replace all of them, which cannot fix a database problem
 * and does destroy the one thing still working: the cached guest pages, which
 * Next serves without touching the database at all.
 *
 * So this is a liveness check, not a readiness check. 200 means "this Node
 * process is up and routing requests". Database reachability is reported in the
 * body as information — scrape it, alarm on it, look at it during an incident —
 * but it never changes the status code.
 *
 * The one thing that legitimately fails a task is the process being unable to
 * answer at all, which is exactly what a timeout on this route already signals.
 */

// Never cached or prerendered: a health check answered from cache is not a
// health check.
export const dynamic = "force-dynamic";
export const revalidate = 0;

type DatabaseStatus = "not_configured" | "ok" | "unreachable";

async function checkDatabase(): Promise<DatabaseStatus> {
  // Mock-data mode (no DATABASE_URL) is a supported way to run this app — the
  // Vercel prototype does exactly that — so "no database" is a state to report,
  // not an error.
  if (!isDatabaseConfigured()) return "not_configured";

  try {
    await getPool().query("select 1");
    return "ok";
  } catch (error) {
    // The reason goes to the logs, never to the response body. This endpoint is
    // reachable from the public internet through the ALB, and driver errors are
    // chatty in exactly the wrong way — they name the host, the database, the
    // user and whether the password was rejected. "unreachable" is all a health
    // check needs to say; CloudWatch has the rest.
    console.error(
      "[health] database unreachable:",
      error instanceof Error ? error.message : String(error),
    );
    return "unreachable";
  }
}

export async function GET() {
  return Response.json(
    {
      status: "ok",
      database: await checkDatabase(),
      uptimeSeconds: Math.round(process.uptime()),
    },
    {
      status: 200,
      headers: { "cache-control": "no-store" },
    },
  );
}
