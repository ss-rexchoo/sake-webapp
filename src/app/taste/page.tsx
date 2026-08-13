import Link from "next/link";

import { BackButton } from "@/components/BackButton";
import { PageHeader } from "@/components/PageHeader";
import { TasteFinder } from "@/components/TasteFinder";
import { repo } from "@/lib/data";
import { parseTastePoint } from "@/lib/taste-params";

/**
 * Find My Sake — plan v2 §5.
 *
 * Server component on purpose: the sake list is fetched here, on the server,
 * and only the compass itself is a client island. There is no `useEffect`
 * fetch anywhere in this flow.
 *
 * `?x=`/`?y=` are optional and only ever arrive from the results screen's
 * "Adjust my taste" link, so going back to the pad returns the guest to their
 * own point rather than to the centre.
 *
 * No technical vocabulary on this screen — no junmai, ginjo or daiginjo until
 * the guest has a bottle in front of them (§5).
 */
export default async function TastePage({ searchParams }: PageProps<"/taste">) {
  const [params, sakeList] = await Promise.all([searchParams, repo.listSake()]);

  const initial = parseTastePoint(params.x, params.y);
  const available = sakeList.filter((sake) => sake.in_stock).length;

  // Honest empty state. Plotting a taste that cannot be answered is worse than
  // saying so — the guest's next move is a question to their server, not a drag.
  if (available === 0) {
    return (
      <main className="flex flex-1 flex-col">
        <BackButton />
        <PageHeader
          title="Nothing's in the fridge tonight"
          subtitle="Every bottle is out of stock right now. Your server will know what else is open."
        />
        <Link
          href="/"
          className="mt-2 self-start rounded-full border border-cream/20 bg-cream/8 px-4 py-2 text-[13px] text-cream transition-colors duration-200 hover:bg-cream/16 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
        >
          Back to start
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <BackButton />
      <PageHeader
        title="Plot your taste"
        subtitle="Drag the mark to where your mood sits."
      />
      <TasteFinder initial={initial} />
    </main>
  );
}
