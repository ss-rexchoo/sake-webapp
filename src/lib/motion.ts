/**
 * Shared Motion vocabulary — plan v2 §12.
 *
 * Every animation in the app pulls its easing and timing from here so the whole
 * experience moves with one hand. No CSS `@keyframes`: the prototype's
 * keyframes (`fadeSlideUp`, `cardIn`, …) are stand-ins that Motion now owns.
 *
 * This module is hook-free on purpose so server components can import it.
 * For the reduced-motion read, use `useReducedMotion()` from `motion/react`;
 * `<PageTransition>` also wraps every route in `<MotionConfig reducedMotion="user">`,
 * which strips transforms globally when the OS asks for it.
 */

/**
 * The house ease. A calibrated ease-out — fast off the mark, long soft landing.
 * Deliberately not a library preset: presets read as generic UI, and this app's
 * one differentiator is how it moves.
 */
export const EASE_SOFT: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Route-level fade + rise. Matches the prototype's `fadeSlideUp` 0.45s. */
export const PAGE_DURATION = 0.45;

/** How far a whole page travels on the way in, in px. */
export const RISE_DISTANCE = 14;

/**
 * How far an individual item (card, result row) travels, in px.
 * Smaller than `RISE_DISTANCE` on purpose: items animate inside a container that
 * is itself still rising, so the two distances compound. An item that travels
 * less than the thing carrying it keeps the hierarchy legible.
 */
export const ITEM_RISE = 10;

/**
 * Element-level fade + rise. Deliberately shorter than `PAGE_DURATION`: these
 * items animate *inside* a container that is itself still rising, so the two
 * motions compound. A child that outlasts the parent carrying it reads as lag,
 * not as settling — the smaller thing should finish first.
 */
export const ITEM_DURATION = 0.4;

/** Gap between staggered siblings (cards, result rows). */
export const STAGGER_STEP = 0.09;

/** Held before staggered children start, so the page header lands first. */
export const STAGGER_DELAY = 0.16;

/**
 * Hover/press feedback. Short enough to feel like a direct response to the
 * finger, and shared by the transform and the CSS surface brighten so the two
 * halves of the same gesture stay on one timeline.
 */
export const HOVER_DURATION = 0.2;

/**
 * How long the reveal holds before the results replace it, in seconds.
 *
 * Long enough to read as "we are choosing for you", short enough that it never
 * becomes a toll booth on a 20–40 second journey (plan v2 §1).
 *
 * Raised from 1.1 after the reveal was rebuilt around the compass dot. The old
 * value was sized for a looping shimmer, which has no payoff moment — it could
 * be cut anywhere. The new sequence ends on the guest's actual score, and at 1.1
 * that number finished fading in at ~0.98 and was gone at 1.10: **0.12s of
 * visibility for the thing the whole sequence exists to deliver.** The user's
 * words were that the animation was good but "the transition from animation to
 * match to next screen is too fast" — this is the number behind that.
 *
 * 1.55 gives the ring ~0.57s to be read, which is about the floor for a
 * two-digit number a guest is not expecting yet. If `RING_IN` in
 * `RevealSequence` changes, this has to move with it — the value that matters is
 * the GAP between the ring landing and the swap, not this figure on its own.
 */
export const REVEAL_HOLD = 1.55;

/**
 * The reveal's hand-off to the results. Still shorter than `ITEM_DURATION`: the
 * reveal is leaving, and a slow exit reads as the app hesitating rather than
 * handing over.
 *
 * 0.28 rather than 0.22 — a fraction more, because what leaves now is a number
 * the guest was reading rather than a decorative badge, and snatching it away
 * is what made the hand-off feel abrupt even once the hold was long enough.
 */
export const REVEAL_EXIT = 0.28;

/**
 * The region panel's exit on the map. Sits alongside `REVEAL_EXIT` for the same
 * reason: something being dismissed should clear the way faster than it arrived,
 * or the next thing looks like it is waiting its turn.
 */
export const PANEL_EXIT = 0.14;

/**
 * Easing for a continuous, looping "breath".
 *
 * Symmetric on purpose, and the one case where `EASE_SOFT` is wrong: an ease-out
 * decelerates into its end state, so on a loop the animation lands, stops dead,
 * and restarts at full speed — a visible tick at the seam once per cycle. A
 * symmetric curve has the same velocity leaving the end as entering the start,
 * so the seam disappears.
 *
 * NOTHING USES THIS TODAY. It was the fridge badge's pulse, which was removed —
 * see the note in `FridgeBadge.tsx` on why that badge deliberately does not
 * loop. Kept because it is the correct curve for any future looping element and
 * the reasoning above is the part that would be expensive to rediscover; delete
 * it freely if the app stays loop-free.
 */
export const EASE_BREATH: [number, number, number, number] = [0.4, 0, 0.6, 1];

/**
 * The taste compass dot. The one spring in the app, because it is the one
 * element a guest physically pushes around — plan v2 §4 calls the compass the
 * signature interaction, and a duration-based ease on a dragged object reads as
 * a slideshow, not as weight.
 *
 * Tuned rather than taken from a preset: slightly under-damped so the dot
 * arrives with a hint of overshoot, and light enough (`mass` below 1) that a
 * flick still feels quick on a phone.
 */
export const DOT_SPRING = {
  type: "spring",
  stiffness: 420,
  damping: 28,
  mass: 0.7,
} as const;

/**
 * Grow/settle of the dot's halo as a drag starts and ends. Matched to
 * `HOVER_DURATION` so the pad answers a finger on the same clock as every
 * other control.
 */
export const DOT_HALO_DURATION = HOVER_DURATION;

/**
 * Crossfade of the compass readout when the descriptor changes.
 *
 * Much shorter than `ITEM_DURATION`, and overlapping rather than sequential: the
 * words sit on a 3x3 threshold grid, so a single drag crosses them repeatedly. A
 * fade-out-then-fade-in of normal length would leave the readout blank for most
 * of a gesture and make the one live element in the app feel like it is lagging
 * the finger.
 */
export const READOUT_FADE = 0.15;
