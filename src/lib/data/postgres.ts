import { databaseNotConfigured, isDatabaseConfigured, query } from "@/lib/db";
import type {
  Region,
  Sake,
  SakeCreateInput,
  SakeUpdateInput,
} from "@/lib/types";
import type { SakeRepository } from "./repository";
import { normalizeSearchQuery } from "./search";

/**
 * Real Postgres implementation of `SakeRepository`, talking to RDS through the
 * `pg` pool in `src/lib/db.ts`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SERVER ONLY — see the header of `src/lib/db.ts`.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Written but currently unreachable: no `DATABASE_URL` exists yet, so
 * `./index.ts` selects `mockRepo` and nothing here runs. Every method throws a
 * clear configuration error rather than a driver-level one if it is called
 * without that variable.
 *
 * Every statement below is parameterised. There is no string interpolation of
 * caller-supplied values into SQL anywhere in this file; the only interpolated
 * fragments are column names drawn from the fixed `SAKE_COLUMNS` allowlist.
 */

// ─── Row shapes ─────────────────────────────────────────────────────────────

/**
 * How `pg` actually hands these back, before mapping.
 *
 * ── The numeric trap ────────────────────────────────────────────────────────
 * `pg` returns Postgres `numeric` (OID 1700) as a **string**, not a number. It
 * is right to: `numeric` is arbitrary-precision and a float64 cannot hold every
 * value it can. But `sweetness`, `body`, `price`, `aroma_intensity` and all five
 * `map_*` columns are `numeric`, and the recommendation maths is
 * `Math.hypot(customer.sweetness - sake.sweetness, …)`. Hand it `"15"` and
 * `50 - "15"` coerces to 35 and looks fine, while `sake.sweetness > 50` compares
 * strings and `Math.round` of a string-derived score is subtly off — a failure
 * that shows up as slightly wrong recommendations rather than as an error.
 *
 * So every `numeric` column is converted explicitly in the mappers below. This
 * is done per-column rather than with a global `pg.types.setTypeParser(1700, …)`
 * because a global parser is invisible at the call site and silently changes the
 * behaviour of any future query in the process.
 *
 * `int` (`fridge_number`) and `boolean` (`in_stock`) come back as real numbers
 * and booleans and need no conversion. `text[]` (`food_pairing`) comes back as a
 * JS array, or null. `timestamptz` comes back as a JS `Date`, and `Sake` wants
 * an ISO string.
 */
interface SakeRow {
  id: string;
  name_en: string;
  name_jp: string | null;
  brewery: string | null;
  prefecture: string | null;
  region_id: string | null;
  category: string | null;
  sweetness: string | null;
  body: string | null;
  aroma_intensity: string | null;
  description: string | null;
  food_pairing: string[] | null;
  image_url: string | null;
  fridge_number: number;
  price: string | null;
  in_stock: boolean | null;
  updated_at: Date | string;
}

interface RegionRow {
  id: string;
  name: string;
  name_jp: string | null;
  description: string | null;
  map_cx: string | null;
  map_cy: string | null;
  map_rx: string | null;
  map_ry: string | null;
  map_rotation: string | null;
}

// ─── Column lists ───────────────────────────────────────────────────────────

/**
 * The writable `sake` columns, in one place. Used both to build the SELECT list
 * and as the allowlist for the dynamic UPDATE in `updateSake` — which is why
 * `id` and `updated_at` are absent: neither may be written by a caller.
 */
const SAKE_COLUMNS = [
  "name_en",
  "name_jp",
  "brewery",
  "prefecture",
  "region_id",
  "category",
  "sweetness",
  "body",
  "aroma_intensity",
  "description",
  "food_pairing",
  "image_url",
  "fridge_number",
  "price",
  "in_stock",
] as const;

type SakeColumn = (typeof SAKE_COLUMNS)[number];

const SAKE_SELECT = `id, ${SAKE_COLUMNS.join(", ")}, updated_at`;

const REGION_SELECT =
  "id, name, name_jp, description, map_cx, map_cy, map_rx, map_ry, map_rotation";

// ─── Mapping ────────────────────────────────────────────────────────────────

