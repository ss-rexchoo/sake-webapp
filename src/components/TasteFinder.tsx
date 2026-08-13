"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";

import { TasteCompass } from "@/components/TasteCompass";
import { EASE_SOFT, HOVER_DURATION } from "@/lib/motion";
import { tasteQuery } from "@/lib/taste-params";
import type { TastePoint } from "@/lib/types";

const MotionLink = motion.create(Link);

/**
 * The interactive half of `/taste`: the compass plus its one CTA.
 *
 * The CTA is a real `<Link>`, not a button that pushes a route — so Next
 * prefetches the results screen while the guest is still deciding, and the
 * reveal starts the moment the finger lifts instead of after a cold fetch.
 * `point` lives here only to keep that href current; the compass owns the
 * dot's actual position (see its `defaultValue` note).
 */
export function TasteFinder({ initial }: { initial: TastePoint }) {
  const [point, setPoint] = useState<TastePoint>(initial);

  const handleChange = useCallback((next: TastePoint) => setPoint(next), []);

  return (
    // Optically centred in whatever the header leaves, with a slight top bias —
    // the same rule as the landing screen. Top-aligning strands the pad in the
    // upper half of a tall phone and pushes the CTA out of one-handed reach.
    // `safe` centring keeps the pad reachable if the block ever exceeds the
    // viewport (landscape, large type), where `justify-center` would clip it.
    <div className="flex flex-1 flex-col [justify-content:safe_center] pb-[8vh]">
      <TasteCompass defaultValue={initial} onChange={handleChange} />

      <MotionLink
        href={`/taste/results?${tasteQuery(point)}`}
        // Press feedback is the button physically giving under the thumb, not a
        // colour flash — the same gesture language as every other control here.
        whileTap={{ scale: 0.97 }}
        whileHover={{
          y: -1,
          transition: { duration: HOVER_DURATION, ease: EASE_SOFT },
        }}
        transition={{ duration: HOVER_DURATION, ease: EASE_SOFT }}
        className={
          "mt-[26px] block w-full rounded-full bg-vermillion py-3.5 text-center " +
          "text-[15px] font-bold text-cream transition-colors duration-200 " +
          "hover:bg-vermillion-dark " +
          // No `ring-offset` — see the note on the landing method card.
          "focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
        }
      >
        Reveal my sake
      </MotionLink>
    </div>
  );
}
