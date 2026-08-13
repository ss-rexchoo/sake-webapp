"use client";

import { Wine } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { ResultBadge, ResultCard } from "@/components/ResultCard";
import type { MapRegion } from "@/components/map/types";
import { EASE_SOFT, ITEM_DURATION, ITEM_RISE, PANEL_EXIT } from "@/lib/motion";

/**
 * The panel that slides up under the map when a region is tapped — plan v2 §7.
 *
 * The entrance is the app's standard `ITEM_DURATION` / `EASE_SOFT`. The exit is
 * the shorter `PANEL_EXIT`: switching regions is a swap, not a departure, and a
 * symmetric exit would leave the space under the map empty for most of the
 * gesture.
 */

export function RegionPanel({
  region,
  id,
}: {
  /** `null` when nothing is selected — the panel is simply absent. */
  region: MapRegion | null;
  id: string;
}) {
  return (
    <div id={id} className="mt-2">
      {/*
       * `mode="wait"` rather than an overlap: the outgoing and incoming panels
       * are different heights, and letting them share the flow for 140ms makes
       * the page jump under a thumb. The exit is short enough that the wait
       * reads as a beat rather than a pause.
       */}
      <AnimatePresence mode="wait" initial={false}>
        {region ? (
          <motion.section
            key={region.id}
            aria-labelledby={`${id}-title`}
            initial={{ opacity: 0, y: ITEM_RISE }}
            animate={{ opacity: 1, y: 0 }}
            exit={{
              opacity: 0,
              y: -6,
              transition: { duration: PANEL_EXIT, ease: EASE_SOFT },
            }}
            transition={{ duration: ITEM_DURATION, ease: EASE_SOFT }}
          >
            <h2
              id={`${id}-title`}
              className="font-display text-[19px] leading-snug font-bold"
            >
              {region.name}
              {region.nameJp ? (
                // Weight alone carries the hierarchy — no third text luminance
                // between cream and `--muted`, and no warm grey sitting a line
                // above a cool one. `lang` so a screen reader switches voice
                // instead of spelling out the kanji.
                <span lang="ja" className="font-normal">
                  {" · "}
                  {region.nameJp}
                </span>
              ) : null}
            </h2>

            {region.description ? (
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                {region.description}
              </p>
            ) : null}

            {region.sake.length > 0 ? (
              <ul className="mt-4 flex flex-col gap-3">
                {region.sake.map((sake, index) => (
                  <li key={sake.id} className="flex">
                    <ResultCard
                      id={sake.id}
                      name={sake.name}
                      sub={sake.sub}
                      // No pairing tags. Those belong to the results screen,
                      // where they help justify a match; this is browsing, same
                      // as search, and the search list carries none either.
                      // They are also what tipped this screen into scrolling.
                      badge={
                        /*
                         * The same wine mark the search list uses, for the same
                         * reason: both screens are browsing, not scoring, so
                         * neither has a number worth ringing in gold.
                         *
                         * Not the prefecture — 54px minus the border leaves room
                         * for ~8 characters and "Yamaguchi" is nine, so it moves
                         * to `sub` where it has the full card width. Not the
                         * region name either: it is the heading directly above,
                         * and repeating it once per row says nothing.
                         */
                        <ResultBadge tone="muted">
                          <Wine
                            aria-hidden="true"
                            className="size-5 text-gold-light"
                          />
                        </ResultBadge>
                      }
                      index={index}
                      className="w-full"
                    />
                  </li>
                ))}
              </ul>
            ) : (
              /*
               * The honest empty state — the same principle as the
               * low-confidence results header (§6). Dashed, untinted and
               * unbadged so it cannot be mistaken for a tappable card, and it
               * says what the guest can do next rather than just "no results".
               */
              <div className="mt-4 rounded-lg border border-dashed border-cream/20 px-4 py-6 text-center">
                <p className="text-[13px] text-cream">
                  No {region.name} sake in the fridge tonight.
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">
                  Try another region, or ask your server what else is open.
                </p>
              </div>
            )}
          </motion.section>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
