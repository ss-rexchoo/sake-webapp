import { BackButton } from "@/components/BackButton";
import { PageHeader } from "@/components/PageHeader";
import type { SearchRow } from "@/components/search/match";
import { SearchScreen } from "@/components/search/SearchScreen";
import { repo } from "@/lib/data";

/**
 * Search — plan v2 §8. The third way in, and the only one that assumes the guest
 * already has a name in mind.
 *
 * ── Why the catalogue is filtered on the client ─────────────────────────────
 * `repo.searchSake(q)` exists and is the canonical implementation (it is what a
 * server-driven version of this screen would call, and what the Postgres build
 * pushes down into an `ilike`). This screen deliberately does not call it per
 * keystroke. A restaurant fridge is tens of bottles, not thousands, so the whole
 * flattened catalogue is a couple of kilobytes — cheaper to send once than to
 * re-query over restaurant wifi every time a finger moves, and the difference
 * between a list that answers instantly and one that answers in 300ms is the
 * difference between search feeling like a filter and feeling like a form.
 *
 * The trade is one duplicated predicate, kept identical and isolated in
 * `./match.ts` with a note to hoist it into the data layer.
 *
 * This is the same shape as the taste results screen, which also pulls the
 * catalogue with `listSake()` and scores it in JS rather than in the database.
 * If the catalogue ever outgrows a single payload, the fix is small and the URL
 * already carries the query: swap this for `repo.searchSake(q)` and debounce a
 * `router.replace`.
 */
export default async function SearchPage({
  searchParams,
}: PageProps<"/search">) {
  const [params, sakeList] = await Promise.all([searchParams, repo.listSake()]);

  // Repeated `?q=` params are a malformed URL, not a multi-term search — §8 is a
  // single plain substring. Take the first and ignore the rest.
  const raw = params.q;
  const initialQuery = (Array.isArray(raw) ? raw[0] : raw) ?? "";

  // In-stock first, otherwise repository order (name for Postgres, seed order
  // for the mock). `sort` is stable, so this is a partition, not a reshuffle:
  // what a guest can drink tonight sits above what they can't, without the list
  // pretending to rank anything.
  const rows: SearchRow[] = [...sakeList]
    .sort((a, b) => Number(b.in_stock) - Number(a.in_stock))
    .map((sake) => ({
      id: sake.id,
      name: sake.name_en,
      nameJp: sake.name_jp,
      brewery: sake.brewery,
      prefecture: sake.prefecture,
      category: sake.category,
      inStock: sake.in_stock,
    }));

  return (
    // `data-wide-shell` — read by `AppShell` via `:has()`. Search is a
    // catalogue, and a catalogue wants a grid: the extra width becomes two
    // columns of results at `md` and three at `lg` rather than a longer scroll.
    <main data-wide-shell className="flex flex-1 flex-col">
      <BackButton />
      <PageHeader
        title="Search sake"
        subtitle="Search by name, brewery, or prefecture."
      />
      <SearchScreen rows={rows} initialQuery={initialQuery} />
    </main>
  );
}
