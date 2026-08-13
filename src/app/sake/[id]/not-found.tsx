import Link from "next/link";
import { Wine } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";

/**
 * Rendered when `repo.getSake` finds nothing for the id in the URL — a stale
 * link passed between phones, or a QR code pointing at a bottle the restaurant
 * has since removed.
 *
 * Scoped to this route rather than left to the app-wide default so a guest who
 * hits it stays inside the experience: same palette, same column, and two ways
 * back into the journey instead of a dead end. No `BackButton` — this is the
 * one screen a guest is likely to arrive at with an empty history (a shared
 * link), and `router.back()` would put them outside the app.
 */
export default function SakeNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center text-center">
      <PageHeader
        align="center"
        kicker="Bottle not found"
        title="That bottle isn't on the list"
        subtitle="The link may be out of date, or the bottle has left the fridge for good. Your server will know what's open tonight."
        className="mb-7"
      />

      <span className="mb-7 flex size-16 items-center justify-center rounded-full border border-cream/20 bg-cream/8">
        <Wine aria-hidden="true" className="size-7 text-muted" />
      </span>

      <div className="flex flex-col items-center gap-3">
        <Link
          href="/taste"
          className="rounded-full bg-vermillion px-5 py-2.5 text-sm text-cream transition-colors duration-200 hover:bg-vermillion-dark focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
        >
          Find my sake
        </Link>
        <Link
          href="/"
          className="rounded-full border border-cream/20 bg-cream/8 px-4 py-2 text-[13px] text-cream transition-colors duration-200 hover:bg-cream/16 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
        >
          Back to start
        </Link>
      </div>
    </main>
  );
}
