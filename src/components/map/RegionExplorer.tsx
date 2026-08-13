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

  return (
    <div className="flex flex-1 flex-col">
      <JapanMap
        regions={regions}
        activeId={activeId}
        onSelect={toggle}
        panelId={panelId}
      />

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

      <RegionPanel region={active} id={panelId} />
    </div>
  );
}
