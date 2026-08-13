import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AttributeBar } from "@/components/AttributeBar";
import { BackButton } from "@/components/BackButton";
import { FridgeBadge } from "@/components/FridgeBadge";
import { Kicker } from "@/components/Kicker";
import { SakeHero } from "@/components/sake/SakeHero";
import { TagPill } from "@/components/TagPill";
import { VENUE_LABEL } from "@/lib/config";
import { repo } from "@/lib/data";

/**
 * A shared link should say what it is. Without this the tab reads "Sake
 * Discovery" for all twelve bottles — and this is the one URL guests actually
 * pass between phones at a table.
 */
export async function generateMetadata({
  params,
}: PageProps<"/sake/[id]">): Promise<Metadata> {
  const { id } = await params;
  const sake = await repo.getSake(id);

  if (!sake) {
    return { title: `Bottle not found · ${VENUE_LABEL}` };
  }

  return {
    title: `${sake.name_en} · ${VENUE_LABEL}`,
    description:
      sake.description ??
      `${sake.name_en} — bottle #${sake.fridge_number} in the fridge.`,
  };
}

/**
 * Sake detail — plan v2 §9. The destination of every path through the app: the
 * taste compass, the region map and search all end here, and this page ends at
 * a number a guest can walk up to and find (§17).
 *
 * Reading order is the argument the page is making: what it is → how it tastes
 * → what it goes with → where it is. Everything above the fridge badge exists
 * to make that number worth acting on.
 *
 * Server-rendered from `repo.getSake`; only the two things that move — the
 * attribute bars and the badge — cross into the client.
 */
export default async function SakeDetailPage({
  params,
}: PageProps<"/sake/[id]">) {
  const { id } = await params;
  const sake = await repo.getSake(id);

  // An unknown id is a wrong QR code or a stale link, not a crash. `notFound()`
  // throws, so `sake` is narrowed below.
  if (!sake) {
    notFound();
  }

  return (
    <main className="flex flex-1 flex-col">
      <BackButton />

      <SakeHero sake={sake} />

      <section aria-label="Taste profile">
        <Kicker className="mb-2">How it tastes</Kicker>
        <AttributeBar
          leftLabel="Dry"
          rightLabel="Sweet"
          value={sake.sweetness}
          index={0}
        />
        {/* `mb-0` on the last bar: `main` is a flex column, so margins do not
            collapse — the bar's own `mb-4` would stack with the description's
            `mt-4` and open a 32px gap here while every other section break on
            the page is 16px. The page's rhythm has to be even for the break
            above the fridge badge to read as a break. */}
        <AttributeBar
          leftLabel="Light"
          rightLabel="Rich"
          value={sake.body}
          index={1}
          className="mb-0"
        />
      </section>

      {sake.description ? (
        <p className="mt-4 text-[13.5px] leading-relaxed text-cream/92">
          {sake.description}
        </p>
      ) : null}

      {sake.food_pairing.length > 0 ? (
        <section aria-label="Food pairings" className="mt-4">
          <Kicker className="mb-2">Pairs well with</Kicker>
          <div className="flex flex-wrap gap-1.5">
            {sake.food_pairing.map((pairing) => (
              <TagPill key={pairing}>{pairing}</TagPill>
            ))}
          </div>
        </section>
      ) : null}

      {/* A deliberately large gap above the badge. It is the one break in the
          page's rhythm, and it is what makes the badge read as the conclusion
          of everything above rather than as the next item in a list.

          32px against the 16px section rhythm above it — still 2x, so the break
          survives, but half what it was. The whole page was compressed by ~130px
          because the badge sat below the fold on a real phone: every prior check
          measured a 393x852 viewport, which is the DEVICE height, while Safari's
          URL bar and toolbar leave about 712px. The most important element in
          the app was off-screen on arrival and partly behind the browser chrome.
          The ratio is what carries the break, not the absolute value — keep it
          at 2x if this rhythm is ever retuned. */}
      <section aria-label="Where to find it" className="mt-8 mb-0">
        <FridgeBadge
          fridgeNumber={sake.fridge_number}
          inStock={sake.in_stock}
          price={sake.price}
        />
      </section>
    </main>
  );
}
