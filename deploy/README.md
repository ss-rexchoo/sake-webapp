# Deploying to ECS + RDS

Notes, not infrastructure-as-code. There is no Terraform or CDK in this repo —
the deployment is one service, one database, and one load balancer, and hand-run
console/CLI steps recorded here are honest about that. If this grows a second
environment, that is the moment to codify it.

> **Deviation from the plan.** `sake-discovery-web-app-plan-v2.md` §13 specifies
> Supabase + Vercel. The user has existing AWS infrastructure (ECS + RDS
> Postgres) and decided to run the app there instead. This is deliberate. See
> the note in the root `README.md`.

---

## The shape of it

```
   QR code  →  ALB (public subnets, TLS)
                 │  target group → /api/health
                 ▼
              ECS Fargate service, N tasks (private subnets)
                 │  container port 3000
                 ▼
              RDS Postgres (private subnets, port 5432, no public access)
```

No public database endpoint. No browser-to-database path — the Next.js server is
the only client of the database, which is why `db/schema.sql` has no row-level
security policies.

---

## Environment variables

Set on the ECS task definition. The three secrets belong in **Secrets Manager**
and are referenced from the task definition's `secrets` block (not `environment`,
which shows the value in plaintext in the console and in `describe-task-definition`
output).

| Variable | Where | Required | Notes |
|---|---|---|---|
| `DATABASE_URL` | Secrets Manager | yes | `postgres://sake_app:PASSWORD@host:5432/sake`. **Not** `NEXT_PUBLIC_`. Its presence is what switches the app off mock data. |
| `ADMIN_PASSWORD_HASH` | Secrets Manager | yes | scrypt hash from `npm run hash-password`. Its presence is what switches `/admin` off the development stand-in and removes the red banner. |
| `SESSION_SECRET` | Secrets Manager | yes | HMAC key for the admin session cookie. `openssl rand -base64 48`. Must be ≥32 characters or the app throws on any `/admin` request — deliberately, since a guessable value is a forgeable admin session. |
| `PGSSLROOTCERT` | task definition `environment` | strongly recommended | `/etc/ssl/rds/rds-ca-bundle.pem` — the Dockerfile bakes the AWS bundle in at that path. Unset, the connection is still TLS but the server certificate is **not verified**, and the app logs a warning saying so at startup. |
| `PGPOOL_MAX` | task definition `environment` | no | Connections per task. Default 10. See the arithmetic below. |
| `PGSSLMODE` | — | **never in production** | Only value read is `disable`, which turns TLS off. It exists so the Postgres code can be run against a local database during development. Never set it on a task definition; with `rds.force_ssl=1` the connection would be refused anyway. |
| `PORT` | — | no | Defaults to 3000 in the image. |
| `HOSTNAME` | — | already set | `0.0.0.0` in the image. Do not override it to `localhost` or the health check fails on every task. |

Rotating the staff password means generating a new hash and updating the secret.
Sessions already issued survive it, because the cookie is signed with
`SESSION_SECRET` and not with the password — rotate `SESSION_SECRET` too if you
need to actually kick everyone out.

---

## Connections: the arithmetic that bites

Each ECS task is one Node process with **one pool** of `PGPOOL_MAX` connections.
So:

```
desired_task_count × PGPOOL_MAX
  + any psql session you have open
  + rds_superuser_reserved_connections (3 by default)
  ≤ max_connections
```

`max_connections` on RDS defaults to roughly `DBInstanceClassMemory / 9531392` —
about 80 on a `db.t4g.micro`, ~340 on a `db.t4g.small`. Check it rather than
trusting the estimate:

```sql
show max_connections;
```

With the default `PGPOOL_MAX=10`, four tasks use 40 connections and a
`db.t4g.micro` is fine. Twelve tasks would not be. When you need more tasks than
the arithmetic allows, the answer is **RDS Proxy** in front of the database
(pointing `DATABASE_URL` at the proxy endpoint), not shrinking the pool until
every request queues — the proxy multiplexes many task connections onto few
database connections and survives failovers without dropping the client.

Symptom to recognise: `FATAL: sorry, too many clients already` in the task logs,
or `[db] idle client error` immediately after a scale-out.

---

## Load balancer

