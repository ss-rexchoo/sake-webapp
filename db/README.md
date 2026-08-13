# Database

Two files, applied in order, against the RDS Postgres instance:

| File | What it does |
|---|---|
| `schema.sql` | Creates `regions` and `sake`, their indexes, and the `updated_at` trigger. Run once. |
| `seed.sql` | Inserts the 6 regions and 12 placeholder sake. Safe to re-run. |

The app never creates or alters tables at runtime. It only reads and writes rows.

---

## Applying them

RDS is in a private subnet, so `psql` has to run from somewhere inside the VPC —
a bastion host, an SSM session, a one-off ECS task, or your laptop through an SSM
port forward. There is no public endpoint by design.

```bash
export PGPASSWORD='…'            # or use ~/.pgpass
export PGSSLMODE=verify-full
export PGSSLROOTCERT=/path/to/rds-ca-bundle.pem

psql -h sake.xxxxx.ap-southeast-1.rds.amazonaws.com -U sake_app -d sake \
     -v ON_ERROR_STOP=1 -f schema.sql

psql -h sake.xxxxx.ap-southeast-1.rds.amazonaws.com -U sake_app -d sake \
     -v ON_ERROR_STOP=1 -f seed.sql
```

`-v ON_ERROR_STOP=1` matters: without it `psql` reports an error, carries on, and
leaves you with half a schema and a zero exit code.

Download the CA bundle once:

```bash
curl -o rds-ca-bundle.pem \
  https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
```

### Re-running `seed.sql`

- `regions` uses `on conflict (id) do nothing`, so existing rows are left alone.
- `sake` is guarded by "seed only if the table is empty" and prints
  `NOTICE: sake table is not empty — seed skipped.` otherwise. It has a uuid
  primary key with no natural key to conflict on, so `on conflict do nothing`
  would happily insert twelve duplicates on a second run. More to the point, once
  the restaurant has entered real inventory, re-running this file must add
  nothing — not twelve placeholder bottles alongside the real ones.

To deliberately reset to the placeholder data: `truncate sake;` then re-run.

---

## Database user

Create a dedicated login for the app rather than using the RDS master user:

```sql
create user sake_app with password '…';
grant connect on database sake to sake_app;
grant usage on schema public to sake_app;
grant select, insert, update, delete on sake, regions to sake_app;
```

The app's `DATABASE_URL` uses this user. It cannot create or drop tables, so a
bug in the app cannot take the schema with it.

---

## Migrations

**There is no migration tool.** Schema changes are hand-applied with `psql`, the
same way `schema.sql` is.

That is a deliberate choice for the current size of this thing — two tables, one
restaurant, changes measured in months — and not a recommendation to keep
forever. The cost of it is real: there is no record of which changes have been
applied to which environment beyond what somebody remembers.

Until that changes, the working rule is:

1. Edit `schema.sql` so it always describes the current shape of the database.
2. Write the `alter table …` you actually ran into the commit message, so the
   diff and the applied change are recorded together.
3. Apply it by hand.

When this gets a second environment, or a second person applying changes, that
rule stops being enough — reach for a migration tool then. Something file-based
and boring (`node-pg-migrate`, `dbmate`, plain numbered `.sql` files run by a
one-off ECS task) fits this stack; an ORM's migration system would mean adopting
the ORM.

---

## Notes on the schema

- `sweetness` and `body` are `numeric` with a `check … between 0 and 100`, and
  nullable. The app treats a null as 50 (the centre of the taste compass) so the
  recommendation maths cannot produce `NaN` — see `axis()` in
  `src/lib/data/postgres.ts`.
- `numeric` columns come back from `pg` as **strings**. Every one of them is
  converted explicitly in `src/lib/data/postgres.ts`. If you add a `numeric`
  column, add it to the mapper too.
- **No row-level security.** The Next.js server is the only client of this
  database — see the long comment in `schema.sql` for why the Supabase-era
  policies were removed rather than forgotten.
