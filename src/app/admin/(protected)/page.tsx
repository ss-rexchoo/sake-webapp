import Link from "next/link";
import { Plus } from "lucide-react";

import { StockToggle } from "@/components/admin/StockToggle";
import { PageHeader } from "@/components/PageHeader";
import { repo } from "@/lib/data";

/**
 * Staff sake list — plan v2 §11.
 *
 * Sorted by fridge number, not alphabetically. The person using this screen is
 * standing at the fridge with a bottle in their hand: they know the slot, not
 * always the name. Out-of-stock rows stay in place (they still occupy a slot)
 * and dim rather than disappearing.
 */
/**
 * `RM 145` — the same MYR formatting the guest-facing `FridgeBadge` uses, so a
 * price reads identically on both sides of the counter. Duplicated rather than
 * imported because the guest one is a private helper in a component this piece
 * does not own; if a third caller appears, lift it into `src/lib`.
 */
function formatPrice(price: number): string {
  return `RM ${new Intl.NumberFormat("en-MY", {
    maximumFractionDigits: 2,
  }).format(price)}`;
}

export default async function AdminSakeListPage() {
  const sake = (await repo.listSake()).sort(
    (a, b) => a.fridge_number - b.fridge_number,
  );

  const outOfStock = sake.filter((s) => !s.in_stock).length;

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        className="mt-6 mb-4"
        title="Sake inventory"
        subtitle={
          sake.length === 0
            ? "Nothing on the list yet."
            : `${sake.length} bottle${sake.length === 1 ? "" : "s"} · by fridge number${
                outOfStock > 0 ? ` · ${outOfStock} out of stock` : ""
              }`
        }
      />

      <Link
        href="/admin/new"
        // Neutral, not gold. Gold on this screen means "fridge number" — it is
        // the guest side's badge accent and it is on every one of these rows.
        // A CTA sharing that exact fill made the one action on the page
        // indistinguishable from a row identifier repeated thirty times.
        className="mb-4 inline-flex items-center justify-center gap-1.5 rounded-lg border border-cream/20 bg-cream/8 py-3 text-[13.5px] text-cream transition-colors hover:bg-cream/16 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
      >
        <Plus aria-hidden="true" className="size-4" />
        Add a sake
      </Link>

      {sake.length === 0 ? (
        <p className="rounded-lg border border-cream/12 bg-cream/5 px-3.5 py-6 text-center text-[13px] text-muted">
          No sake on the list yet. Add the first bottle to get the guest app
          working.
        </p>
      ) : (
        <ul className="overflow-hidden rounded-lg border border-cream/12 bg-cream/5">
          {sake.map((s) => (
            <li
              key={s.id}
              className="flex items-stretch gap-1 border-b border-cream/10 pr-3 last:border-b-0"
            >
              <Link
                href={`/admin/${s.id}`}
                className="flex min-w-0 flex-1 items-center gap-3 py-3 pr-3 pl-3 transition-colors hover:bg-cream/10 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
              >
                <span
                  aria-label={`Fridge number ${s.fridge_number}`}
                  className="flex size-9 shrink-0 items-center justify-center rounded-md border border-gold/30 bg-gold/15 font-display text-[15px] font-bold text-gold-light tabular-nums"
                >
                  {s.fridge_number}
                </span>

                <span className="min-w-0 flex-1">
                  {/* Display serif, as on the guest `ResultCard` and on this
                      record's own edit-page title. A sake name should look the
                      same on both sides of the counter. */}
                  <span
                    className={`block truncate font-display text-base font-bold ${s.in_stock ? "text-cream" : "text-muted"}`}
                  >
                    {s.name_en}
                  </span>
                  <span className="mt-0.5 block truncate text-[11.5px] text-muted">
                    {[s.name_jp, s.category].filter(Boolean).join(" · ") ||
                      "No category set"}
                  </span>
                </span>

                {/* No chevron: the row is obviously tappable, and the 20px it
                    costs comes straight out of a name that already truncates. */}
                <span className="shrink-0 text-[12.5px] text-muted tabular-nums">
                  {s.price === null ? "—" : formatPrice(s.price)}
                </span>
              </Link>

              <StockToggle
                id={s.id}
                name={s.name_en}
                inStock={s.in_stock}
                className="border-l border-cream/10 pr-1 pl-3"
              />
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/"
        className="mt-6 self-start text-[12.5px] text-muted underline underline-offset-4 transition-colors hover:text-cream focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
      >
        Open the guest app
      </Link>
    </main>
  );
}
