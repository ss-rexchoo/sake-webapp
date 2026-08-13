"use client";

import { motion } from "motion/react";

import {
  EASE_SOFT,
  ITEM_DURATION,
  REVEAL_EXIT,
  RISE_DISTANCE,
} from "@/lib/motion";
import type { TastePoint } from "@/lib/types";

/**
 * The recommendation reveal — plan v2 §12's "one signature sequence".
 *
 * ── What it shows, and why this and not something else ──────────────────────
 * The guest's own taste point, resolving into the score it produced.
 *
 * This replaced a gold circle with a wine glass and a light sweep across it.
 * That version was well built and completely generic: a shimmering badge could
 * belong to any app loading anything, and it said nothing about what the guest
 * had just done. The compass is the app's signature interaction (§4) and the
 * reveal is the moment its answer arrives, so the reveal is now made of the
 * compass:
 *
 *   1. a miniature pad fades up with the dot exactly where the guest left it,
 *   2. the grid dissolves and the dot travels to the centre, growing,
 *   3. it lands as the match ring carrying the top score, and hands over.
 *
 * The point is the causal read — *this* is what you chose, *this* is what it
 * found. A guest who dragged to the sweet corner watches a dot in the sweet
 * corner become their number.
 *
 * ── Why the flight stays inside this component ──────────────────────────────
 * The obvious version animates the dot into the first card's real match badge.
 * That badge does not exist yet: `RevealGate` mounts the results only after the
 * hold, so there is nothing to measure, and animating toward a *predicted*
 * position would silently drift the moment a card's height changed — a reason
 * line wrapping to two lines would be enough. Landing the dot as a ring of the
 * same size and colour in the same visual place, and letting the results fade in
 * behind it, reads as the same continuity with none of the coupling.
 *
 * ── Timing ──────────────────────────────────────────────────────────────────
 * The whole sequence runs inside `REVEAL_HOLD`. §1 promises a 20–40 second
 * journey and this is the one deliberate pause in it, so it stays tight — but
 * the number at the end has to be readable, which is what sets the hold.
 *
 *   0.00  pad + dot fade up
 *   0.20  dot has landed on the guest's point and rests there
 *   0.58  grid dissolves, dot begins travelling
 *   0.78  dot arrives centre, ring and score fade in
 *   0.98  the score is fully legible
 *   1.55  `RevealGate` swaps to the results, this exits over `REVEAL_EXIT`
 *
 * The load-bearing figure is the GAP between 0.98 and the swap — the time the
 * guest actually has to read their score. At `REVEAL_HOLD` 1.1 that gap was
 * 0.12s and the sequence felt like it snatched the answer away. It is now
 * ~0.57s. Change `RING_IN` and `REVEAL_HOLD` together, not separately.
 *
 * ── Reduced motion ──────────────────────────────────────────────────────────
 * The travel is `x`/`y`, and the growth is `scale`, so `MotionConfig
 * reducedMotion="user"` in `PageTransition` strips both automatically — the dot
 * simply appears where it belongs and the opacity crossfades still read as a
 * sequence. Nothing here branches on a hook, so SSR and client output match.
 */

/** Side of the mini pad, in px. Small enough to read as a token of the compass. */
const PAD = 132;

/** The dot, matching the compass's own marker proportionally. */
const DOT = 18;

/** Ring the dot becomes — the same 54px as a real `ResultBadge`. */
const RING = 54;

/**
 * The dot has to REST at the guest's point long enough to be recognised — that
 * recognition is the entire idea. An earlier cut gave it 174ms, which is below
 * the threshold where a small moving object registers as having had a position
 * at all; it read as a dot that was always sliding to the middle. It now holds
 * for ~390ms before it moves.
 */
const GRID_FADE = 0.58;
const RING_IN = 0.78;

/** Fractions of `RING_IN`: appear, hold at the guest's point, travel, land. */
const DOT_TIMES = [0, 0.25, 0.75, 1] as const;

/**
 * One easing PER SEGMENT, and this is load-bearing rather than fussiness.
 *
 * Motion applies `times` to *eased* progress, not to wall-clock. With a single
 * `EASE_SOFT` across the whole keyframe list — a strong ease-out — 42% of the
 * elapsed time is already ~85% of the eased progress, so the "hold" segment was
 * consumed almost immediately and the dot began travelling while it was
 * supposed to be resting on the guest's point. Measured: at t=330ms, on a
 * timeline that should have held until 585ms, the dot had covered two thirds of
 * its journey.
 *
 * Three segments, three curves: ease the arrival, hold LINEAR (nothing moves,
 * so the curve only distorts the clock), ease the departure.
 */
