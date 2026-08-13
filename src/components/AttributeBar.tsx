"use client";

import { motion } from "motion/react";

import { EASE_SOFT } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * How long the marker takes to travel to its value. The prototype's reference
 * feel — 0.7s on `cubic-bezier(0.22,1,0.36,1)`, which is `EASE_SOFT` — and
 * deliberately longer than `ITEM_DURATION` (0.4s): every other element is
 * *arriving*, this one is *measuring*. The extra time is what makes the marker
 * read as settling on a value rather than being placed at one.
 */
const SLIDE_DURATION = 0.7;

/**
 * The bars start while the page (0 → 0.45s) is still rising. Deliberately not
 * serial: waiting for the page to settle would put the first marker in motion
 * at 0.45 and the badge past 1.4s, which reads as a slideshow. Overlapping by
 * this much lets the two motions compound — the page is still arriving as the
 * measure begins — while keeping enough offset that the bars are legibly their
 * own beat rather than part of the page's rise.
 */
const SLIDE_DELAY = 0.18;

/**
 * Gap between the two bars. Wider than `STAGGER_STEP` (0.09): with a 0.7s
 * travel, a 0.09s offset reads as one bar with a rendering fault rather than as
 * two. This is the smallest gap at which the eye reads them as sequential.
 */
const SLIDE_STAGGER = 0.14;

export interface AttributeBarProps {
  /** Left pole of the axis, e.g. "Dry". Also the 0 end of `value`. */
  leftLabel: string;
  /** Right pole of the axis, e.g. "Sweet". Also the 100 end of `value`. */
  rightLabel: string;
  /** 0–100 along the axis. Clamped. */
  value: number;
  /** Position in the stack — drives the stagger. */
  index?: number;
  className?: string;
}

/**
 * One of the two taste axes on the detail page — plan v2 §9's animated
 * attribute bar. Dry↔Sweet and Light↔Rich, and nothing else: `aroma_intensity`
 * is descriptive metadata, never a third bar (§10).
 *
 * ── Why the marker rides a "carriage" ───────────────────────────────────────
 * §9 is explicit that the marker slides in rather than snapping. The obvious
 * implementation animates `left` from 50% to the value — but `left` is not a
 * transform, so Motion's `reducedMotion="user"` (set once in `PageTransition`)
 * would *not* strip it, and a reduced-motion guest would still get the slide.
 *
 * So the marker sits on the right edge of a zero-height carriage whose width is
 * the value itself, and the carriage animates `x` from `-100%` to `0` — a
 * percentage of its *own* width, which is exactly the distance from the left of
 * the track to the value. Pure transform: it honours reduced motion for free,
 * runs on the compositor, and needs no measurement of the track.
 *
 * ── Bare track, no fill ─────────────────────────────────────────────────────
 * A gold fill growing from the left edge was tried and cut. These axes are
 * bipolar — a bottle at sweetness 20 is *emphatically dry*, which is a real
 * character, not a low score — and a fill is the visual grammar of a quantity
 * accumulating, so it would render that bottle as a nearly empty progress bar.
 * A bare track with a point on it is what the data actually is.
 */
export function AttributeBar({
  leftLabel,
  rightLabel,
  value,
  index = 0,
  className,
}: AttributeBarProps) {
  const pct = Math.min(100, Math.max(0, value));
  const width = `${pct}%`;

  const slide = {
    duration: SLIDE_DURATION,
    delay: SLIDE_DELAY + index * SLIDE_STAGGER,
    ease: EASE_SOFT,
  };

  // Spoken, not numeric: "68 out of 100" is a measurement a guest never asked
  // for. The poles are the vocabulary the plan uses (§5), so the readout uses
  // them too.
  const descriptor =
    pct <= 33
      ? `mostly ${leftLabel.toLowerCase()}`
      : pct >= 67
        ? `mostly ${rightLabel.toLowerCase()}`
        : `between ${leftLabel.toLowerCase()} and ${rightLabel.toLowerCase()}`;

  return (
    <div className={cn("mb-4", className)}>
      {/* Hidden from assistive tech: the poles are already in the track's
          `aria-label`, and left visible to it a screen reader announces
          "Dry, Sweet, image: Dry to Sweet: mostly dry". */}
      <div
        aria-hidden="true"
        className="mb-1.5 flex justify-between text-[11px] text-muted"
      >
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>

      <div
        role="img"
        aria-label={`${leftLabel} to ${rightLabel}: ${descriptor}`}
        className="relative h-1.5 rounded-full surface-12"
      >
        {/* The carriage is unclipped — the 14px marker overhangs the 6px track. */}
        <motion.div
          aria-hidden="true"
          style={{ width }}
          className="absolute inset-y-0 left-0"
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          transition={slide}
        >
          <span className="absolute top-1/2 right-0 size-3.5 -translate-y-1/2 translate-x-1/2 rounded-full border-2 border-cream bg-gold" />
        </motion.div>
      </div>
    </div>
  );
}
