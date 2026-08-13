import Link from "next/link";

import { BackButton } from "@/components/BackButton";
import { PageHeader } from "@/components/PageHeader";
import { RevealGate } from "@/components/RevealGate";
import type { TasteMatch } from "@/components/TasteResults";
import { TasteResults } from "@/components/TasteResults";
import { repo } from "@/lib/data";
import { isLowConfidence, topMatches } from "@/lib/recommend";
import { parseTastePoint, tasteQuery } from "@/lib/taste-params";

/**
 * Reveal + results — plan v2 §6.
 *
 * ── Why a separate route ────────────────────────────────────────────────────
 * The alternative was transitioning in place on `/taste`. A route wins on three
 * counts that all matter at a restaurant table: the URL carries the taste point
 * so a guest can hand their phone over or reload without re-plotting, the
 * browser Back button returns to the pad instead of exiting the app, and Next
 * prefetches this screen while the guest is still dragging — so the reveal is
 * pure theatre rather than a spinner over a fetch.
 *
 * Scoring happens here, on the server: the client never receives the sake
 * catalogue, only the three rows it is about to draw.
 */
export default async function TasteResultsPage({
  searchParams,
}: PageProps<"/taste/results">) {
  const [params, sakeList] = await Promise.all([searchParams, repo.listSake()]);

  const point = parseTastePoint(params.x, params.y);
  const results = topMatches(point, sakeList);

  // Nothing in stock at all — a different problem from a weak match, and it
  // gets its own words rather than being folded into the low-confidence state.
  if (results.length === 0) {
    return (
      <main className="flex flex-1 flex-col">
        <BackButton />
        <PageHeader
          align="center"
          title="Nothing's in the fridge tonight"
          subtitle="Every bottle is out of stock right now. Your server will know what else is open."
        />
        <Link
          href="/"
          className="mx-auto rounded-full border border-cream/20 surface-8 px-4 py-2 text-[13px] text-cream transition-colors duration-200 hover:bg-cream/16 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
        >
          Back to start
        </Link>
      </main>
    );
  }

  const matches: TasteMatch[] = results.map(({ sake, score }) => ({
    id: sake.id,
    name: sake.name_en,
    sub: [sake.prefecture, sake.category].filter(Boolean).join(" · "),
    tags: sake.food_pairing.slice(0, 2),
    // Floored at 1: `matchScore` bottoms out at 0 and can round to `-0` at the
    // far corner of the grid, and "-0% match" on a card is a visible bug.
    score: Math.max(1, score),
  }));

  const lowConfidence = isLowConfidence(results);
  const query = tasteQuery(point);

  return (
    <main className="flex flex-1 flex-col">
      <BackButton />
      <RevealGate
        // The taste point is the identity of this reveal: a new plot is worth
        // the theatre, coming back to the same one is not.
        revealKey={query}
        announcement={
          lowConfidence
            ? `No perfect match tonight. Showing the ${matches.length} closest.`
            : `${matches.length} matches found.`
        }
      >
        <TasteResults
          matches={matches}
          lowConfidence={lowConfidence}
          adjustHref={`/taste?${query}`}
        />
      </RevealGate>
    </main>
  );
}
