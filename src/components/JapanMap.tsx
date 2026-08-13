"use client";

import type { KeyboardEvent as ReactKeyboardEvent, FocusEvent } from "react";
import { useMemo, useState } from "react";
import { motion } from "motion/react";

import { mapViewBox } from "@/components/map/geometry";
import { SHIKOKU } from "@/components/map/shapes";
import type { MapRegion } from "@/components/map/types";
import { EASE_SOFT } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The hand-authored Japan map — plan v2 §7.
 *
 * Six grouped regions, not 47 prefectures. The outlines live in
 * `map/shapes.ts`; this file is only how they behave. No D3, no GeoJSON, no map
 * library (§3/§13/§16).
 *
 * ── What changed, and why ───────────────────────────────────────────────────
 * This screen used to draw each region as a rotated ellipse from `map_rx`/
 * `map_ry`/`map_rotation`. That was the letter of §7 ("hand-drawn ellipse/
 * shape") and it missed the point of it: six ovals on a diagonal do not read as
 * Japan, and a guest looking at the screen said so — "i dont see japan map, i
 * see only circle of region." A map of somewhere is the whole proposition of
 * this route. So the ellipses are gone and the silhouette is real.
 *
 * ── How it scales ───────────────────────────────────────────────────────────
 * The viewBox is derived from the paths (`mapViewBox`), and the SVG is
 * `width: 100%` with `height: auto`, so the drawing's own aspect ratio (~0.87,
 * which is Japan's) sizes the box. That means the map always fills the column
 * edge to edge rather than sitting in horizontal slack — it looks deliberate on
 * a 390px phone and on the 440px column a desktop browser centres. `MAX_HEIGHT`
 * is the backstop that keeps the region panel near the fold on a short screen;
 * when it bites, `preserveAspectRatio="xMidYMid meet"` centres the drawing
 * rather than stretching it.
 *
 * ── Why the states are layered, not colour-animated ──────────────────────────
 * The active fill is a second copy of the path stacked on the idle one, cross-
 * faded on `opacity`. Animating `fill` from a `color-mix()` idle value to
 * `var(--vermillion)` would ask Motion to interpolate between two values it
 * cannot parse; a numeric cross-fade is exact, compositor-friendly, and keeps
 * every colour a token.
 */

/** Prototype's `.region-shape.dim`. */
const DIM_OPACITY = 0.28;

/**
 * Labels do NOT dim as far as the shapes they sit on.
 *
 * At 0.28 a cream label over an already-faded fill lands near 2:1 contrast at
 * ~13px, which is unreadable — and the most likely next thing a guest does
 * after selecting one region is read the names of the other five. The shapes
 * recede; the words stay legible. 0.55 clears AA and is still obviously
 * subordinate to a vermillion-filled neighbour.
 */
const LABEL_DIM_OPACITY = 0.55;

/**
 * The coastline barely dims at all, and that is the whole difference between
 * this map and the ellipses it replaced.
 *
 * At the shapes' 0.28 the 62%-cream shore composites to ~17% over `--bg`, which
 * measured 1.81:1 against the sea — four fifths of the drawing's ink gone the
 * instant anything is selected, leaving one red shape and six floating words.
 * 0.65 holds the shore near 3:1: Japan stays on screen, obviously behind the
 * selection rather than replaced by it.
 */
const DIM_COAST_OPACITY = 0.65;

/**
 * A press pushes 4.5% in. There is no matching grow on selection, and that is a
 * change from the ellipse version.
 *
 * The four Honshu regions share their borders exactly. A selected region that
 * grew would push its coastline across its neighbours' — a seam that reads as a
 * drawing error, not as a lift, and one that can't be fixed by re-ordering
 * because SVG tab order follows document order. It buys nothing anyway: on a
 * distinct silhouette the vermillion fill is a far louder signal than it was on
 * an oval. The press-in shrinks *away* from the neighbours, so it is safe, and
 * it is the half of the gesture that actually answers a finger.
 */
const PRESS_SCALE = 0.955;

/** Prototype's 0.35s `transition: all`, trimmed — the dim is context, not news. */
const DIM_DURATION = 0.32;
/**
 * Held before the other five regions recede.
 *
 * `EASE_SOFT` front-loads hard, so a 0.32s dim and a 0.26s fill starting on the
 * same frame are ~78% and ~85% done at 100ms — indistinguishable, and five
 * shapes leaving at once out-pulls the one arriving. A beat of delay is what
 * actually makes the tapped region resolve first; the durations alone can't.
 */
const DIM_DELAY = 0.07;
/** The idle→vermillion cross-fade. */
const FILL_DURATION = 0.26;
/** Press-in. Short enough to land under the finger rather than after it. */
const PRESS_DURATION = 0.12;
/** Press-out. */
const RELEASE_DURATION = 0.26;

/**
 * Label size in viewBox units — so it renders at the map's scale factor, not at
 * a fixed pixel size.
 *
 * 9 lands between 12.4px and 14.6px across the range of column widths this app
 * sees, and 12.4px is about the floor for a name read at arm's length in a dim
 * restaurant — so this is a lower bound, not a preference.
 *
 * The fit is a shape problem, not a size one. At 9 units "Chugoku" is 32.8 units
 * wide against a region that is naturally only ~8 units deep, which is why the
 * western tail of Honshu is drawn about a quarter deeper than the real thing.
 * The anchors in `./map/shapes` are then chosen by scoring every candidate
 * position for how much of the word lands inside its own coastline; all six now
 * clear 96%. Changing this number invalidates those anchors — rerun
 * `scripts/author-japan-paths.mjs` with the new size.
 */
const LABEL_SIZE = 9;
/** Nudges the baseline to optical centre without relying on `dominant-baseline`. */
const LABEL_BASELINE_OFFSET = 3.2;

/**
 * A halo in the page background colour, painted under the glyphs.
 *
 * New with the real silhouette: an ellipse could always contain its own label,
 * an irregular coastline cannot, and every one of the six names overhangs its
 * shore by a letter or two. Without the halo those letters sit on open water at
 * whatever contrast the sea happens to give them. `paint-order` is the whole
 * trick — stroke first, glyphs on top, so the outline never eats the letterform.
 */
const LABEL_HALO_WIDTH = 2.6;

/** Must cover the strokes and the focus ring, all of them non-scaling. */
const VIEWBOX_PAD = 6;

/**
 * Backstop only — the drawing's own aspect ratio normally sets the height.
 *
 * On every phone width this app targets the intrinsic height (column ÷ 0.87) is
 * well under the cap, so the map fills its column edge to edge and this constant
 * does nothing. It exists for the wide end: `AppShell` opens the column to 32rem
 * on a desktop browser, where the intrinsic height reaches ~33rem and would push
 * the region panel off the screen.
 *
 * Both halves matter. `33rem` is generous enough that the drawing still spans
 * nearly the full width of that wider column rather than sitting in 44px of
 * slack on each side, which is what made the map look accidental on a laptop.
 * `62dvh` is what stops a short window (a 1170x600 browser, a phone in
 * landscape) from being all map — there, `preserveAspectRatio="xMidYMid meet"`
 * centres the drawing rather than stretching it, and the slack comes back.
 */
const MAX_HEIGHT = "min(33rem, 62dvh)";

/** The prototype's `.region-shape` fill/stroke, expressed against the tokens. */
const IDLE_FILL = "color-mix(in srgb, var(--cream) 16%, transparent)";
/**
 * The seams between Honshu's four regions. Deliberately quiet.
 *
 * 14%, not 26%: a seam is the only place this stroke is ever visible on its own,
 * and there it is painted TWICE — the four Honshu regions share their border
 * vertices exactly, so both neighbours trace the same polyline. Two coincident
 * 26% strokes composite to 45%, which put the seams at three-quarters the weight
 * of the 62% shoreline and had Honshu reading as four adjoining blobs again.
 * 14% doubled lands at 26%, which is what the seam was always meant to be.
 * Everywhere else this stroke sits under the coastline and never shows.
 */
const SEAM_STROKE = "color-mix(in srgb, var(--cream) 14%, transparent)";
/** The shoreline. Stronger than the seams — this is the line that says "Japan". */
const COAST_STROKE = "color-mix(in srgb, var(--cream) 62%, transparent)";

/**
 * Shikoku: land, and nothing else.
 *
 * Two steps quieter than a selectable region and with no stroke at all, so it
 * completes the archipelago without ever looking like the sixth thing you could
 * have tapped. It does not dim with the others either — it has no state to be in.
 */
const INERT_FILL = "color-mix(in srgb, var(--cream) 9%, transparent)";

export interface JapanMapProps {
  regions: MapRegion[];
  /** `null` when nothing is selected — every region then sits at full opacity. */
  activeId: string | null;
  /** Called on tap/Enter/Space. The parent decides that a second tap deselects. */
  onSelect: (id: string) => void;
  /** Id of the region panel, for `aria-controls`. */
  panelId: string;
  className?: string;
}

export function JapanMap({
  regions,
  activeId,
  onSelect,
  panelId,
  className,
}: JapanMapProps) {
  /** Which shape a finger is currently on. Purely for the press-in feedback. */
  const [pressedId, setPressedId] = useState<string | null>(null);
  /**
   * Which shape is showing a keyboard focus ring. Tracked in state rather than
   * with a CSS `:focus-visible` rule because the ring is an SVG path, not a box
   * that `ring-2` can wrap — the `matches()` check below is what keeps it off
   * for taps.
   */
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const viewBox = useMemo(
    () => mapViewBox(regions.map((r) => r.shape), VIEWBOX_PAD),
    [regions],
  );

  const handleKeyDown = (
    event: ReactKeyboardEvent<SVGGElement>,
    id: string,
  ) => {
    // Space and Enter, the two keys a `role="button"` owes its user. Space is
    // prevented so activating a region doesn't also scroll the page.
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelect(id);
  };

  const handleFocus = (event: FocusEvent<SVGGElement>, id: string) => {
    const el = event.currentTarget;
    // A tap focuses the group too; only a keyboard focus should paint a ring.
    if (typeof el.matches === "function" && el.matches(":focus-visible")) {
      setFocusedId(id);
    }
  };

  const focused = regions.find((region) => region.id === focusedId) ?? null;
  const focusScale = focusedId !== null && pressedId === focusedId ? PRESS_SCALE : 1;

  return (
    <svg
      role="group"
      aria-label="Sake regions of Japan"
      viewBox={`${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`}
      preserveAspectRatio="xMidYMid meet"
      // `h-auto` rather than a fixed height: an SVG with a viewBox has an
      // intrinsic aspect ratio, so the drawing sizes itself from the column and
      // never sits in slack. `relative` so it stacks above the ambient canvas
      // (which is `fixed z-0` and `pointer-events-none`) without relying on
      // painting order.
      className={cn("relative block h-auto w-full", className)}
      style={{ maxHeight: MAX_HEIGHT }}
    >
      {/*
       * Drawn first so it sits behind everything, and marked out of the
       * accessibility tree: it is scenery, not a control. See `SHIKOKU`.
       */}
      <path d={SHIKOKU.d} fill={INERT_FILL} aria-hidden="true" pointerEvents="none" />

      {regions.map((region) => {
        const { d, coast, label, origin, provisional } = region.shape;
        const active = activeId === region.id;
        const dimmed = activeId !== null && !active;
        const pressed = pressedId === region.id;

        const shapeTransition = {
          duration: pressed ? PRESS_DURATION : RELEASE_DURATION,
          ease: EASE_SOFT,
        };
        const dimTransition = {
          duration: DIM_DURATION,
          ease: EASE_SOFT,
          // Only on the way down. Coming back — deselecting, or becoming the
          // newly selected region — should be immediate.
          delay: dimmed ? DIM_DELAY : 0,
        };

        return (
          <g
            key={region.id}
            role="button"
            tabIndex={0}
            aria-label={region.name}
            aria-expanded={active}
            aria-controls={panelId}
            onClick={() => onSelect(region.id)}
            onKeyDown={(event) => handleKeyDown(event, region.id)}
            onPointerDown={() => setPressedId(region.id)}
            onPointerUp={() => setPressedId(null)}
            onPointerCancel={() => setPressedId(null)}
            onPointerLeave={() => setPressedId(null)}
            onFocus={(event) => handleFocus(event, region.id)}
            onBlur={() => setFocusedId(null)}
            // The ring is drawn below as a stroked path; the UA outline would
            // trace the group's bounding box, label included, and read as a
            // stray rectangle.
            className="group cursor-pointer outline-none"
          >
            {/*
             * The press scales about the region's own centre. `transformOrigin`
             * in user units works because an SVG element's transform reference
             * box is the nearest viewport, which is the same space the paths are
             * authored in.
             *
             * This is the outer wrapper now, with the dim inside it, because the
             * coastline no longer dims with the fill it sits on — see below.
             */}
            <motion.g
              style={{ transformOrigin: `${origin.x}px ${origin.y}px` }}
              initial={false}
              animate={{ scale: pressed ? PRESS_SCALE : 1 }}
              transition={shapeTransition}
            >
              {/* Only the fills dim this far. */}
              <motion.g
                initial={false}
                animate={{ opacity: dimmed ? DIM_OPACITY : 1 }}
                transition={dimTransition}
              >
                {/* Idle surface. Also the hit target — the label above it is inert. */}
                <path
                  d={d}
                  fill={IDLE_FILL}
                  stroke={SEAM_STROKE}
                  strokeWidth={1}
                  strokeLinejoin="round"
                  // A region the map has no outline for is drawn as a dashed
                  // disc parked below Kyushu. Dashed because "provisional" has
                  // to be readable as a state, not mistaken for a small island.
                  strokeDasharray={provisional ? "4 3" : undefined}
                  vectorEffect="non-scaling-stroke"
                />

                {/*
                 * Hover, and only on a pointer that has one.
                 *
                 * Every other interactive surface in the app answers a cursor
                 * (`ResultCard`, `BackButton`, the landing tiles); the map should
                 * not be the exception. It is a fill lift and nothing geometric,
                 * which is what makes it safe here: the four Honshu regions share
                 * exact borders, so anything that moved an edge would push one
                 * region's coastline over its neighbour's.
                 */}
                <path
                  d={d}
                  fill={IDLE_FILL}
                  pointerEvents="none"
                  className="opacity-0 transition-opacity duration-200 [@media(hover:hover)]:group-hover:opacity-100"
                />

                {/* Selected surface, cross-faded over the idle one. */}
                <motion.path
                  d={d}
                  fill="var(--vermillion)"
                  stroke="var(--gold-light)"
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                  initial={false}
                  animate={{ opacity: active ? 1 : 0 }}
                  transition={{ duration: FILL_DURATION, ease: EASE_SOFT }}
                />
              </motion.g>

              {/*
               * The shoreline, over the fills — and deliberately outside the
               * group that dims them.
               *
               * On the old ellipses the dim could take everything down together,
               * because each blob was self-contained. On a silhouette the
               * coastline *is* the drawing: at 0.28 the shore falls to ~1.8:1
               * against the sea and about four fifths of Japan disappears the
               * moment a guest taps anything. So the fills recede and the
               * coastline only steps back — `DIM_COAST_OPACITY` keeps the shore
               * above 3:1, which keeps the country legible behind the selection.
               *
               * Skipped entirely while the region is selected: the gold-light
               * stroke on the vermillion fill has taken over that job, and two
               * strokes on one edge reads as a double line.
               */}
              <motion.path
                d={coast}
                fill="none"
                stroke={COAST_STROKE}
                strokeWidth={1.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
                initial={false}
                animate={{ opacity: active ? 0 : dimmed ? DIM_COAST_OPACITY : 1 }}
                transition={
                  dimmed
                    ? dimTransition
                    : { duration: FILL_DURATION, ease: EASE_SOFT }
                }
              />
            </motion.g>

            <motion.text
              x={label.x}
              y={label.y + LABEL_BASELINE_OFFSET}
              textAnchor="middle"
              fontSize={LABEL_SIZE}
              fill="var(--cream)"
              stroke="var(--bg)"
              strokeWidth={LABEL_HALO_WIDTH}
              strokeLinejoin="round"
              paintOrder="stroke"
              pointerEvents="none"
              className="font-body select-none"
              initial={false}
              animate={{ opacity: dimmed ? LABEL_DIM_OPACITY : 1 }}
              transition={dimTransition}
            >
              {region.name}
            </motion.text>
          </g>
        );
      })}

      {focused ? (
        /*
         * The focus ring, deliberately the last thing drawn and outside every
         * region group.
         *
         * Two reasons. It has to be legible over whatever it lands on — a dimmed
         * neighbour, a vermillion selection, or the sea — so it is a dark
         * under-stroke with gold on top, and it must not be painted over by a
         * later sibling region along a shared border. And it must not inherit
         * the 0.28 dim: gold at 0.28 over `--bg` is ~1.7:1, under the 3:1 a focus
         * indicator has to clear. Tabbing across a map with a selection open is
         * exactly when a keyboard user most needs to know where they are.
         *
         * It traces the *coastline* rather than the closed outline. Two reasons.
         * An outward offset of a path is not something SVG can express without a
         * second authored outline per region, so the ring has to sit on an edge
         * the shape already has. And the closed outline includes the seams
         * across Honshu — a ring on those would lay a 5-unit dark under-stroke
         * straight through a neighbouring region's fill, cutting a gash into a
         * vermillion selection. The coast never crosses a neighbour. On Chubu and
         * Kansai that leaves two arcs stopping at the seams, which is honest:
         * those regions genuinely have no shore there.
         */
        <motion.g
          style={{
            transformOrigin: `${focused.shape.origin.x}px ${focused.shape.origin.y}px`,
          }}
          initial={false}
          animate={{ scale: focusScale }}
          transition={{
            duration: focusScale === 1 ? RELEASE_DURATION : PRESS_DURATION,
            ease: EASE_SOFT,
          }}
          pointerEvents="none"
        >
          {/* Gold on vermillion is 2.4:1, under the 3:1 floor. The dark
              under-stroke is what carries the ring over a selected region. */}
          <path
            d={focused.shape.coast}
            fill="none"
            stroke="var(--bg)"
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={focused.shape.coast}
            fill="none"
            stroke="var(--gold)"
            // Without this the ring renders sub-pixel on a short phone, because
            // the map's scale factor would be applied to the stroke too.
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </motion.g>
      ) : null}
    </svg>
  );
}
