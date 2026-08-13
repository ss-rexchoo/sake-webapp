# Sake Discovery

A mobile-first sake discovery experience for restaurant guests. A guest scans a QR code at the table and lands on a bottle they'll enjoy in 20–40 seconds — by taste, by region, or by name.

Built to `sake-discovery-web-app-plan-v2.md`. This repo is **Phase 1 (MVP)** of that plan.

---

> ### Deviation from plan §13 — deliberate
>
> The plan specifies **Supabase + Vercel**. This app instead targets **AWS: Next.js in a container on ECS, talking to RDS Postgres inside the same VPC.**
>
> **Why:** the user already runs ECS and RDS Postgres. Standing up a second managed Postgres and a second hosting provider would mean two places to patch, two bills, two access-control models and a database exposed to the public internet, in exchange for nothing this app needs — the guest journey is server-rendered and cached, and the only writer is a single shared staff login.
>
> **What actually changed:** the storage engine is still Postgres and the schema in `db/` is the same schema §10 describes. What went is Supabase's client library (replaced by `pg`), its hosted auth (replaced by a scrypt-hashed shared password + the signed session cookie that was already here), and its row-level security policies — those existed because Supabase exposes Postgres directly to the browser, and here the Next.js server is the only database client. `db/schema.sql` says so at the point where the policies used to be.
>
> Nothing about the guest experience, the recommendation model, or the data model changed. `sake-discovery-web-app-plan-v2.md` is left as written.

---

## Run it locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000> on a phone-sized viewport (390px wide is the design target).

With no `.env.local`, everything runs on the in-memory seed and the development sign-in — no database or credentials needed. To see it as a guest would, use your browser's device toolbar and pick any modern iPhone or Android profile.

### Staff admin

Go to <http://localhost:3000/admin>. You'll be redirected to a login.

**Development password: `sake-admin`** (override with `ADMIN_DEV_PASSWORD` in `.env.local`).

> ⚠️ Until `ADMIN_PASSWORD_HASH` is set, this login is a **development stand-in, not real security** — one shared password with a published default, no account, no audit trail. Every admin screen says so on-screen. Do not put this in front of the internet as-is.

To exercise the *real* login locally: `npm run hash-password`, paste the output into `.env.local` as `ADMIN_PASSWORD_HASH`, add a `SESSION_SECRET` (`openssl rand -base64 48`), and restart. The red banner disappears; that banner's absence is the signal that the real path is live.

### Production build

```bash
npm run build
npm start
```

---

## What's real and what's mocked

| Thing | Status |
|---|---|
| All guest screens, recommendation logic, map, search, detail | **Real** |
| Admin CRUD (create / edit / delete / stock toggle) | **Real**, against whichever data layer is active |
| Sake inventory | **Placeholder** — 12 sample bottles, not the restaurant's real list |
| Database | **Mock** by default — in-memory. Real Postgres the moment `DATABASE_URL` is set. |
| Admin login | **Mock** by default — shared dev password. Real scrypt-checked password the moment `ADMIN_PASSWORD_HASH` is set. |

Two independent one-line swaps, both driven by an environment variable being present:

- `src/lib/data/index.ts` picks `postgresRepo` over `mockRepo` when `DATABASE_URL` is set.
- `src/lib/auth/index.ts` picks `passwordAuth` over `mockAuth` when `ADMIN_PASSWORD_HASH` is set.

Nothing else in the app knows which is running. `DATABASE_URL` is server-only and deliberately not `NEXT_PUBLIC_`, so nothing that touches `pg` can end up in a browser bundle.

---

## Deploying

There are **two** deploy paths, for two different purposes. They don't conflict — Vercel ignores the `Dockerfile`, ECS ignores `vercel.json`.

### 1. Prototype: Vercel, mock data, no database

For demoing the guest journey quickly. Push the repo to Vercel and deploy with **no environment variables set**. `vercel.json` pins the Singapore region; security headers and the `/admin` `noindex` come from `next.config.ts`, so both deploy targets get them.

