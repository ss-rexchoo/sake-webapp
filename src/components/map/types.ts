import type { Bounds } from "./shapes";

/**
 * The flattened shapes the `/map` route hands to its client components.
 *
 * The route is a server component that reads `repo`, so the client bundle never
 * receives a full `Sake` or `Region` — only the handful of fields it draws.
 * Same discipline as `TasteMatch` on the results screen.
 */

/** A region's resolved geometry on the hand-authored Japan silhouette. */
export interface RegionShape {
  /** Closed outline, filled and faintly stroked. */
  d: string;
  /** Coastal portion only, stroked more strongly. Equals `d` on the islands. */
  coast: string;
  bounds: Bounds;
  /** Where the region's name is drawn, in viewBox units. */
  label: { x: number; y: number };
  /** Centre of `bounds` — the origin the press-in scales about. */
  origin: { x: number; y: number };
  /**
   * True when no outline was authored for this region id and it is being drawn
   * as a placeholder blob. Visibly wrong on purpose: the sake stays reachable,
   * and staff can see that a region needs attention.
   */
  provisional: boolean;
}

/** One row in a region's sake list. */
export interface RegionSake {
  id: string;
  name: string;
  /** "Niigata · Junmai Ginjo" — prefecture lives here, not in the badge. */
  sub: string;
}

export interface MapRegion {
  id: string;
  name: string;
  nameJp: string | null;
  description: string | null;
  shape: RegionShape;
  /** In-stock only — an empty array is a real state the panel has copy for. */
  sake: RegionSake[];
}
