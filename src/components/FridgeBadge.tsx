"use client";

import { motion } from "motion/react";

import { EASE_SOFT, ITEM_RISE } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Held until *both* attribute bars have finished travelling. The second bar is
 * the late one — 0.18 delay + 0.14 stagger + 0.7 travel = it settles at 1.02s —
 * so 0.62 launched the badge while that bar was still moving and landed it at
 * exactly 1.02, the same instant. Two things resolving on the same frame
 * collapse a cascade into a chord.
 *
 * 0.78, over `BADGE_DURATION`, lands the badge at 1.28 — 0.26s after the last
 * marker settles. The page arrives as four beats: page 0.45, bar one 0.88, bar
 * two 1.02, badge 1.28. The badge is the answer, and an answer that arrives
 * before the evidence has settled reads as a coincidence rather than a
 * conclusion; being the last thing still moving is what makes it the
 * conclusion.
 */
const BADGE_DELAY = 0.78;

/**
 * Longer than `ITEM_DURATION` (0.4), which is the clock for cards and rows.
 * This is not an item in a list — it is the page's conclusion, and the largest
 * moving thing on it. At 0.4 it arrived faster than the 6px attribute markers,
 * which reads as the biggest element being the lightest.
 */
const BADGE_DURATION = 0.5;

/** `RM 175`. Fixed locale so server and client render the same string. */
function formatPrice(price: number): string {
  return `RM ${new Intl.NumberFormat("en-MY", {
    maximumFractionDigits: 2,
  }).format(price)}`;
}

export interface FridgeBadgeProps {
  fridgeNumber: number;
  /** Drives the whole honesty branch — see below. */
  inStock: boolean;
  /** MYR. Omitted from the meta line when null. */
  price?: number | null;
  className?: string;
}

/**
 * The destination of the entire app — plan v2 §9/§4. Every screen before this
 * one exists to build enough confidence that a guest stands up and walks to a
 * numbered bottle, so this is the single most dominant element on the page and
 * the only place saturated gold is used at size.
 *
 * ── How it wins the page ────────────────────────────────────────────────────
 * NOT by size. This is a 176px gold-gradient block carrying a 50px number in
 * ink, against a 26px cream sake name — under 2x the name's cap height, and
 * about half the reading column. It wins on three other things, which is the
 * point worth keeping:
 *
 *   1. It is the only INVERTED surface on the page — dark ink on a light warm
 *      block, where everything else is light-on-indigo.
 *   2. It is the only saturated gold MASS. Gold is otherwise spent on hairlines
 *      and kickers (and, deliberately, one foil capsule on the bottle).
 *   3. It ARRIVES LAST, 0.26s after the attribute bars settle. Being the final
 *      thing to move is what makes it read as the conclusion.
 *
 * It was 240px with a 72px numeral, at 69% of the column and 2.76x the name.
 * Shown three sizes side by side on a real phone, the user chose this one:
 * "the color and design is sharp enough and confirm people will notice, it
 * dont have to be big". That is the correct reading of the three mechanisms
 * above — the block was carrying belt and braces.
 *
 * Two practical gains: it stops being the element that forces every other thing
 * on the page to shrink to fit (see the compression note in the detail page),
 * and it reads as confident rather than loud, which is the register the rest of
 * this app is in.
 *
 * If you are tempted to grow it again, check first whether the actual problem is
 * that one of the three mechanisms above has been weakened — gold leaking
 * elsewhere, the inversion diluted, or the entrance cascade broken. Size is the
 * least effective of the four levers and the only one with a page-layout cost.
 *
 * ── Out of stock ────────────────────────────────────────────────────────────
 * The badge is a promise that a guest will walk to the fridge and find the
 * bottle. When it can't keep that promise it stops making it: the gold, the
 * glow and the "Find me" wording are all withdrawn (gold is this app's "this is
 * the answer" accent — see `MatchBadge`), the number stays visible because it
 * is still what staff will reference, and an explicit vermillion notice says so
 * in words rather than leaving the guest to infer it from a colour change.
 *
 * ── Why nothing here loops ──────────────────────────────────────────────────
 * Plan §9 asks for a "gently pulsing" badge and this deliberately does not
 * pulse. The badge previously breathed on a 2.6s infinite loop — a 1.5% scale,
 * plus a gold glow cycling opacity 0.4 → 0.8. Shown it in use, the user found
 * it "a bit weird", and they were right for a reason worth writing down:
 *
 * An infinite loop never resolves, so after its first cycle it asks for
 * attention without carrying new information. This badge does not need it. It
 * already wins the page — the only gold mass, the only inverted surface — and,
 * decisively, it is the LAST thing to arrive, landing 0.26s after the attribute
 * bars settle. That delay is what makes it read as the page's conclusion.
 * Attention is earned by the entrance; a permanent pulse spends it again every
 * 2.6 seconds for nothing.
 *
 * There is also a semantic mismatch: pulsing means alert, live, waiting. A
 * fridge slot number is a static fact. Bottle #27 is not breathing. And this is
 * a page a guest holds while walking to a fridge, where a throbbing element in
 * peripheral vision is a small, constant irritation.
 *
 * The glow survives as a STATIC bloom, which gives the badge warmth without
 * motion. Consequently reduced motion needs no special handling here at all —
 * the only animation left is the entrance, and `MotionConfig reducedMotion="user"`
 * in `PageTransition` neutralises that globally. If you ever reintroduce a loop,
 * note that Motion strips animated `transform` but NOT animated `opacity`, so an
 * opacity loop would need its own `motion-reduce:hidden`.
 */
