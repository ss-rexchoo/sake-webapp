# Sake Discovery Web App — Development Plan (v2)

> Refined from the original plan after prototyping the core interaction. Written to be handed directly to Claude Code as project context.

## 1. Product Vision

A mobile-first interactive sake discovery experience for restaurant customers. Not a catalogue — a guided discovery tool. A customer with zero sake knowledge should land on a bottle they'll enjoy in **20–40 seconds**.

## 2. Core Journey

```text
Scan QR
   ↓
Landing: "How do you want to discover your sake?"
   ↓
┌───────────────┬───────────────┬───────────────┐
│ Find My Sake  │ Explore Japan │ Search        │
└───────┬───────┴───────┬───────┴───────┬───────┘
        ▼               ▼               ▼
  Taste compass     Region map      Name/brewery
        │               │               │
        └───────────────┴───────────────┘
                        ▼
                  Sake Detail
                        ↓
                   Bottle #27
                        ↓
                  Find in fridge
```

## 3. What changed from v1 — and why

| v1 | v2 | Reason |
|---|---|---|
| 3 separate sliders (sweetness, body, strength) | 1 draggable 2D pad (dry↔sweet, light↔rich) | Feels tactile, not like a form. Fewer inputs, same signal. Prototyped — works well. |
| 8 scoring attributes per sake (sweetness, dryness, body, strength, acidity, umami, fruitiness, aroma) | 2 required numeric axes + descriptive tags | 8 axes is a real data-entry burden on staff with no tasting training, and inconsistent scoring quietly wrecks recommendation quality. Two axes, honestly scored, beat eight axes guessed. |
| D3.js + Japan GeoJSON | Hand-authored SVG regions (6 grouped regions, not 47 prefectures) | The brief explicitly wants an *artistic*, not geographically precise, map. Hand-drawn shapes with Motion transitions achieve the same highlight/fade/zoom feel with a fraction of the code and no GeoJSON dependency. |
| Motion + GSAP + Rive | Motion only, GSAP only if Motion genuinely can't do the reveal sequence, Rive cut | Three animation libraries on a QR-loaded restaurant-wifi page is a real performance cost for marginal gain. Try Motion first for the whole reveal sequence — SVG path + keyframe animation covers most "special sequence" needs. |
| No fallback for a poor match | Explicit low-confidence state | If nothing scores well, say so honestly rather than presenting a bad match with false confidence. |
| "Search" undefined | Search by name, brewery, or prefecture, plain text match | Removes ambiguity for implementation. |

A working prototype of the taste compass, map, reveal animation, and detail page already exists (React/CSS version, built to prove the interaction — see companion file `sake-discovery-app.jsx`). Claude Code should treat it as the interaction and visual reference, not literal production code — it uses CSS keyframes standing in for what should become real Motion animations, and system fonts standing in for the fonts below.

## 4. Design system

Carry these tokens through the whole build so it doesn't default to generic Tailwind styling.

**Color**
- `--bg`: `#16233d` (deep indigo, primary background)
- `--bg2`: `#1d3155` (secondary background gradient stop)
- `--cream`: `#f4ecd8` (primary text on dark, card text on light)
- `--vermillion`: `#c0392b` / `--vermillion-dark`: `#8f2a1f` (CTAs, accents)
- `--gold`: `#cfa752` / `--gold-light`: `#e9d29a` (fridge badge, secondary accent, kickers)
- `--muted`: `#9aa7bd` (secondary text)

**Type**
- Display (headings, sake names): `Shippori Mincho` — a Japanese mincho serif, loaded via `next/font/google`
- Body/UI: `Zen Kaku Gothic New`, falling back to system sans
- Two weights only: 400 and 700

**Signature interaction**: the taste compass — a single draggable point on a 2-axis grid, not a form. This is the one place to spend animation and polish budget; keep everything else disciplined around it.

## 5. Find My Sake

A single square pad, dry↔sweet horizontal, light↔rich vertical. Pointer-drag updates a dot in real time; a text readout below describes the current point ("dry & full-bodied"). One CTA: "Reveal my sake."

No technical vocabulary (junmai/ginjo/daiginjo) surfaced at this stage.

## 6. Recommendation engine

Deterministic, not LLM-based, for v1.

```ts
function matchScore(customer: {sweetness: number; body: number}, sake: Sake) {
  const d = Math.hypot(customer.sweetness - sake.sweetness, customer.body - sake.body);
  return Math.round(100 - (d / 141.42) * 100); // 141.42 = max possible distance on a 0–100 grid
}
```

