"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "motion/react";

import { TagPill } from "@/components/TagPill";
import { formatPrice } from "@/lib/format";
import {
  EASE_SOFT,
  HOVER_DURATION,
  ITEM_DURATION,
  ITEM_RISE,
  STAGGER_STEP,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

const MotionLink = motion.create(Link);

/**
 * The circular left slot of a `ResultCard` — the prototype's `.match-badge`.
 *
 * Deliberately a shell, not three components: the callers put different things
 * inside the same ring. Results show a match percentage (`MatchBadge`); the
 * region panel and search both show a wine mark. `tone` is the only difference
 * in the ring itself — gold when the badge is asserting a match, muted when it
 * is just a label.
 *
 * On text in the ring: the 54px circle minus its 2px border leaves ~48px of
 * usable width, so anything longer than about 8 characters wraps or overflows —
 * a prefecture like "Kagoshima" does not fit. Place names belong in the card's
 * `sub` line, which has the full card width. The map panel originally passed a
 * region short name here and now passes the wine mark instead: the region name
 * is already the heading directly above the list, so repeating it in every row
 * said nothing, and matching the search list keeps the two browse screens
 * consistent.
 */
export function ResultBadge({
  tone = "gold",
  children,
  className,
}: {
  tone?: "gold" | "muted";
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-[54px] shrink-0 flex-col items-center justify-center rounded-full border-2 px-1 text-center leading-tight",
        // Gold is the app's "this is the answer" accent (fridge badge, kickers).
        // Only the match badge is asserting something, so only it gets gold text;
        // a plain label reads in cream. Callers can override via `className`
        // (e.g. `text-muted` for a purely decorative icon).
        tone === "gold" ? "border-gold text-gold-light" : "border-muted text-cream",
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Match-percentage badge for the results screen. Score is clamped to 0–100.
 *
 * `tone` exists for the low-confidence state (plan v2 §6): the number stays
 * truthful either way, but gold is this app's "this is the answer" accent, and
 * ringing an 18% match in it would quietly undo an honest headline. Muted says
 * the same number without the endorsement.
 */
export function MatchBadge({
  score,
  tone = "gold",
}: {
  score: number;
  tone?: "gold" | "muted";
}) {
  const clamped = Math.min(100, Math.max(0, Math.round(score)));

  return (
    <ResultBadge tone={tone}>
      <span className="text-[15px] leading-none font-bold">{clamped}%</span>
      <span className="mt-0.5 text-[8px] tracking-[0.05em]">MATCH</span>
    </ResultBadge>
  );
}

/**
 * The one-line legend that tells a guest what `#27` on a card means.
 *
 * `#` is the universal RANK glyph, and `/taste/results` is a list of exactly
 * three things in descending order — so a bare `#19` on the first card has an
 * obvious wrong reading, and the map panel can show a single row, where
 * non-sequential values never accumulate to disprove it. The number itself
 * cannot carry the word: `Fridge #19` does not fit beside the longest sake name
 * in the ~78px the meta line has, and `ResultCard`'s whole placement argument
 * depends on that string never wrapping.
 *
 * So the label is paid once per screen instead of once per row — ~16px total
 * against ~17px x every card — and it converts every `#` below it at the same
 * time. Lives here rather than in each screen so three lists cannot drift into
 * three different sentences.
 *
 * Sighted-only by default is wrong here and it is not what happens: this is a
 * real caption in the flow, and a screen reader gets both this sentence and the
 * per-card `sr-only` "Fridge number", which is belt and braces on purpose —
 * a guest arriving on a row via swipe navigation never hears the caption.
 */
export function FridgeSlotNote({ className }: { className?: string }) {
  return (
    // 11px `--muted`, the same register as the "Not in the fridge tonight" line
    // — a caption on the list, not content in it. No gold: it annotates a
    // number that deliberately is not gold either.
    <p className={cn("text-[11px] text-muted", className)}>
      Numbers are fridge slots.
    </p>
  );
}

export interface ResultCardProps {
  /** Sake id — the card links to `/sake/[id]`. */
  id: string;
  name: string;
  /** Secondary line, e.g. "Niigata · Junmai Ginjo". */
  sub?: ReactNode;
  /**
   * Fridge slot, rendered as `#27` opposite the name. See the meta-line note
   * below for why it is not gold.
   */
  fridgeNumber?: number;
  /** MYR, rendered as `RM 145` beside the fridge number. Omitted when null. */
  price?: number | null;
  /**
   * Whether this list has an availability story at all, and what it is.
   *
   * Three values rather than a boolean, because "in stock" and "the question
   * does not arise" are different rows. `/taste/results` and the map panel
   * filter out-of-stock bottles out before they reach a card, so a stock
   * indicator there is a line that can never say anything — it is left
   * undefined. `/search` deliberately shows out-of-stock bottles (demoted, not
   * hidden) and passes the real state.
   */
  stock?: "in-stock" | "out-of-stock";
  /**
   * One plain-language line under the sub — on `/taste/results`, why this
   * bottle came back. Set in cream rather than `--muted` because it is the
   * card's substance, not its metadata; `sub` above it is the metadata.
   */
  reason?: ReactNode;
  /** Rendered as gold `TagPill`s under the sub line. */
  tags?: string[];
  /** Left slot: a `MatchBadge`, a `ResultBadge` with a short label, an icon, … */
  badge?: ReactNode;
  /**
   * Position in a list — drives the stagger-in delay.
   *
   * May be fractional. A grid has rows rather than a single line, so the search
   * screen passes `index / columns`: the whole part is the row and the fraction
   * is the position within it, which keeps the cascade reading left-to-right
   * and row-by-row at any column count. The cap below then counts rows, not
   * cards.
   */
  index?: number;
  /** Seconds between siblings. Tighter for long lists (search), looser for a 3-up reveal. */
  staggerStep?: number;
  className?: string;
}

/**
 * The prototype's `.result-card`: translucent cream surface, 14px radius, left
 * badge slot, name / sub / tags stacked to the right. Always a link to the sake
 * detail page — every path through the app ends at a bottle number.
 *
 * Animation props are static rather than branched on `useReducedMotion()` — see
 * the note in `PageTransition`; its `MotionConfig` handles the preference.
 */
export function ResultCard({
  id,
  name,
  sub,
  fridgeNumber,
  price,
  stock,
  reason,
  tags,
  badge,
  index = 0,
  staggerStep = STAGGER_STEP,
  className,
}: ResultCardProps) {
  const hasMeta = fridgeNumber != null || price != null;

  return (
    <MotionLink
      href={`/sake/${id}`}
      initial={{ opacity: 0, y: ITEM_RISE }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: ITEM_DURATION,
        ease: EASE_SOFT,
        // Capped: a 30-row search result must not have its last card arrive two
        // seconds after its first. Past ~6 rows the stagger has done its job.
        delay: Math.min(index, 6) * staggerStep,
      }}
      whileHover={{
        y: -2,
        transition: { duration: HOVER_DURATION, ease: EASE_SOFT },
      }}
      whileTap={{ scale: 0.985 }}
      className={cn(
        "flex items-center gap-3.5 rounded-lg border border-cream/14 surface-6 p-3.5",
        "transition-colors duration-200 hover:bg-cream/12",
        // No `ring-offset` — it would paint a solid --bg band over the page's
        // radial gradient. See the landing card for the full note.
        "focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none",
        className,
      )}
    >
      {badge}
      <span className="min-w-0 flex-1">
        {/*
         * The name row carries the fridge number and price at its far end.
         *
         * ── Why here and not a row of its own ─────────────────────────────
         * The card is already name / sub / (reason) / (tags). A fourth stacked
         * line of `#27 · RM 145` is the row that turns a card into a table, and
         * on `/taste/results` it costs ~17px on each of three cards — which is
         * the difference between the third match sitting at the fold and under
         * it on a Safari viewport. The space to the right of a 13-character
         * sake name is empty at every width this app renders at, so the meta
         * costs nothing vertically and the lines below it keep the full column.
         *
         * ── Why right-aligned ─────────────────────────────────────────────
         * Three cards stacked put their prices at the same x, so "RM 90 vs
         * RM 320" is one downward glance rather than three taps into detail
         * pages and back. That comparison is the entire reason this metadata
         * exists.
         *
         * ── Why it is not gold ────────────────────────────────────────────
         * `FridgeBadge` wins the detail page on three mechanisms, and the
         * second is being the only saturated gold MASS in the app. A gold `#27`
         * on every row of every list spends that everywhere and the badge
         * arrives at the end of the journey looking like more of what the guest
         * has already seen. Cream at 12px against a 16px display-serif name and
         * a 54px ringed badge is legible and outranks nothing.
         *
         * `items-baseline` so the 12px meta sits on the name's baseline rather
         * than floating at its cap height; `shrink-0` + `whitespace-nowrap` so
         * a long name wraps and the numbers never do.
         */}
        <span className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 font-display text-base font-bold">{name}</span>
          {hasMeta ? (
            <span className="shrink-0 text-xs whitespace-nowrap text-cream">
              {fridgeNumber != null ? (
                <>
                  {/* Same split `FridgeBadge` uses: the glyph is decoration a
                      screen reader would spell out as "hash", the words are
                      what it should actually say. "Fridge number", not just
                      "Number", because unlike the detail page there is no
                      "Find me / in the fridge" wrapped around it here. */}
                  <span aria-hidden="true">#</span>
                  <span className="sr-only">Fridge number </span>
                  {fridgeNumber}
                </>
              ) : null}
              {fridgeNumber != null && price != null ? (
                <>
                  <span aria-hidden="true"> · </span>
                  {/* The interpunct's spaces live inside the hidden span, so
                      with the glyph dropped there is no text node left between
                      the two numbers and a screen reader runs them together as
                      "fridge number 19RM 115". A comma is what the pause
                      actually is. */}
                  <span className="sr-only">, </span>
                </>
              ) : null}
              {price != null ? formatPrice(price) : null}
            </span>
          ) : null}
        </span>
        {sub ? (
          <span className="mt-[3px] block text-xs text-muted">{sub}</span>
        ) : null}
        {stock === "out-of-stock" ? (
          // Lifted out of `SearchScreen`'s `sub` when the meta line arrived, so
          // the card owns availability rather than having it smuggled in as
          // part of a ReactNode. Same 11px `--muted` line it has always been —
          // the colour `FridgeBadge` gives its own out-of-stock label, and not
          // a cream tint, which at this luminance is a near-miss on --muted in
          // a different hue sitting 4px under a --muted line.
          <span className="mt-1 block text-[11px] text-muted">
            Not in the fridge tonight
          </span>
        ) : null}
        {reason ? (
          // Cream, not `--muted`: this is the card's answer to "why am I looking
          // at this bottle", and the app has exactly two text luminances, so it
          // takes the content one. Its own line at full column width — the meta
          // deliberately stayed on the name row so this sentence has the room to
          // land in one or two lines rather than four.
          // `leading-snug`, not `leading-relaxed`: this sentence wraps to two
          // lines on most cards, and at `leading-relaxed` those two lines cost
          // 8px per card over three cards — which at a 712px Safari viewport
          // is the difference between the third match sitting fully above the
          // fold and not. 12px on 16.5px is a hair looser than the 16px the
          // `sub` line directly above it already runs at, so the card keeps one
          // rhythm rather than two.
          <span className="mt-1 block text-xs leading-snug text-cream">
            {reason}
          </span>
        ) : null}
        {tags && tags.length > 0 ? (
          <span className="mt-2 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <TagPill key={tag}>{tag}</TagPill>
            ))}
          </span>
        ) : null}
      </span>
    </MotionLink>
  );
}
