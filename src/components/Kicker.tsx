import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The prototype's `.kicker` — small uppercase gold-light label that sits above a
 * hero or section title ("Your matches", the venue line on landing).
 */
export function Kicker({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-xs tracking-[0.14em] text-gold-light uppercase",
        className,
      )}
    >
      {children}
    </p>
  );
}
