"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

import { EASE_SOFT, HOVER_DURATION } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The prototype's `.back-btn` — a translucent cream pill pinned to the top-left
 * of the screen column, above the content.
 *
 * Positioned against `PageTransition`'s `relative` wrapper, so it sits flush
 * with the reading gutter. `PageHeader` reserves the vertical space for it, so
 * a page only has to render `<BackButton />` and its header will clear it.
 *
 * Not rendered on the landing screen — that is the start of the journey.
 */
export function BackButton({ className }: { className?: string }) {
  const router = useRouter();

  return (
    <motion.button
      type="button"
      onClick={() => router.back()}
      whileHover={{
        y: -1,
        transition: { duration: HOVER_DURATION, ease: EASE_SOFT },
      }}
      // Same press feedback as every other control — this is the one a guest
      // reaches for most, so it should not be the one that feels dead.
      whileTap={{ scale: 0.97 }}
      className={cn(
        "absolute top-0 left-0 z-10 inline-flex items-center gap-1.5",
        "rounded-full border border-cream/20 bg-cream/8 py-[7px] pr-3 pl-2.5",
        "text-[13px] text-cream transition-colors duration-200",
        "hover:bg-cream/16 active:bg-cream/16",
        // No `ring-offset` — see the note on the landing method card.
        "focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none",
        className,
      )}
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      Back
    </motion.button>
  );
}