The app runs entirely on the 12-bottle in-memory seed. Nothing to provision.

> ### ⚠️ Admin edits will not persist on the Vercel prototype
>
> The mock repository is a **plain JavaScript array inside one Node process**. On Vercel that process is a serverless instance that is created, frozen, reused and recycled at the platform's discretion, and several may exist at once.
>
> So on that deploy: a staff member adds a bottle, sees it appear, refreshes, and it is gone — or it is there, then gone, then back, depending on which instance answered. Nothing is broken; there is simply nowhere for the write to go.
>
> **The Vercel prototype is fine for demoing the guest journey** — landing, taste finder, results, map, search, sake detail — because all of that only reads.
>
> **It is actively misleading for demoing admin CRUD.** Do not show the admin screens to the restaurant on this deploy and describe what they are seeing as how it will work. Admin needs the ECS + RDS deploy, or a local `npm run dev` where the single process makes edits stick until restart.

### 2. Production: ECS + RDS

The real target. Next.js in a container (`Dockerfile`, `output: "standalone"`) on ECS Fargate behind an ALB, talking to RDS Postgres in a private subnet.

Full notes — environment variables, security groups, the ALB target group, Secrets Manager, and the connection-pool arithmetic — are in **[`deploy/README.md`](deploy/README.md)**. Schema and seed instructions are in **[`db/README.md`](db/README.md)**.

Short version:

1. Apply `db/schema.sql`, then `db/seed.sql` (see `db/README.md`).
2. `npm run hash-password` → `ADMIN_PASSWORD_HASH` in Secrets Manager.
3. `openssl rand -base64 48` → `SESSION_SECRET` in Secrets Manager.
4. `DATABASE_URL` in Secrets Manager, pointing at the private RDS endpoint.
5. Build and push the image, register the task definition, run the service behind an ALB with its target group health check on `/api/health`.

---

## Project layout

```
src/app/            routes — landing, taste, map, search, sake/[id], admin
  api/health/       ALB health check — 200 on process liveness, DB status in the body
src/components/     TasteCompass, JapanMap, ResultCard, AttributeBar, FridgeBadge, …
src/lib/
  db.ts             the pg connection pool — server only
  data/             SakeRepository interface + mock and Postgres implementations
  auth/             staff auth — same mock/real split; scrypt + signed cookie
  recommend.ts      matchScore() and the low-confidence rule (plan §6)
  motion.ts         the app's shared animation vocabulary
  config.ts         VENUE_LABEL — the restaurant edits this
src/app/globals.css design tokens (plan §4) — single source of truth
db/                 schema.sql, seed.sql, README.md
deploy/             ECS + RDS deployment notes
scripts/            hash-password.mjs
Dockerfile          multi-stage production image
```

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · Motion · `pg` → RDS Postgres · ECS Fargate

Deliberately **not** used, per plan §16: D3, GeoJSON, Rive, GSAP, Three.js, any LLM call at request time. Also deliberately absent: an ORM, a query builder, a migration framework, and a password-hashing dependency — the app has two tables and one password, `pg` speaks SQL, and Node's built-in `crypto.scrypt` is a proper KDF. The Japan map is hand-authored SVG driven by coordinates in the `regions` table. The QR experience has to load fast on restaurant wifi, so every dependency has to earn its place.

## Before opening to real guests

- [ ] Replace the 12 placeholder sake with real inventory
- [ ] Set `VENUE_LABEL` in `src/lib/config.ts`
- [ ] Deploy to ECS + RDS (`deploy/README.md`) — the Vercel prototype cannot persist admin edits
- [ ] Set `ADMIN_PASSWORD_HASH` and confirm the red banner is gone from `/admin`
- [ ] Set `PGSSLROOTCERT` so the database connection verifies the server certificate
- [ ] Re-check the low-confidence threshold against real inventory — see `LOW_CONFIDENCE_THRESHOLD` in `src/lib/recommend.ts`
