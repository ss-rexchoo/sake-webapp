-- Sake Discovery — Postgres schema (plan v2 §10)
-- Run against the RDS database, then run seed.sql. See db/README.md.

create table regions (
  id text primary key,              -- 'chubu', 'kansai', etc.
  name text not null,
  name_jp text,
  description text,
  map_cx numeric, map_cy numeric,   -- position on the hand-drawn map
  map_rx numeric, map_ry numeric,
  map_rotation numeric
);

create table sake (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_jp text,
  brewery text,
  prefecture text,
  region_id text references regions(id),
  category text,                    -- Junmai / Ginjo / Daiginjo / Honjozo
  sweetness numeric check (sweetness between 0 and 100),  -- 0 = dry, 100 = sweet
  body numeric check (body between 0 and 100),            -- 0 = light, 100 = rich
  aroma_intensity numeric,          -- optional, descriptive only — not a customer-facing slider
  description text,
  food_pairing text[],
  image_url text,
  fridge_number int not null,
  price numeric,
  in_stock boolean default true,
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index sake_region_id_idx on sake (region_id);
create index sake_in_stock_idx on sake (in_stock);

-- ---------------------------------------------------------------------------
-- No Row Level Security — deliberate, not an oversight.
--
-- Earlier drafts of this schema enabled RLS on both tables with public-read /
-- authenticated-write policies. That was necessary under Supabase, where the
-- browser holds an anon key and speaks to Postgres directly over PostgREST, so
-- the database itself is the only place an access rule can be enforced.
--
-- This deployment is different: the Next.js server running on ECS is the *only*
-- client of this database. RDS sits in a private subnet with a security group
-- that admits port 5432 from the ECS task security group and nothing else; no
-- browser can open a connection, and there is no anonymous database role for one
-- to use. Authorisation lives where the requests actually arrive — the /admin
-- proxy guard and `requireStaffSession()` in every server action.
--
-- If a direct-from-browser client is ever reintroduced, RLS has to come back
-- with it. Until then these policies would guard a door nobody can reach, while
-- suggesting the database is defended against a client that does not exist.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Keep updated_at honest even if a client forgets to send it.
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger sake_set_updated_at
  before update on sake
  for each row
  execute function set_updated_at();