export function FridgeBadge({
  fridgeNumber,
  inStock,
  price,
  className,
}: FridgeBadgeProps) {
  return (
    <motion.div
      className={cn("flex flex-col items-center", className)}
      initial={{ opacity: 0, y: ITEM_RISE, scale: 0.96 }}
      // `whileInView`, not `animate`: on a 375x667 screen — or on any record
      // with a long description — the badge starts below the fold, and an
      // entrance nobody was there to see is an entrance wasted. Motion fires
      // this immediately when the element is already visible, so a tall phone
      // keeps the exact cascade below and a short one gets the arrival when the
      // guest actually arrives. The glow and the breath stay on `animate` —
      // they are loops, not entrances.
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{
        duration: BADGE_DURATION,
        delay: BADGE_DELAY,
        ease: EASE_SOFT,
      }}
    >
      <div className="relative">
        {inStock ? (
          // A static bloom, not a loop. Plain `span`, not `motion.span`: it no
          // longer animates, so there is nothing for Motion to drive.
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-3 rounded-[2.5rem] bg-gold/30 opacity-55 blur-2xl"
          />
        ) : null}

        <motion.div
          className={cn(
            // The badge takes the same one step up at `md` that the sake name
            // and every other heading takes (176 → 200px is 1.133, the hero's
            // exact ratio). Not decoration: leave the badge fixed while the
            // column grows to 464px and the name to 29px, and the badge quietly
            // shrinks relative to both. If the page's type scales, its
            // conclusion scales with it.
            "relative w-44 rounded-[1.75rem] px-5 py-5 text-center md:w-50",
            inStock
              ? "bg-linear-160 from-gold-light to-gold text-ink"
              : "border border-cream/20 surface-8 text-cream",
          )}
        >
          <p
            className={cn(
              "text-[11px] tracking-[0.12em] uppercase",
              // 80, not the prototype's 75: --ink at 75% over --gold measures
              // 4.40:1, just under AA for 11px text, and the sub-line sits on
              // the dark end of the 160deg gradient where it is worst. 80%
              // takes it to 4.90:1 without visibly changing the hierarchy.
              inStock ? "opacity-80" : "text-muted",
            )}
          >
            {inStock ? "Find me" : "Bottle"}
          </p>
          {/* 50 → 56px at `md`, the same 1.111 step the badge's width takes,
              so the numeral and the block it sits in scale together. */}
          <p className="font-display text-[3.125rem] leading-none font-bold md:text-[3.5rem]">
            <span aria-hidden="true">#</span>
            <span className="sr-only">Number </span>
            {fridgeNumber}
          </p>
          <p
            className={cn(
              "text-[11px] tracking-[0.1em] uppercase",
              // 80, not the prototype's 75: --ink at 75% over --gold measures
              // 4.40:1, just under AA for 11px text, and the sub-line sits on
              // the dark end of the 160deg gradient where it is worst. 80%
              // takes it to 4.90:1 without visibly changing the hierarchy.
              inStock ? "opacity-80" : "text-muted",
            )}
          >
            {/* "sold out tonight", not "not in the fridge tonight": 25 chars at
                11px uppercase on 0.1em tracking wraps inside the badge's 192px
                of content width. */}
            {inStock ? "in the fridge" : "sold out tonight"}
          </p>
        </motion.div>
      </div>

      {/* Price, directly under the badge: it is the thing that can still change
          a guest's mind *after* they have chosen a bottle, so it belongs with
          the number they'd be walking to — not up in the hero where it would
          compete with the name. Set in the display serif so it reads as part of
          the badge's cluster rather than as a new section.

          Availability is deliberately NOT restated here when in stock: the gold,
          the pulse, "Find me" and "in the fridge" have all said it already, and
          a fifth "In stock tonight" in muted 13px turns the cluster into a
          receipt. Only the out-of-stock case needs words, below. */}
      {price != null ? (
        <p className="mt-5 font-display text-[15px] text-cream">
          {formatPrice(price)}
        </p>
      ) : null}

      {!inStock ? (
        // `max-w-44` matches the badge's own 176px, and the `md` step matches
        // the badge's `md:w-50` — the notice is an annotation on the badge,
        // so the two widths have to move together. Left to size itself, this
        // notice fills the full 350px column and becomes the widest element on
        // the page — a vermillion box out-massing the thing it annotates.
        //
        // `mt-4` rather than `mt-2` because the price above it is optional: with
        // a null price this is the badge's immediate neighbour, and 8px glued it
        // to the badge's edge.
        <p className="mt-4 max-w-44 md:max-w-50 rounded-lg border border-vermillion/45 bg-vermillion/15 px-3.5 py-2.5 text-center text-[12.5px] leading-relaxed text-vermillion-light">
          Ask your server what&rsquo;s open instead.
        </p>
      ) : null}
    </motion.div>
  );
}
