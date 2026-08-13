"use client";

import { Wine } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import {
  FridgeSlotNote,
  ResultBadge,
  ResultCard,
} from "@/components/ResultCard";
import type { MapRegion } from "@/components/map/types";
import { EASE_SOFT, ITEM_DURATION, ITEM_RISE, PANEL_EXIT } from "@/lib/motion";
import { cn } from "@/lib/utils";

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
  totals,
  className,
}: {
  /** `null` when nothing is selected — the panel is simply absent. */
  region: MapRegion | null;
  id: string;
  /**
   * What the fridge holds tonight, for the resting state at `lg`. Optional
   * because the resting state only exists where the panel has a column of its
   * own to rest in.
   */
  totals?: { regions: number; bottles: number };
  className?: string;
}) {
  return (
    // `relative` only matters at `lg`, where the resting note is taken out of
    // flow — see below.
    <div id={id} className={cn("mt-2 lg:relative", className)}>
      {/*
       * The resting state, and only from `lg`.
       *
       * Below `lg` the panel sits under the map, so "nothing selected" is an
       * empty space at the bottom of the screen that nobody sees — correct, and
       * left alone. At `lg` it becomes seven twelfths of the viewport sitting
       * blank on arrival, which is the same complaint that started this
       * widening. So the column rests on something — and on the one thing the
       * screen does not already say: what is actually in the fridge. The
       * instruction is the page subtitle's job, two columns to the left.
       *
       * Absolutely positioned so it cannot touch the flow the panel animates
       * in. Deselecting sets `region` to null immediately while the outgoing
       * panel is still playing its 140ms exit; in flow, this note would appear
       * above it and shove it down mid-fade. Out of flow the two simply
       * crossfade in the same place, which is what the gesture actually is.
       *
       * `aria-hidden` because it is a visual resting state, not content: the
       * counts are a glance, the `aria-live` region already narrates every
       * selection, and a heading that exists only above 1024px would make the
       * document outline depend on the window width.
       */}
      {region === null && totals ? (
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: ITEM_DURATION, ease: EASE_SOFT }}
          // `top-0`, not a nudge: this note and the selected panel's `h2` are
          // supposed to crossfade in the same place, so they share a top edge.
          className="hidden lg:absolute lg:inset-x-0 lg:top-0 lg:block"
        >
          {/* The gold hairline the search empty state uses — a rule, not a
              bordered panel, so nothing here can be mistaken for a card. */}
          <span aria-hidden="true" className="mb-3.5 block h-px w-10 bg-gold/45" />
          {/*
           * It names the fridge rather than repeating the instruction. The page
           * subtitle two columns to the left already says "Tap a region of
           * Japan to see its sake", and at `lg` both are on screen at once — a
           * second, shorter copy of the same sentence is the kind of filler
           * that makes a resting state read as padding.
           */}
          <p className="font-display text-lg leading-snug font-bold">
            In the fridge tonight
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
            {totals.bottles} {totals.bottles === 1 ? "bottle" : "bottles"} from{" "}
            {totals.regions} {totals.regions === 1 ? "region" : "regions"}.
          </p>
        </motion.div>
      ) : null}

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
              // Capped from `md`: the panel is a full 768px column there, and
              // 13px text set across 720px is ~110 characters to a line. The
              // cap is a reading measure, not a breakpoint — it stays on at
              // `lg`, where the panel column is wider than the copy needs.
              //
              // 29rem is the map's cap, not a separately chosen number: on the
              // `md` layout the description sits directly under a 464px-wide
              // map, and two measures 16px apart would read as a coincidence
              // rather than as one grid.
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted md:max-w-[29rem]">
                {region.description}
              </p>
            ) : null}

            {region.sake.length > 0 ? (
              <>
              {/* The panel is the one place a list can be a SINGLE row, where
                  non-sequential slot numbers never accumulate to disprove the
                  "rank" reading of `#`. It needs the legend most. */}
              <FridgeSlotNote className="mt-3.5" />
              {/* Paired up at `md` only. There the panel spans the full 768px
                  column under a map that has been held to 464px, and a single
                  720px-wide card for "Dassai 45 · Yamaguchi · Junmai Daiginjo"
                  is mostly empty rule. At `lg` the panel is a ~565px column
                  beside the map, which is one card wide again.

                  `mt-2.5`, not the `mt-4` this list used to carry: the legend
                  above now owns the gap to the description, and the list sits
                  under its own caption. 16 + 4 unchanged in total. */}
              <ul className="mt-2.5 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-1 lg:gap-3">
                {region.sake.map((sake, index) => (
                  <li key={sake.id} className="flex">
                    <ResultCard
                      id={sake.id}
                      name={sake.name}
                      sub={sake.sub}
                      fridgeNumber={sake.fridgeNumber}
                      price={sake.price}
                      // Stated rather than left undefined even though the page
                      // filters out-of-stock bottles out before they get here:
                      // this list has an availability story (it is a browse
                      // list, like search), it simply always has the same
                      // answer. If the filter is ever relaxed, the card already
                      // knows what to say.
                      stock="in-stock"
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
              </>
            ) : (
              /*
               * The honest empty state — the same principle as the
               * low-confidence results header (§6). Dashed, untinted and
               * unbadged so it cannot be mistaken for a tappable card, and it
               * says what the guest can do next rather than just "no results".
               */
              // Capped and centred from `md` for the same reason the card list
              // pairs up there: a dashed box drawn across 720px to hold two
              // short centred lines is mostly rule.
              <div className="mt-4 rounded-lg border border-dashed border-cream/20 px-4 py-6 text-center md:mx-auto md:max-w-[26rem] lg:max-w-none">
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