Return the top 3 by score. **If the best score is below ~50, say so explicitly** — e.g. "Nothing's a perfect match tonight, but here's what comes closest" — rather than presenting a weak match at false confidence.

Seed initial `sweetness`/`body` values from published data where available (many breweries publish Nihonshu-do and acidity figures) rather than starting from a blank guess; let staff adjust from there in admin.

## 7. Explore Japan

Six grouped regions (not 47 prefectures): Hokkaido, Tohoku, Chubu, Kansai, Chugoku, Kyushu. Each is a hand-drawn ellipse/shape positioned to suggest Japan's north–south curve — not a literal map.

Tap behavior: tapped region highlights, others dim (opacity, not removed), a panel slides up below with the region's description and its sake list.

## 8. Search

Plain substring match against name, brewery, and prefecture. No fuzzy search or semantic search in v1 — that's a Phase 3 candidate once there's usage data to justify it.

## 9. Sake detail page

- Name (EN + JP), brewery, prefecture, category
- Two animated attribute bars (dry↔sweet, light↔rich) — marker slides in on mount, don't just snap to position
- Short tasting description, food pairing tags
- **Fridge number** in a visually distinct badge (gold, gently pulsing) — this is the most important element on the page; everything above it exists to build confidence in that number

## 10. Data model (Supabase / Postgres)

```sql
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
```

Two required numeric axes, not eight. `aroma_intensity` and any future attributes are optional metadata for description text, not additional sliders.

## 11. Restaurant admin

Route: `/admin` (protect with Supabase auth — a single shared staff login is fine for v1, no need for per-user accounts yet).

Fields staff can edit: fridge number, price, in-stock toggle, sweetness, body, description, food pairing tags, image. Keep the form to what's in the schema above — don't let the admin UI imply more precision than the data supports.

## 12. Animation strategy

- **Motion**: page transitions, card stagger-in, map highlight/dim/pan, taste-pad drag physics, attribute bar fill-in. This should cover ~95% of the app.
- **GSAP**: only if the recommendation-reveal sequence (rice → water → bottle → label, if you keep that idea) genuinely needs timeline sequencing Motion can't express cleanly. Try Motion first.
- **Rive**: cut for v1. Revisit only if there's a specific animated-mascot idea worth the added dependency later.

## 13. Technology stack

```text
Frontend       Next.js, React, TypeScript, Tailwind CSS, shadcn/ui
Fonts          next/font/google — Shippori Mincho, Zen Kaku Gothic New
Animation      Motion (primary), GSAP (only if needed for one sequence)
Japan map      Hand-authored SVG, positioned manually — no D3, no GeoJSON
Backend        Supabase (Postgres + Auth)
Recommendation Attribute-distance scoring (see §6) — no AI/LLM in v1
Hosting        Vercel
```

## 14. Suggested project structure

```text
/app
  page.tsx                landing
  taste/page.tsx           taste compass + reveal
  map/page.tsx              Japan region explorer
  search/page.tsx          search
  sake/[id]/page.tsx       detail page
  admin/page.tsx           staff sake list
  admin/[id]/page.tsx      edit sake
/components
  TasteCompass.tsx
  JapanMap.tsx
  ResultCard.tsx
  AttributeBar.tsx
  FridgeBadge.tsx
/lib
  supabase.ts
  recommend.ts             matchScore() and related logic
/styles
  tokens.css               design tokens from §4
```

## 15. Development phases

**Phase 1 — MVP**
Repo scaffold → Supabase schema + seed data (start from the 12 sample sake in the prototype, replace with real inventory) → landing → taste compass + recommend logic → reveal + results → Japan map → search → sake detail → basic `/admin` CRUD → deploy to Vercel.

**Phase 2 — Experience**
Motion polish across all transitions, the one signature reveal sequence, JP/EN language toggle, restaurant branding pass, food pairing visuals.

**Phase 3 — Intelligent discovery**
Only after real usage data exists: pgvector + embeddings for natural-language queries ("something light for sashimi"). Not before.

## 16. What NOT to build in v1

- Three.js, native apps, microservices, dedicated search infra
- LLM calls per request
- D3 + GeoJSON (use hand-authored SVG regions instead)
- Rive (cut entirely for v1)
- An 8-axis attribute model (use the 2-axis model in §10)
- Complicated customer authentication

The QR experience needs to load fast on restaurant wifi — every dependency added should earn its place.

## 17. Core principle

> Discover the sake that matches you tonight.

Two ways in — by taste, by place — one destination: a bottle number a guest can walk up to and find.
