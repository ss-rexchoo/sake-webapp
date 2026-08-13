import type { ReactNode } from "react";

import { Kicker } from "@/components/Kicker";
import { cn } from "@/lib/utils";

/**
 * The prototype's `.page-title` / `.page-sub` pair, with an optional kicker.
 *
 * The top margin is the prototype's 46px — it is what clears the absolutely
 * positioned `BackButton`, so every non-landing screen gets consistent chrome
 * spacing without thinking about it.
 *
 * Renders the screen's single `<h1>`: each route is its own document, so the
 * page title is the top of the heading outline (landing is the exception — its
 * hero carries the `<h1>` instead).
 */
export function PageHeader({
  kicker,
  title,
  subtitle,
  align = "left",
  className,
}: {
  kicker?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <header
      className={cn(
        "mt-[2.875rem] mb-[1.375rem]",
        align === "center" && "text-center",
        className,
      )}
    >
      {kicker ? <Kicker className="mb-1">{kicker}</Kicker> : null}
      {/* One step up from `md`, where the column has grown to 512px — 22 → 25px
          is the same ~1.14 ratio the hero and the sake name take, so the three
          headings stay in proportion to each other at every width. Weight and
          family never change; only the size does. */}
      <h1 className="font-display text-[22px] leading-snug font-bold md:text-[25px]">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-1.5 text-[13px] text-muted">{subtitle}</p>
      ) : null}
    </header>
  );
}
