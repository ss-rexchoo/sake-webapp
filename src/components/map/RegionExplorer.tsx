"use client";

import { useCallback, useId, useState } from "react";

import { JapanMap } from "@/components/JapanMap";
import { RegionPanel } from "@/components/map/RegionPanel";
import type { MapRegion } from "@/components/map/types";

/**
 * Explore Japan — plan v2 §7.
 *
 * The only stateful part of the `/map` route. Everything it draws was resolved
 * on the server (`src/app/map/page.tsx`), so this component holds one string of
 * state and no data: the route stays server-rendered, and the client bundle
 * never sees the sake catalogue.
 */
export function RegionExplorer({ regions }: { regions: MapRegion[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const panelId = useId();

  const active = regions.find((region) => region.id === activeId) ?? null;

  // Tapping the selected region again closes it. A map whose only way out of a
  // selection is to pick something else traps the guest in a filter they never
  // meant to apply.
  const toggle = useCallback((id: string) => {
    setActiveId((previous) => (previous === id ? null : id));
  }, []);

  // For the panel's resting state at `lg`. These lists were already filtered to
  // what is in stock (`map/page.tsx`), so this counts what a guest could
  // actually be poured tonight from a region on this map — which is exactly
  // what the resting copy claims, no more.
  const bottles = regions.reduce((total, region) => total + region.sake.length, 0);

  return (
    /*
     * ── How this screen uses width ──────────────────────────────────────────
     * Phone (and up to `md`): unchanged. Map on top, panel slides up underneath
     * — the arrangement a thumb wants, and the one the map's height cap was
     * tuned against.
     *
     * `md`: still stacked, and the map is deliberately held back. `AppShell`'s
     * wide grant opens the column to 768px here, but the map is an SVG with a
     * fixed 0.879 aspect ratio and a `MAX_HEIGHT` of `min(33rem, 62dvh)`, so
     * past ~464px of width it stops growing and starts sitting in horizontal
     * slack instead — 128px of empty sea down each side, which is exactly the
     * "accidental" look `JapanMap`'s docblock warns about. So the map is capped
     * at the width it can actually fill and centred; the panel below it takes
     * the full column and pairs its cards up (see `RegionPanel`).
     *
     * `lg`: side by side, map left at 5/12 and panel right at the remaining
     * ~7/12. The ratio is not taste — it is the same cap read forwards. 5/12 of
     * the 1024px content box is 427px, whose intrinsic height (~485px) still
     * clears 33rem, so the map fills its half edge to edge with no slack; a 1:1
     * split would be 496px wide, which the cap would letterbox back to 464px
     * and leave the slack this layout exists to remove. The wider half going to
     * the panel is right anyway: the map is a fixed-size object, the panel is a
     * list of bottles, and the list is what the guest came to read.
     */
    <div className="flex flex-1 flex-col lg:flex-row lg:items-start lg:gap-8">
      <div className="md:mx-auto md:w-full md:max-w-[29rem] lg:mx-0 lg:w-5/12 lg:max-w-none lg:shrink-0">
        <JapanMap
          regions={regions}
          activeId={activeId}
          onSelect={toggle}
          panelId={panelId}
        />
      </div>

      {/*
       * The selection is a visual change (highlight, dim, panel) with no focus
       * move behind it, so nothing would otherwise reach a screen reader until
       * the user went looking. The panel's own heading carries the detail; this
       * just confirms the tap landed and says how much is there.
       */}
      <p aria-live="polite" className="sr-only">
        {active
          ? active.sake.length === 0
            ? `${active.name} selected. Nothing from this region in the fridge tonight.`
            : `${active.name} selected. ${active.sake.length} sake in the fridge.`
          : ""}
      </p>

      <RegionPanel
        region={active}
        id={panelId}
        totals={{ regions: regions.length, bottles }}
        className="lg:mt-0 lg:min-w-0 lg:flex-1"
      />
    </div>
  );
}