- **Target group**: protocol HTTP, port **3000**, target type **ip** (required
  for Fargate/awsvpc).
- **Health check path**: `/api/health`, matcher `200`.
- Interval 30s, timeout 5s, healthy threshold 2, unhealthy threshold 3.
- **Deregistration delay**: 30s is plenty; the default 300s makes every deploy
  five minutes longer than it needs to be.

`/api/health` returns **200 whenever the Node process is alive**, and reports
database reachability in the JSON body rather than in the status code:

```json
{ "status": "ok", "database": "ok", "uptimeSeconds": 412 }
```

That is on purpose. If the check failed on a database outage, an RDS failover
would fail it on *every* task simultaneously, ECS would drain and replace all of
them, and none of that fixes a database problem — while it does destroy the
cached guest pages that were still being served fine without the database. Alarm
on `database != "ok"` in the body; do not wire it to the target group.

Also on the ALB, worth having:
- HTTP→HTTPS redirect on :80.
- An **AWS WAF rate-based rule scoped to `/admin/login`**. The app rate-limits
  sign-ins in memory (10 per IP per 15 minutes), but that counter is per task and
  resets on deploy — see `src/lib/auth/rate-limit.ts`. A WAF rule is the shared,
  durable version of the same limit and needs no code.

---

## Security groups

Two groups, referencing each other rather than CIDR ranges:

| Group | Inbound | From |
|---|---|---|
| `sake-alb-sg` | 80, 443 | `0.0.0.0/0` |
| `sake-ecs-sg` | 3000 | `sake-alb-sg` |
| `sake-rds-sg` | 5432 | `sake-ecs-sg` |

`sake-rds-sg` admitting **only** `sake-ecs-sg` is the thing that makes "no public
database" true. Do not add your office IP to it for convenience — reach the
database through SSM port forwarding instead (see `db/README.md`).

The RDS instance itself: **Publicly accessible = No**, in private subnets, and
set `rds.force_ssl = 1` in its parameter group so a misconfigured client cannot
connect in plaintext at all.

---

## Build and push

```bash
ACCOUNT=123456789012
REGION=ap-southeast-1
REPO=$ACCOUNT.dkr.ecr.$REGION.amazonaws.com/sake-webapp

aws ecr get-login-password --region $REGION \
  | docker login --username AWS --password-stdin $ACCOUNT.dkr.ecr.$REGION.amazonaws.com

# --provenance=false keeps ECR from showing the image as an untagged manifest list.
docker build --platform linux/amd64 --provenance=false -t $REPO:$(git rev-parse --short HEAD) .
docker push $REPO:$(git rev-parse --short HEAD)
```

Build for `linux/amd64` explicitly if you are on an Apple Silicon machine and the
service runs on X86_64 Fargate, or the tasks will fail to start with `exec format
error`.

Deploy by registering a new task definition revision with the new image tag and
updating the service. Tag by commit, never `latest` — `latest` makes a rollback a
guess.

---

## Task definition essentials

- CPU/memory: `256`/`512` is enough for this app. Next's standalone server is not
  memory-hungry and there is no image processing.
- `awslogs` driver to a CloudWatch log group; the app logs the TLS warning and
  any pool errors to stdout/stderr.
- ECS **container** health check is already defined in the image (`HEALTHCHECK`),
  so it does not need repeating in the task definition.
- Run in **private subnets** with a NAT gateway (or VPC endpoints for ECR, Logs
  and Secrets Manager, which is cheaper if this is the only service using NAT).

---

## First deploy checklist

1. Apply `db/schema.sql` then `db/seed.sql` (see `db/README.md`).
2. `npm run hash-password` → put the output in Secrets Manager.
3. `openssl rand -base64 48` → `SESSION_SECRET` in Secrets Manager.
4. `DATABASE_URL` in Secrets Manager, pointing at the private RDS endpoint.
5. Build, push, register task definition, create service behind the ALB.
6. Hit `/api/health` through the ALB — expect `"database": "ok"`.
7. Sign in at `/admin`. **The red "development sign-in" banner must be gone.** If
   it is still there, `ADMIN_PASSWORD_HASH` did not reach the container, and the
   admin is behind a publicly documented default password.
