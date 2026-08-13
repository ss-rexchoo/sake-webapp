"use client";

import { Wine } from "lucide-react";
import { motion } from "motion/react";

import {
  EASE_SOFT,
  EASE_SWEEP,
  ITEM_DURATION,
  REVEAL_EXIT,
  REVEAL_SHIMMER,
  REVEAL_SHIMMER_DELAY,
  RISE_DISTANCE,
} from "@/lib/motion";

/**
 * The recommendation reveal — plan v2 §12's "one signature sequence".
 *
 * Three overlapping beats, all in Motion, no CSS `@keyframes` and no GSAP:
 *   1. a gold badge scales up from 0.6 and fades in,
 *   2. a light sweep runs down its face on a loop, clipped by the circle,
 *   3. "Finding your sake…" rises in underneath, a beat later.
 *
 * Motion covered the whole thing: the sweep is a two-keyframe `y` array with
 * `repeat: Infinity`, the stagger is a per-element `delay`, and the hand-off to
 * the results is an `exit` resolved by the `AnimatePresence` in `RevealGate`.
 * Nothing here needed a timeline, so GSAP stayed out of the bundle.
 */
export function RevealSequence() {
  return (
    <motion.div
      // Optically centred with a slight top bias, matching the landing screen —
      // a perfectly centred badge on a tall phone sits below the eye's rest point.
      className="flex flex-1 flex-col [justify-content:safe_center] pb-[8vh]"
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: REVEAL_EXIT, ease: EASE_SOFT }}
    >
      <div className="flex flex-col items-center">
        <motion.div
          className="relative flex size-[5.75rem] items-center justify-center overflow-hidden rounded-full border border-gold/40 bg-gold/16"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: EASE_SOFT }}
        >
          <Wine aria-hidden="true" className="size-[2.375rem] text-gold-light" />

          {/* The sweep is wider than the badge and starts outside it, so what
              shows through the circle is the middle of the gradient — the light
              crosses the face rather than fading up on it. */}
          <motion.span
            aria-hidden="true"
            className="absolute top-0 left-[-20%] h-[40%] w-[140%] bg-linear-to-b from-transparent via-cream/35 to-transparent"
            initial={{ y: "-120%" }}
            animate={{ y: "220%" }}
            transition={{
              duration: REVEAL_SHIMMER,
              delay: REVEAL_SHIMMER_DELAY,
              ease: EASE_SWEEP,
              // One pass covers the hold exactly; the repeat only matters if a
              // slow device pushes the hand-off past `REVEAL_HOLD`, and a badge
              // that has gone still would read as a stall. The delay before the
              // second pass is what keeps a fresh sweep from starting up inside
              // the 0.22s exit fade on a normal device.
              repeat: Infinity,
              repeatDelay: REVEAL_SHIMMER_DELAY,
            }}
          />
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
