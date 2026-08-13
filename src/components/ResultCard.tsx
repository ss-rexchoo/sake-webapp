"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "motion/react";

import { TagPill } from "@/components/TagPill";
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

export interface ResultCardProps {
  /** Sake id — the card links to `/sake/[id]`. */
  id: string;
  name: string;
  /** Secondary line, e.g. "Niigata · Junmai Ginjo". */
  sub?: ReactNode;
  /** Rendered as gold `TagPill`s under the sub line. */
  tags?: string[];
  /** Left slot: a `MatchBadge`, a `ResultBadge` with a short label, an icon, … */
  badge?: ReactNode;
  /** Position in a list — drives the stagger-in delay. */
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
  tags,
  badge,
  index = 0,
  staggerStep = STAGGER_STEP,
  className,
}: ResultCardProps) {
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
      <span className="min-w-0">
        <span className="block font-display text-base font-bold">{name}</span>
        {sub ? (
          <span className="mt-[3px] block text-xs text-muted">{sub}</span>
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
