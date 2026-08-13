"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { RevealSequence } from "@/components/RevealSequence";
import { EASE_SOFT, ITEM_DURATION, REVEAL_HOLD } from "@/lib/motion";

/** Session-scoped, so a fresh QR scan at the next table starts clean. */
const SEEN_KEY = "sake:revealed";

/** Private mode and locked-down browsers throw on storage — never fatal here. */
function readSeen(): string | null {
  try {
    return sessionStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

function writeSeen(value: string) {
  try {
    sessionStorage.setItem(SEEN_KEY, value);
  } catch {
    // No storage: the reveal simply plays again. Degrades to theatre, not to a bug.
  }
}

/**
 * Holds the reveal on screen for `REVEAL_HOLD`, then hands over to whatever the
 * server rendered underneath it.
 *
 * `children` arrives already computed on the server — the pause is theatre, not
 * latency, and it must never become latency. `mode="wait"` makes the badge
 * finish leaving before the results arrive, so the two never overlap on a
 * screen this narrow.
 *
 * ── Played once per taste point ─────────────────────────────────────────────
 * `template.tsx` remounts on every navigation, so without a guard a guest who
 * opens a bottle and taps Back would sit through "Finding your sake…" again over
 * results that were chosen a minute ago. At that point the sequence has stopped
 * revealing anything and become a toll booth on a 20–40 second journey (plan v2
 * §1). `revealKey` is the taste point, so re-plotting earns a new reveal and
 * re-treading the same one does not.
 *
 * The results are mounted only once the hold is over, which is what lets each
 * `ResultCard` play its own stagger-in on arrival rather than having quietly
 * finished animating behind a curtain.
 */
export function RevealGate({
  revealKey,
  announcement,
  children,
}: {
  /** Identifies this reveal. Same key twice in a session = skip the theatre. */
  revealKey: string;
  /** Read out when the results land — see the status region below. */
  announcement: string;
  children: ReactNode;
}) {
  // Always false on the server and on the first client render, so hydration
  // matches; the effect below corrects it before the badge has faded up from
  // its `opacity: 0` start, which is why the skip never flashes.
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    // A zero hold rather than an immediate `setRevealed` — same outcome one tick
    // later, and it keeps the state change inside a callback where React (and
    // `react-hooks/set-state-in-effect`) wants it. Nothing is visible in that
    // tick: the badge starts at `opacity: 0` and has not begun to animate.
    const hold = readSeen() === revealKey ? 0 : REVEAL_HOLD * 1000;

    const timer = setTimeout(() => {
      writeSeen(revealKey);
      setRevealed(true);
    }, hold);

    return () => clearTimeout(timer);
  }, [revealKey]);

  return (
    <>
      {/* One persistent status region for the whole screen. A `role="status"`
          added at the same moment as its own text announces nothing, so the
          element has to outlive the swap and only its content may change. */}
      <p role="status" className="sr-only">
        {revealed ? announcement : "Finding your sake."}
      </p>

      <AnimatePresence mode="wait">
        {revealed ? (
          <motion.div
            key="results"
            className="flex flex-1 flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            // Only a fade: the cards inside carry the rise, and doubling it here
            // would read as the whole screen sliding twice.
            transition={{ duration: ITEM_DURATION * 0.6, ease: EASE_SOFT }}
          >
            {children}
          </motion.div>
        ) : (
          <RevealSequence key="reveal" />
        )}
      </AnimatePresence>
    </>
  );
}
