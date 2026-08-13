"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { setStockAction } from "@/app/actions/admin";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/**
 * Back-of-house sizing for the shadcn `Switch`, which ships at a desktop-density
 * 32×18.4px — the smallest control in the product, on the edit staff make most.
 *
 * The track goes to 44×24 and the thumb to 22px, which is exactly what the
 * primitive's own `translate-x-[calc(100%-2px)]` needs to land the thumb flush
 * at both ends (track content 44 − 2px border = 42px = 20 travel + 22 thumb).
 *
 * The `!`s are not laziness, and they were verified against the emitted CSS
 * rather than assumed: the primitive's own sizes are arbitrary values
 * (`h-[18.4px]`, `w-[32px]`) which Tailwind sorts *after* named ones, so an
 * equal-specificity `h-6` silently loses; and the thumb size arrives through a
 * `group-data-[size=default]/switch:` selector that outranks anything a
 * `className` on the root can produce. `ui/switch.tsx` is shared with other work
 * in flight, so it cannot grow a `size="lg"` here.
 */
export const ADMIN_SWITCH =
  "data-[size=default]:h-6! data-[size=default]:w-11! [&_[data-slot=switch-thumb]]:size-[22px]!";

/**
 * The inline in-stock switch on the staff list.
 *
 * Running out of a bottle mid-service is the most frequent thing that happens
 * behind the bar, so it is the one edit that should never cost a page load.
 *
 * `useOptimistic` rather than local state: the switch flips under the finger,
 * and when the server action's `revalidatePath` re-renders the list the value
 * snaps back to whatever the database actually says — including on failure.
 */
export function StockToggle({
  id,
  name,
  inStock,
  className,
}: {
  id: string;
  name: string;
  inStock: boolean;
  className?: string;
}) {
  const [optimisticInStock, setOptimisticInStock] = useOptimistic(inStock);
  const [, startTransition] = useTransition();

  return (
    <label
      className={cn(
        "flex shrink-0 cursor-pointer flex-col items-center gap-1 py-3 pl-2",
        className,
      )}
    >
      <Switch
        className={ADMIN_SWITCH}
        checked={optimisticInStock}
        aria-label={`${name} in stock`}
        onCheckedChange={(next) => {
          startTransition(async () => {
            setOptimisticInStock(next);
            const result = await setStockAction(id, next);
            if (!result.ok) {
              toast.error(result.error ?? "Could not update stock.");
            }
          });
        }}
      />
      <span
        className={cn(
          "text-[10px] tracking-[0.08em] uppercase",
          optimisticInStock ? "text-muted" : "text-vermillion-light",
        )}
      >
        {optimisticInStock ? "In" : "Out"}
      </span>
    </label>
  );
}