/** `numeric` → number, preserving null. */
function num(value: string | number | null): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * `numeric` → number for the two columns the app treats as non-nullable.
 *
 * `sweetness` and `body` are `numeric check (… between 0 and 100)` in the schema
 * with no NOT NULL, but `Sake` types them as `number` and the admin form always
 * writes both. A null would otherwise reach `matchScore` as NaN and poison every
 * recommendation on the page, so it falls back to 50 — the centre of the
 * compass, which is the least opinionated thing an unset value can be.
 */
function axis(value: string | number | null): number {
  return num(value) ?? 50;
}

function mapSake(row: SakeRow): Sake {
  return {
    id: row.id,
    name_en: row.name_en,
    name_jp: row.name_jp,
    brewery: row.brewery,
    prefecture: row.prefecture,
    region_id: row.region_id,
    category: row.category,
    sweetness: axis(row.sweetness),
    body: axis(row.body),
    aroma_intensity: num(row.aroma_intensity),
    description: row.description,
    // `text[]` arrives as a JS array. Null (column never set) becomes [] so no
    // caller has to null-check before mapping over the pairing tags.
    food_pairing: row.food_pairing ?? [],
    image_url: row.image_url,
    fridge_number: row.fridge_number,
    price: num(row.price),
    // `in_stock` has a default of true but is nullable; an explicit null is not
    // "in stock".
    in_stock: row.in_stock ?? false,
    updated_at:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at),
  };
}

