/**
 * Search matching — plan v2 §8.
 *
 * Plain case-insensitive substring match over name (EN + JP), brewery and
 * prefecture. No fuzzy match, no ranking, no embeddings: §8 puts natural-language
 * search behind real usage data as a Phase 3 candidate, and anything cleverer
 * here would quietly become the thing that has to be un-built later.
 *
 * ── Where the matching actually lives ───────────────────────────────────────
 * `/search` filters on the client so the list answers a keystroke immediately
 * rather than at the speed of restaurant wifi (see the note in `page.tsx`). That
 * means the match runs in the browser, but it must stay *identical* to
 * `mockRepo.searchSake` / `postgresRepo.searchSake` — a search that returns one
 * set of bottles on a shared link and another set once you type a letter is a
 * bug the guest can see.
 *
 * So the predicate itself is not defined here. `@/lib/data/search` owns it and
 * both the repositories and this module call it; this file only says which of
 * `SearchRow`'s fields §8 makes searchable.
 */

import { matchesSearchQuery, normalizeSearchQuery } from "@/lib/data/search";

/**
 * A catalogue row, flattened on the server. Deliberately not a `Sake`: the
 * client never needs `sweetness`, `description`, `price` or `food_pairing` to
 * draw this list, and a QR-loaded page should not ship what it will not paint.
 * Every field below is either matched against or rendered.
 */
export interface SearchRow {
  id: string;
  /** `name_en`. */
  name: string;
  /** `name_jp` — matched so a guest can type 獺祭 as readily as "Dassai". */
  nameJp: string | null;
  brewery: string | null;
  prefecture: string | null;
  category: string | null;
  inStock: boolean;
}

/** Trim + lowercase, so the caller normalises once instead of once per row. */
export const normalizeQuery = normalizeSearchQuery;

/** @param normalized a query already through `normalizeQuery`. */
export function matchesQuery(row: SearchRow, normalized: string): boolean {
  // The fields §8 makes searchable. Order is irrelevant — this is a boolean OR.
  return matchesSearchQuery(
    [row.name, row.nameJp, row.brewery, row.prefecture],
    normalized,
  );
}

/**
 * An empty query returns the whole catalogue rather than nothing — a guest who
 * taps Search and types nothing should see the fridge, not a blank screen. This
 * mirrors both repository implementations, which also treat "" as "everything".
 */
export function filterRows(rows: SearchRow[], query: string): SearchRow[] {
  const normalized = normalizeQuery(query);
  if (!normalized) return rows;
  return rows.filter((row) => matchesQuery(row, normalized));
}
