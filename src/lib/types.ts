/**
 * Domain types. These mirror the Postgres schema in `db/schema.sql`
 * (plan v2 §10) one-for-one — column name, nullability and all.
 *
 * Note the deliberate 2-axis taste model: `sweetness` and `body` are the only
 * scored attributes. `aroma_intensity` is descriptive metadata, never a slider.
 */

export interface Region {
  /** Slug primary key, e.g. 'chubu'. */
  id: string;
  name: string;
  name_jp: string | null;
  description: string | null;
  /** Position/shape on the hand-authored SVG map (plan v2 §7). */
  map_cx: number | null;
  map_cy: number | null;
  map_rx: number | null;
  map_ry: number | null;
  map_rotation: number | null;
}

export interface Sake {
  id: string;
  name_en: string;
  name_jp: string | null;
  brewery: string | null;
  prefecture: string | null;
  region_id: string | null;
  /** Junmai / Ginjo / Daiginjo / Honjozo / … */
  category: string | null;
  /** 0 = dry, 100 = sweet. */
  sweetness: number;
  /** 0 = light, 100 = rich. */
  body: number;
  /** Optional, descriptive only — not a customer-facing slider. */
  aroma_intensity: number | null;
  description: string | null;
  food_pairing: string[];
  image_url: string | null;
  fridge_number: number;
  price: number | null;
  in_stock: boolean;
  /** ISO 8601 timestamp. */
  updated_at: string;
}

/** Fields a client may supply when creating a sake row. */
export type SakeCreateInput = Omit<Sake, "id" | "updated_at"> &
  Partial<Pick<Sake, "id">>;

/** Fields a client may patch on an existing sake row. */
export type SakeUpdateInput = Partial<Omit<Sake, "id" | "updated_at">>;

/** The customer's point on the taste compass (plan v2 §5). */
export interface TastePoint {
  /** 0 = dry, 100 = sweet. */
  sweetness: number;
  /** 0 = light, 100 = rich. */
  body: number;
}
