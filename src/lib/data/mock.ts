import type { Region, Sake } from "@/lib/types";
import type { SakeRepository } from "./repository";
import { matchesSearchQuery, normalizeSearchQuery } from "./search";

/**
 * In-memory implementation of `SakeRepository`, seeded with the 12 sample sake
 * and 6 regions from the interaction prototype (`sake-discovery-app.jsx`),
 * mapped into the plan v2 §10 schema shape.
 *
 * Mutations persist for the lifetime of the Node process only, which is enough
 * for the admin CRUD screens to work end-to-end before database credentials
 * exist. Restarting the dev server resets the seed.
 *
 * This is also what the Vercel prototype deploy runs on, where "the lifetime of
 * the Node process" is shorter and less predictable than it sounds — see the
 * warning in README.md.
 */

/** Fixed so server and client render identical values (no hydration drift). */
const SEEDED_AT = "2026-01-01T00:00:00.000Z";

/**
 * ── On the `map_*` columns ──────────────────────────────────────────────────
 * `map_cx`/`map_cy` are the **label anchor** — where a region's name sits on the
 * map — and nothing else. They are honoured only if the word actually fits
 * inside that region's coastline at that point; otherwise `JapanMap` falls back
 * to the authored anchor in `src/components/map/shapes.ts`.
 *
 * These values were re-seeded when the map moved from rotated ellipses to
 * hand-authored coastline paths. The originals were ellipse centres in a
 * different coordinate space — all six sat outside the new geometry, so every
 * one silently failed the fit test and the column had stopped doing anything.
 * If you change the map's projection again, re-seed these from `shapes.ts` or
 * staff lose the ability to nudge a label.
 *
 * `map_rx`, `map_ry` and `map_rotation` are **vestigial** — they described the
 * old ellipses and nothing reads them now. Kept because they are in the plan
 * §10 schema and dropping a column is a migration; do not wire them back up.
 */
const REGION_SEED: readonly Region[] = [
  {
    id: "hokkaido",
    name: "Hokkaido",
    name_jp: "北海道",
    description:
      "Cold winters and mountain snowmelt make for clean, refreshing sake.",
    map_cx: 208.4,
    map_cy: 41.9,
    map_rx: 50,
    map_ry: 34,
    map_rotation: -6,
  },
  {
    id: "tohoku",
    name: "Tohoku",
    name_jp: "東北",
    description:
      "Heavy snowfall country, famous for fruity, award-winning sake.",
    map_cx: 179.8,
    map_cy: 114.7,
    map_rx: 56,
    map_ry: 50,
    map_rotation: -4,
  },
  {
    id: "chubu",
    name: "Chubu",
    name_jp: "中部・新潟",
    description:
      "Home of Niigata, birthplace of clean, dry tanrei-karakuchi sake.",
    map_cx: 143.7,
    map_cy: 164.9,
    map_rx: 58,
    map_ry: 46,
    map_rotation: -8,
  },
  {
    id: "kansai",
    name: "Kansai",
    name_jp: "関西",
    description: "Historic brewing heartland around Kyoto and Hyogo.",
    map_cx: 108.2,
    map_cy: 193.7,
    map_rx: 52,
    map_ry: 44,
    map_rotation: -5,
  },
  {
    id: "chugoku",
    name: "Chugoku",
    name_jp: "中国",
    description: "Home of Dassai and the polished, fruity ginjo style.",
    map_cx: 70.9,
    map_cy: 196.5,
    map_rx: 48,
    map_ry: 38,
    map_rotation: -6,
  },
  {
    id: "kyushu",
    name: "Kyushu",
    name_jp: "九州",
    description: "A warmer climate producing bold, umami-rich sake.",
    map_cx: 34.6,
    map_cy: 230.2,
    map_rx: 46,
    map_ry: 34,
    map_rotation: -4,
  },
];

