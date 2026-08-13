"use client";

import Link from "next/link";
import { motion } from "motion/react";

import { Kicker } from "@/components/Kicker";
import { PageHeader } from "@/components/PageHeader";
import { FridgeSlotNote, MatchBadge, ResultCard } from "@/components/ResultCard";
import { EASE_SOFT, HOVER_DURATION } from "@/lib/motion";

const MotionLink = motion.create(Link);

/** One row, flattened on the server so the client bundle never sees a full Sake. */
export interface TasteMatch {
  id: string;
  name: string;
  sub: string;
  tags: string[];
  /** Slot the guest walks to. Every row here is in stock — `topMatches` filters. */
  fridgeNumber: number;
  /** MYR. Null rows simply omit the price. */
  price: number | null;
  /** One line from `matchReason`, computed on the server. */
  reason: string;
  /** 0–100, already floored at 1 by the caller. */
  score: number;
}

/**
 * A three-up 0.12s stagger, looser than the app's default `STAGGER_STEP`.
 * These three cards are the payoff of the whole journey and there are only ever
 * three of them, so they get room to arrive one at a time; a 30-row search list
 * would feel slow at this spacing.
 */
const RESULT_STAGGER = 0.12;

export function TasteResults({
  matches,
  lowConfidence,
  adjustHref,
}: {
  matches: TasteMatch[];
  lowConfidence: boolean;
  /** Back to the compass with the guest's point intact. */
  adjustHref: string;
}) {
  return (
    <>
      {lowConfidence ? (
        /*
         * The honest state — plan v2 §6.
         *
         * Deliberately not a panel. A bordered, tinted box at this width lands
         * within a few percent of a `ResultCard` and reads as a fourth, tappable
         * result sitting above three real ones. The caveat is carried instead by
         * a gold hairline — the app's aside mark, and not vermillion, which is
         * the action colour and would read as a stop sign when nothing has
         * actually gone wrong — plus the muted rings on every badge below.
         *
         * The three cards are otherwise unchanged and still carry their real
         * percentages. The caveat is on the confidence, not on the answer.
         */
        // `mb-1.5`, not the shared header's 22px: `FridgeSlotNote` sits
        // directly below and carries the gap to the list instead. The caption
        // explains a glyph in the header's own sentence — it belongs to the
        // header, not to the first card.
        <header className="mt-[2.875rem] mb-1.5 text-center">
          <span
            aria-hidden="true"
            className="mx-auto mb-3.5 block h-px w-10 bg-gold/45"
          />
          <Kicker className="mb-1">Closest we have</Kicker>
          <h1 className="font-display text-[22px] leading-snug font-bold">
            Nothing&rsquo;s a perfect match tonight
          </h1>
          <p className="mt-1.5 text-[13px] text-muted">
            But here&rsquo;s what comes closest.
          </p>
        </header>
      ) : (
        <PageHeader
          // Same as the low-confidence header above — the note below takes over
          // the gap to the list.
          className="mb-1.5"
          align="center"
          kicker="Your matches"
          title={
            matches.length === 1
              ? "We found one for you"
              : `We found ${matches.length} for you`
          }
        />
      )}

      {/* Centred, to sit with the header above it rather than as a stray line
          over the first card — this screen's header is centred and the note is
          the last thing said before the answers. */}
      <FridgeSlotNote className="mb-3.5 text-center" />

      <ul className="flex flex-col gap-3">
        {matches.map((match, index) => (
          <li key={match.id} className="flex">
            <ResultCard
              id={match.id}
              name={match.name}
              sub={match.sub}
              // No `stock` prop: `topMatches` has already dropped everything
              // out of stock, so an availability line here could only ever say
              // "in stock" — which is what the whole screen already means.
              fridgeNumber={match.fridgeNumber}
              price={match.price}
              reason={match.reason}
              tags={match.tags}
              badge={
                <MatchBadge
                  score={match.score}
                  tone={lowConfidence ? "muted" : "gold"}
                />
              }
              index={index}
              staggerStep={RESULT_STAGGER}
              className="w-full"
            />
          </li>
        ))}
      </ul>

      <MotionLink
        href={adjustHref}
        whileHover={{
          y: -1,
          transition: { duration: HOVER_DURATION, ease: EASE_SOFT },
        }}
        whileTap={{ scale: 0.97 }}
        className={
          "mx-auto mt-6 inline-flex items-center rounded-full border border-cream/20 " +
          "surface-8 px-4 py-2 text-[13px] text-cream transition-colors duration-200 " +
          "hover:bg-cream/16 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
        }
      >
        Adjust my taste
      </MotionLink>
    </>
  );
}
