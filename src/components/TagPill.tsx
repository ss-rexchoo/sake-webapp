import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** The prototype's `.tag-pill` — gold-translucent pill for food pairings and taste tags. */
export function TagPill({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-gold/30 bg-gold/15 px-2.5 py-[3px] text-[10.5px] leading-normal text-gold-light",
        className,
      )}
    >
      {children}
    </span>
  );
}