const SAKE_SEED: readonly Sake[] = [
  {
    id: "1",
    name_en: "Hakkaisan",
    name_jp: "八海山",
    brewery: "Hakkaisan Brewery",
    prefecture: "Niigata",
    region_id: "chubu",
    category: "Junmai Ginjo",
    sweetness: 15,
    body: 22,
    aroma_intensity: null,
    description:
      "Clean, dry, and crisp — the archetype of Niigata's tanrei-karakuchi style.",
    food_pairing: ["Sashimi", "Seafood", "Beginner friendly"],
    image_url: null,
    fridge_number: 27,
    price: 145,
    in_stock: true,
    updated_at: SEEDED_AT,
  },
  {
    id: "2",
    name_en: "Kubota Senju",
    name_jp: "久保田 千寿",
    brewery: "Asahi Shuzo",
    prefecture: "Niigata",
    region_id: "chubu",
    category: "Ginjo",
    sweetness: 22,
    body: 30,
    aroma_intensity: null,
    description:
      "Soft and elegant, with gentle rice sweetness balanced by a dry finish.",
    food_pairing: ["Sushi", "Light appetizers"],
    image_url: null,
    fridge_number: 14,
    price: 130,
    in_stock: true,
    updated_at: SEEDED_AT,
  },
  {
    id: "3",
    name_en: "Juyondai",
    name_jp: "十四代",
    brewery: "Takagi Shuzo",
    prefecture: "Yamagata",
    region_id: "tohoku",
    category: "Junmai Daiginjo",
    sweetness: 68,
    body: 55,
    aroma_intensity: null,
    description: "Lush and fruity, famously hard to find — a modern classic.",
    food_pairing: ["Cheese", "Fruit", "Special occasion"],
    image_url: null,
    fridge_number: 31,
    price: 320,
    // The one seed bottle deliberately out of stock, so the out-of-stock paths
    // are visible in the sample data rather than only in a test: the greyed
    // fridge badge on the detail page, the demoted row in search, the exclusion
    // from recommendations, and the inline toggle in admin. Juyondai is the
    // honest choice for it — the description already says "famously hard to
    // find", so a sold-out slot reads as true rather than as a bug.
    // Replace this whole seed array with real inventory before opening.
    in_stock: false,
    updated_at: SEEDED_AT,
  },
  {
    id: "4",
    name_en: "Tatenokawa 18",
    name_jp: "楯野川 純米大吟醸18",
    brewery: "Tatenokawa",
    prefecture: "Yamagata",
    region_id: "tohoku",
    category: "Junmai Daiginjo",
    sweetness: 40,
    body: 35,
    aroma_intensity: null,
    description:
      "Polished to 18%, delicate and fragrant with a silky texture.",
    food_pairing: ["Delicate fish", "White meat"],
    image_url: null,
    fridge_number: 22,
    price: 285,
    in_stock: true,
    updated_at: SEEDED_AT,
  },
  {
    id: "5",
    name_en: "Kikumasamune",
    name_jp: "菊正宗",
    brewery: "Kikumasamune",
    prefecture: "Hyogo",
    region_id: "kansai",
    category: "Honjozo",
    sweetness: 25,
    body: 62,
    aroma_intensity: null,
    description: "A traditional Nada-style sake, full-bodied with deep umami.",
    food_pairing: ["Grilled meat", "Umami dishes"],
    image_url: null,
    fridge_number: 5,
    price: 95,
    in_stock: true,
    updated_at: SEEDED_AT,
  },
  {
    id: "6",
    name_en: "Gekkeikan",
    name_jp: "月桂冠",
    brewery: "Gekkeikan",
    prefecture: "Kyoto",
    region_id: "kansai",
    category: "Junmai",
    sweetness: 46,
    body: 44,
    aroma_intensity: null,
    description:
      "A soft, approachable Fushimi-style sake, lovely served warm.",
    food_pairing: ["Everyday food", "Warm sake"],
    image_url: null,
    fridge_number: 11,
    price: 90,
    in_stock: true,
    updated_at: SEEDED_AT,
  },
  {
    id: "7",
    name_en: "Dassai 45",
    name_jp: "獺祭 45",
    brewery: "Asahi Shuzo (Yamaguchi)",
    prefecture: "Yamaguchi",
    region_id: "chugoku",
    category: "Junmai Daiginjo",
    sweetness: 55,
    body: 38,
    aroma_intensity: null,
    description:
      "Bright and fruity, polished to 45% — approachable and aromatic.",
    food_pairing: ["Tempura", "Light dishes"],
    image_url: null,
    fridge_number: 8,
    price: 175,
    in_stock: true,
    updated_at: SEEDED_AT,
  },
  {
    id: "8",
    name_en: "Kamotsuru",
    name_jp: "賀茂鶴",
    brewery: "Kamotsuru Shuzo",
    prefecture: "Hiroshima",
    region_id: "chugoku",
    category: "Junmai",
    sweetness: 35,
    body: 50,
    aroma_intensity: null,
    description:
      "Soft Hiroshima water gives this sake a smooth, rounded body.",
    food_pairing: ["Grilled fish", "Oysters"],
    image_url: null,
    fridge_number: 19,
    price: 115,
    in_stock: true,
    updated_at: SEEDED_AT,
  },
  {
    id: "9",
    name_en: "Nabeshima",
    name_jp: "鍋島",
    brewery: "Fukuchiyo Shuzo",
    prefecture: "Saga",
    region_id: "kyushu",
    category: "Junmai Ginjo",
    sweetness: 50,
    body: 48,
    aroma_intensity: null,
    description:
      "Award-winning Saga sake with balanced sweetness and clean acidity.",
    food_pairing: ["Grilled dishes", "Vegetables"],
    image_url: null,
    fridge_number: 17,
    price: 190,
    in_stock: true,
    updated_at: SEEDED_AT,
  },
  {
    id: "10",
    name_en: "Tenzan",
    name_jp: "天山",
    brewery: "Tenzan Shuzo",
    prefecture: "Saga",
    region_id: "kyushu",
    category: "Junmai",
    sweetness: 32,
    body: 58,
    aroma_intensity: null,
    description:
      "Full-bodied and warming — built to stand up to hearty cooking.",
    food_pairing: ["Nabe hotpot", "Robust dishes"],
    image_url: null,
    fridge_number: 24,
    price: 105,
    in_stock: true,
    updated_at: SEEDED_AT,
  },
  {
    id: "11",
    name_en: "Otokoyama",
    name_jp: "男山",
    brewery: "Otokoyama Brewery",
    prefecture: "Hokkaido",
    region_id: "hokkaido",
    category: "Junmai Ginjo",
    sweetness: 20,
    body: 34,
    aroma_intensity: null,
    description:
      "Brewed with pristine Daisetsuzan snowmelt — clean and refreshing.",
    food_pairing: ["Crab", "Cold dishes"],
    image_url: null,
    fridge_number: 33,
    price: 135,
    in_stock: true,
    updated_at: SEEDED_AT,
  },
  {
    id: "12",
    name_en: "Kunimare",
    name_jp: "国稀",
    brewery: "Kunimare Shuzo",
    prefecture: "Hokkaido",
    region_id: "hokkaido",
    category: "Ginjo",
    sweetness: 58,
    body: 28,
    aroma_intensity: null,
    description:
      "Japan's northernmost brewery — light, gently sweet, easy drinking.",
    food_pairing: ["Light appetizers", "Aperitif"],
    image_url: null,
    fridge_number: 29,
    price: 120,
    in_stock: true,
    updated_at: SEEDED_AT,
  },
];