function mapRegion(row: RegionRow): Region {
  return {
    id: row.id,
    name: row.name,
    name_jp: row.name_jp,
    description: row.description,
    map_cx: num(row.map_cx),
    map_cy: num(row.map_cy),
    map_rx: num(row.map_rx),
    map_ry: num(row.map_ry),
    map_rotation: num(row.map_rotation),
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function assertConfigured(): void {
  if (!isDatabaseConfigured()) throw databaseNotConfigured();
}

/**
 * `sake.id` is `uuid`. A stale bookmark or a hand-edited URL carrying something
 * that is not a uuid makes Postgres raise 22P02 (`invalid_text_representation`),
 * which would surface as a 500 on `/sake/[id]` instead of the not-found screen
 * that route already has. A malformed id is "no such row", not a server fault.
 */
function isMalformedId(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "22P02"
  );
}

/**
 * Escapes the three characters `LIKE` treats as special so a guest typing `%`
 * matches a literal percent sign rather than the entire fridge. Backslash first,
 * or it would escape the escapes added after it.
 *
 * `\` is `LIKE`'s default escape character (no `ESCAPE` clause needed), and the
 * pattern travels as a bind parameter, so it is never parsed as a SQL literal.
 */
function likePattern(normalized: string): string {
  return `%${normalized.replace(/[\\%_]/g, "\\$&")}%`;
}

// ─── Repository ─────────────────────────────────────────────────────────────

export const postgresRepo: SakeRepository = {
  async listSake() {
    assertConfigured();
    const rows = await query<SakeRow>(
      `select ${SAKE_SELECT} from sake order by name_en asc`,
    );
    return rows.map(mapSake);
  },

  async getSake(id) {
    assertConfigured();
    try {
      const rows = await query<SakeRow>(
        `select ${SAKE_SELECT} from sake where id = $1`,
        [id],
      );
      return rows[0] ? mapSake(rows[0]) : null;
    } catch (error) {
      if (isMalformedId(error)) return null;
      throw error;
    }
  },

  async listRegions() {
    assertConfigured();
    // Ordered by map_cy — north to south down the map, which is the order the
    // region list is read in and the order the mock seed is written in.
    const rows = await query<RegionRow>(
      `select ${REGION_SELECT} from regions order by map_cy asc`,
    );
    return rows.map(mapRegion);
  },

  async getRegion(id) {
    assertConfigured();
    const rows = await query<RegionRow>(
      `select ${REGION_SELECT} from regions where id = $1`,
      [id],
    );
    return rows[0] ? mapRegion(rows[0]) : null;
  },

  async listSakeByRegion(regionId) {
    assertConfigured();
    const rows = await query<SakeRow>(
      `select ${SAKE_SELECT} from sake where region_id = $1 order by name_en asc`,
      [regionId],
    );
    return rows.map(mapSake);
  },

  /**
   * Plain case-insensitive substring match over name (EN + JP), brewery and
   * prefecture — plan v2 §8, and byte-for-byte the same rule as
   * `mockRepo.searchSake` and the client-side filter in
   * `src/components/search/match.ts`.
   *
   * The three implementations agree because they share `normalizeSearchQuery`
   * and the same four fields:
   *   - empty query → the whole catalogue (a guest who taps Search and types
   *     nothing sees the fridge, not a blank screen);
   *   - otherwise, `field.toLowerCase().includes(q)` in JS is `field ILIKE %q%`
   *     in Postgres, with the wildcards in the *parameter* and any `%`, `_` or
   *     `\` in the guest's text escaped so they match themselves.
   *
   * The one residual difference is case folding: JS `toLowerCase()` and
   * Postgres' collation-aware `ILIKE` can disagree on exotic scripts (Turkish
   * dotless i is the classic). Neither Latin brewery names nor Japanese kana or
   * kanji — which have no case at all — are affected.
   */
  async searchSake(query_) {
    assertConfigured();
    const q = normalizeSearchQuery(query_);
    if (!q) return this.listSake();

    const rows = await query<SakeRow>(
      `select ${SAKE_SELECT}
         from sake
        where name_en ilike $1
           or name_jp ilike $1
           or brewery ilike $1
           or prefecture ilike $1
        order by name_en asc`,
      [likePattern(q)],
    );
    return rows.map(mapSake);
  },

  async createSake(input: SakeCreateInput) {
    assertConfigured();

    // Column names come from the fixed allowlist, never from the input's keys.
    const columns: SakeColumn[] = [...SAKE_COLUMNS];
    const values: unknown[] = columns.map((column) => input[column]);

    // `id` is optional: the mock lets a caller supply one, and the schema
    // defaults to gen_random_uuid() when it is absent.
    const names: string[] = [...columns];
    if (input.id) {
      names.unshift("id");
      values.unshift(input.id);
    }

    const placeholders = names.map((_, i) => `$${i + 1}`);

    const rows = await query<SakeRow>(
      `insert into sake (${names.join(", ")})
       values (${placeholders.join(", ")})
       returning ${SAKE_SELECT}`,
      values,
    );
    return mapSake(rows[0]);
  },

  /**
   * Partial patch: only the columns actually present in `patch` are written, so
   * a caller updating `in_stock` cannot blank out a description it never read.
   *
   * `id` is not in `SAKE_COLUMNS`, so there is no path by which a caller can
   * move a row to a different primary key — the `id` in the WHERE clause is the
   * only one in the statement. `updated_at` is likewise not writable: it is set
   * here *and* by the `sake_set_updated_at` trigger, belt and braces, and
   * including it guarantees a non-empty SET list even for an empty patch (which
   * then touches the row, matching the mock).
   */
  async updateSake(id: string, patch: SakeUpdateInput) {
    assertConfigured();

    const assignments: string[] = [];
    const values: unknown[] = [];

    for (const column of SAKE_COLUMNS) {
      if (!(column in patch)) continue;
      values.push(patch[column]);
      assignments.push(`${column} = $${values.length}`);
    }

    assignments.push("updated_at = now()");
    values.push(id);

    try {
      const rows = await query<SakeRow>(
        `update sake
            set ${assignments.join(", ")}
          where id = $${values.length}
      returning ${SAKE_SELECT}`,
        values,
      );

      if (!rows[0]) throw new Error(`Sake not found: ${id}`);
      return mapSake(rows[0]);
    } catch (error) {
      if (isMalformedId(error)) throw new Error(`Sake not found: ${id}`);
      throw error;
    }
  },

  async deleteSake(id) {
    assertConfigured();
    try {
      const rows = await query<{ id: string }>(
        `delete from sake where id = $1 returning id`,
        [id],
      );
      if (!rows[0]) throw new Error(`Sake not found: ${id}`);
    } catch (error) {
      if (isMalformedId(error)) throw new Error(`Sake not found: ${id}`);
      throw error;
    }
  },
};
