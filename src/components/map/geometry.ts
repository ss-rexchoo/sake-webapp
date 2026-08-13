import type { Region } from "@/lib/types";
import { REGION_PATHS, SHIKOKU, type Bounds } from "./shapes";
import type { RegionShape } from "./types";

/**
 * Geometry for the hand-authored Japan silhouette — plan v2 §7.
 *
 * Pure functions, no React: the route calls `resolveShape` on the server and
 * `JapanMap` calls `mapViewBox` on the client, and both must agree exactly or
 * hydration drifts. Nothing here reads the clock, the DOM, or `Math.random`.
 *
 * No D3 and no GeoJSON anywhere in this piece — plan v2 §3/§13/§16. The outlines
 * are literal path data in `./shapes`; this module only decides where a region's
 * *name* goes and how big a box the drawing needs.
 */

/**
 * A region id with no authored outline still has to be reachable.
 *
 * Dropping it would silently make its sake unfindable from this screen, and
 * throwing would take the whole map down over one bad row. Instead it gets a
 * plain disc parked below Kyushu, stepped so several of them don't stack. That
 * is visibly not part of Japan, which is the right failure mode: the guest can
 * still tap through to the sake, and staff can see at a glance that a region id
 * has appeared that the map doesn't know how to draw.
 */
const FALLBACK_R = 20;
const FALLBACK_X = 40;
const FALLBACK_TOP = 300;
const FALLBACK_STEP = 52;

function fallbackShape(index: number): RegionShape {
  const cx = FALLBACK_X;
  const cy = FALLBACK_TOP + index * FALLBACK_STEP;
  const r = FALLBACK_R;
  // Two arcs, because a circle is not expressible as a single one.
  const d = `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`;
  return {
    d,
    coast: d,
    bounds: [cx - r, cy - r, cx + r, cy + r],
    label: { x: cx, y: cy },
    origin: { x: cx, y: cy },
    provisional: true,
  };
}

/** Is `(x, y)` somewhere this region could actually carry its own name? */
function within(box: Bounds, x: number, y: number): boolean {
  return x >= box[0] && x <= box[2] && y >= box[1] && y <= box[3];
}

/**
 * Attach a region's outline and work out where its name sits.
 *
 * `map_cx`/`map_cy` are still read, and still win — they are the one piece of
 * map geometry a staff member has any business editing, because a place name
 * landing on a coastline is exactly the sort of thing you only notice once it is
 * live. But they are now a *label anchor* and nothing else.
 *
 * They are honoured only when the point lands inside `labelBox` — the range of
 * anchors where the region's name actually fits inside its own coastline. A
 * plain bounding-box test is not enough: Tohoku is a narrow region inside a tall
 * box, and a coordinate can sit well within the box while the word hangs into
 * the Sea of Japan.
 *
 * That gate currently rejects all six seeded values, and should. They predate
 * this silhouette — ellipse centres in a taller, narrower coordinate space, four
 * of which now sit hundreds of units below the map entirely. Reinterpreting them
 * under the new contract would fling names into open sea. Re-seeding the six
 * rows from the `label` values in `./shapes` would hand control back to staff;
 * until then the authored anchors are what draws.
 *
 * `map_rx`, `map_ry` and `map_rotation` are no longer read by anything — the
 * outlines replaced the ellipses they described. The columns are left alone.
 */
export function resolveShape(region: Region, index: number): RegionShape {
  const path = REGION_PATHS[region.id];
  if (!path) return fallbackShape(index);

  const cx = region.map_cx;
  const cy = region.map_cy;
  const anchored =
    cx !== null && cy !== null && within(path.labelBox, cx, cy)
      ? { x: cx, y: cy }
      : { x: path.label[0], y: path.label[1] };

  return {
    d: path.d,
    // On Hokkaido and Kyushu the whole outline is coastline, so there is nothing
    // separate to store.
    coast: path.coast ?? path.d,
    bounds: path.bounds,
    label: anchored,
    origin: {
      x: (path.bounds[0] + path.bounds[2]) / 2,
      y: (path.bounds[1] + path.bounds[3]) / 2,
    },
    provisional: false,
  };
}

export interface ViewBox {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

/** Used only if the map is asked to draw with no regions at all. */
const EMPTY_VIEWBOX: ViewBox = { minX: 0, minY: 0, width: 240, height: 280 };

/**
 * The tightest box containing every drawn shape, plus `pad` on all sides.
 *
 * Derived rather than hardcoded so the box always matches the paths: an edit to
 * a coastline, or a region falling back to a placeholder disc below Kyushu,
 * widens the map instead of getting clipped at the edge of a stale viewBox.
 *
 * Shikoku is included even though it is not selectable — it is drawn, so it
 * counts. `pad` covers the strokes and the keyboard focus ring, all of which are
 * `vectorEffect="non-scaling-stroke"` and so add at most a couple of units.
 */
export function mapViewBox(shapes: RegionShape[], pad: number): ViewBox {
  if (shapes.length === 0) return EMPTY_VIEWBOX;

  const boxes: Bounds[] = [...shapes.map((s) => s.bounds), SHIKOKU.bounds];

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const [x0, y0, x1, y1] of boxes) {
    minX = Math.min(minX, x0);
    minY = Math.min(minY, y0);
    maxX = Math.max(maxX, x1);
    maxY = Math.max(maxY, y1);
  }

  // Rounded so the serialised viewBox string is identical on server and client
  // regardless of float formatting.
  const round = (n: number) => Math.round(n * 100) / 100;

  return {
    minX: round(minX - pad),
    minY: round(minY - pad),
    width: round(maxX - minX + pad * 2),
    height: round(maxY - minY + pad * 2),
  };
}