/** Mutable process-lifetime store. */
const sakeStore: Sake[] = SAKE_SEED.map(cloneSake);
const regionStore: Region[] = REGION_SEED.map((r) => ({ ...r }));

function cloneSake(sake: Sake): Sake {
  return { ...sake, food_pairing: [...sake.food_pairing] };
}

function nextId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sake-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export const mockRepo: SakeRepository = {
  async listSake() {
    return sakeStore.map(cloneSake);
  },

  async getSake(id) {
    const found = sakeStore.find((s) => s.id === id);
    return found ? cloneSake(found) : null;
  },

  async listRegions() {
    return regionStore.map((r) => ({ ...r }));
  },

  async getRegion(id) {
    const found = regionStore.find((r) => r.id === id);
    return found ? { ...found } : null;
  },

  async listSakeByRegion(regionId) {
    return sakeStore.filter((s) => s.region_id === regionId).map(cloneSake);
  },

  // Plain case-insensitive substring match over name (EN + JP), brewery and
  // prefecture. No fuzzy or semantic search in v1 — plan v2 §8.
  async searchSake(query) {
    const q = normalizeSearchQuery(query);
    if (!q) return sakeStore.map(cloneSake);

    return sakeStore
      .filter((s) =>
        matchesSearchQuery([s.name_en, s.name_jp, s.brewery, s.prefecture], q),
      )
      .map(cloneSake);
  },

  async createSake(input) {
    const created: Sake = {
      ...input,
      food_pairing: [...input.food_pairing],
      id: input.id ?? nextId(),
      updated_at: new Date().toISOString(),
    };
    sakeStore.push(created);
    return cloneSake(created);
  },

  async updateSake(id, patch) {
    const index = sakeStore.findIndex((s) => s.id === id);
    if (index === -1) {
      throw new Error(`Sake not found: ${id}`);
    }

    const updated: Sake = {
      ...sakeStore[index],
      ...patch,
      food_pairing: patch.food_pairing
        ? [...patch.food_pairing]
        : [...sakeStore[index].food_pairing],
      id,
      updated_at: new Date().toISOString(),
    };
    sakeStore[index] = updated;
    return cloneSake(updated);
  },

  async deleteSake(id) {
    const index = sakeStore.findIndex((s) => s.id === id);
    if (index === -1) {
      throw new Error(`Sake not found: ${id}`);
    }
    sakeStore.splice(index, 1);
  },
};

/** Exported for `db/seed.sql` parity checks and tests, not for app code. */
export const seedData = { sake: SAKE_SEED, regions: REGION_SEED };
