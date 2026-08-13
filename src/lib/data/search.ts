/**
 * The one definition of what "search" means in this app — plan v2 §8.
 *
 * Plain case-insensitive substring match over name (EN + JP), brewery and
 * prefecture. No fuzzy match, no ranking, no embeddings: §8 puts
 * natural-language search behind real usage data as a Phase 3 candidate, and
 * anything cleverer here would quietly become the thing that has to be un-built.
 *
 * ── Why it lives here rather than inside a repository method ─────────────────
 * The match runs in two places. `mockRepo.searchSake` (and its Postgres
 * counterpart) answer a server-side query against full `Sake` records, while
 * `/search` filters a flattened catalogue on the client so the list answers a
 * keystroke immediately rather than at the speed of restaurant wifi. Those two
 * paths hold different shapes, but they must agree exactly — a search that
 * returns one set of bottles on a shared link and a different set once the guest
 * types a letter is a bug the guest can see. So the predicate is shape-agnostic:
 * callers pass whichever of their fields §8 makes searchable.
 */

/** Trim + lowercase, so a caller normalises once instead of once per row. */
export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

/**
 * True when any supplied field contains the query as a substring.
 *
 * Nulls are skipped rather than coerced — `name_jp`, `brewery` and `prefecture`
 * are all nullable in §10, and `String(null)` would make "null" a searchable
 * term.
 *
 * @param fields the searchable values of one record, in any order — this is a
 *   boolean OR, so order carries no meaning.
 * @param normalized a query already through `normalizeSearchQuery`. An empty
 *   query matches everything: a guest who taps Search and types nothing should
 *   see the fridge, not a blank screen.
 */
export function matchesSearchQuery(
  fields: ReadonlyArray<string | null | undefined>,
  normalized: string,
): boolean {
  if (!normalized) return true;

  return fields.some(
    (field) => typeof field === "string" && field.toLowerCase().includes(normalized),
  );
}