const DOT_EASE = [EASE_SOFT, "linear", EASE_SOFT] as const;

export function RevealSequence({
  point,
  topScore,
}: {
  /** Where the guest left the compass dot. */
  point: TastePoint;
  /** Top match, already floored — the number the ring lands on. */
  topScore: number;
}) {
  // Position inside the pad, inset by the dot's radius so the marker never
  // hangs off the field — the same rule the compass itself uses. Note the Y
  // inversion: `body: 100` is the TOP of the pad (rich), not the bottom.
  const inset = DOT / 2;
  const span = PAD - DOT;
  const dotX = inset + (point.sweetness / 100) * span;
  const dotY = inset + ((100 - point.body) / 100) * span;

  // Travel is expressed as a delta from the dot's resting place to the pad's
  // centre, so one transform covers every taste point.
  const travelX = PAD / 2 - dotX;
  const travelY = PAD / 2 - dotY;

  return (
    <motion.div
      // Optically centred with a slight top bias, matching the landing screen —
      // a perfectly centred element on a tall phone sits below the eye's rest point.
      className="flex flex-1 flex-col [justify-content:safe_center] pb-[8vh]"
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: REVEAL_EXIT, ease: EASE_SOFT }}
    >
      <div className="flex flex-col items-center">
        <motion.div
          className="relative"
          style={{ width: PAD, height: PAD }}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.32, ease: EASE_SOFT }}
        >
          {/* The pad itself — the compass's surface and grid, quoted at a third
              of the size. It dissolves once it has done its job of saying
              "this is where you were". */}
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 rounded-[12px] bg-linear-to-b from-gold/14 to-vermillion/10 inset-ring inset-ring-cream/18"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.26, delay: GRID_FADE, ease: EASE_SOFT }}
          >
            <div
              className="absolute inset-0 rounded-[12px]"
              style={{
                backgroundImage:
                  "linear-gradient(color-mix(in srgb, var(--cream) 9%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--cream) 9%, transparent) 1px, transparent 1px)",
                backgroundSize: "25% 25%",
              }}
            />
          </motion.div>

          {/* The dot. Starts where the guest left it, travels to the centre. */}
          <motion.div
            aria-hidden="true"
            className="absolute rounded-full bg-vermillion ring-2 ring-cream"
            style={{
              width: DOT,
              height: DOT,
              left: dotX - DOT / 2,
              top: dotY - DOT / 2,
            }}
            initial={{ opacity: 0, scale: 0.6, x: 0, y: 0 }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0.6, 1, 1, RING / DOT],
              x: [0, 0, travelX, travelX],
              y: [0, 0, travelY, travelY],
            }}
            transition={{
              duration: RING_IN,
              times: [...DOT_TIMES],
              ease: [...DOT_EASE],
            }}
          />

          {/* The ring the dot becomes, carrying the score. Fades up underneath
              the arriving dot rather than replacing it on a frame boundary, so
              the two are never both fully opaque and never both absent. */}
          <motion.div
            className="absolute flex flex-col items-center justify-center rounded-full border-2 border-gold text-gold-light"
            style={{
              width: RING,
              height: RING,
              left: PAD / 2 - RING / 2,
              top: PAD / 2 - RING / 2,
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.26, delay: RING_IN - 0.06, ease: EASE_SOFT }}
          >
            <span className="text-[15px] leading-none font-bold">
              {topScore}%
            </span>
            <span className="mt-0.5 text-[8px] tracking-[0.05em]">MATCH</span>
          </motion.div>
        </motion.div>

        {/* Not a live region: this text is present the moment the element
            mounts, so nothing would be announced. `RevealGate` owns the one
            persistent status region for this screen. */}
        <motion.p
          className="mt-[18px] font-display text-lg"
          initial={{ opacity: 0, y: RISE_DISTANCE }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: ITEM_DURATION, delay: 0.3, ease: EASE_SOFT }}
        >
          Finding your sake…
        </motion.p>
      </div>
    </motion.div>
  );
}
