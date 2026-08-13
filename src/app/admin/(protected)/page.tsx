import Link from "next/link";
import { ArrowUp, Plus } from "lucide-react";

import { StockToggle } from "@/components/admin/StockToggle";
import { PageHeader } from "@/components/PageHeader";
import { repo } from "@/lib/data";
import type { Sake } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Staff sake list — plan v2 §11.
 *
 * Sorted by fridge number, not alphabetically. The person using this screen is
 * standing at the fridge with a bottle in their hand: they know the slot, not
 * always the name. Out-of-stock rows stay in place (they still occupy a slot)
 * and dim rather than disappearing.
 *
 * ── Two presentations of the same rows ──────────────────────────────────────
 * Below `lg` this is the card list it has always been: one tappable row per
 * bottle, name and price, the toggle on the right. That is the phone layout and
 * it is the one that gets used one-handed behind the bar.
 *
 * From `lg` — where `AppShell`'s `data-admin-shell` grant opens the column to
 * 1248px — it becomes a real `<table>`. The data genuinely is tabular and a
 * 576px column was hiding four columns' worth of it (region, prefecture,
 * category) behind an edit page. A table also gives the columns real header
 * association for a screen reader, which a `<ul>` of cards cannot.
 *
 * The two are separate markup, each `hidden` at the other's widths, rather than
 * one list morphing via `display: table` utilities. Applying `display: table` to
 * a `<ul>` strips its list semantics in WebKit and Blink, so the phone layout
 * would quietly lose its accessible structure to serve the desktop one. The
 * cost is that `StockToggle` mounts twice per bottle and one copy is always
 * `display: none`; with a fridge-sized inventory that is a few dozen hidden
 * switches, and each carries nothing but a boolean.
 *
 * The phone markup below is unchanged apart from `lg:hidden` and lifting the
 * gold badge into `FridgeNumber` so both presentations share it. Verified: at
 * 390 and 768 this screen renders zero differing pixels against the version
 * before the table existed.
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

/**
 * The gold slot badge, shared by both presentations so the number a staff member
 * matches against the fridge door looks the same on a phone and on a laptop.
 */
function FridgeNumber({ value }: { value: number }) {
  return (
    <span
      aria-label={`Fridge number ${value}`}
      className="flex size-9 shrink-0 items-center justify-center rounded-md border border-gold/30 bg-gold/15 font-display text-[15px] font-bold text-gold-light tabular-nums"
    >
      {value}
    </span>
  );
}

/**
 * Column headings. Small, muted, uppercase — deliberately *below* the `Kicker`
 * metric (12px / 0.14em / gold-light, as `SakeForm`'s section headings use it).
 * A Kicker names a section and is meant to be read; these only say what each
 * column is, and twelve rows sit under them. Muted rather than gold-light for
 * the same reason: on this screen gold means "fridge number".
 *
 * They are plain `<th>`s, not buttons, and nothing invites a click — no hover
 * state, no cursor change, no focus ring. The list has exactly one useful order
 * and the whole screen is built on it, so the fridge column *states* that order
 * with an arrow and `aria-sort="ascending"` rather than offering re-sorts that
 * would break the scan-by-slot workflow. If a reason to sort by name or price
 * ever appears, this is the component that grows buttons.
 */
function Th({
  children,
  className,
  sorted,
}: {
  children: React.ReactNode;
  className?: string;
  sorted?: boolean;
}) {
  return (
    <th
      scope="col"
      aria-sort={sorted ? "ascending" : undefined}
      // `cn`, not a template string: `text-left` here and `text-right` on the
      // price column are the same specificity, so which one wins is decided by
      // Tailwind's output order rather than by the caller. tailwind-merge drops
      // the base one instead. (Verified: `text-center` on the stock column
      // silently lost before this.)
      className={cn(
        "px-3 py-2.5 text-left text-[10.5px] font-normal tracking-[0.12em] text-muted uppercase",
        className,
      )}
    >
      {sorted ? (
        <span className="inline-flex items-center gap-1 text-gold-light">
          {children}
          <ArrowUp aria-hidden="true" className="size-3" />
        </span>
      ) : (
        children
      )}
    </th>
  );
}

/** `Yamagata · Tōhoku`, degrading to whichever half exists. */
function originOf(sake: Sake, regionNames: Map<string, string>): string[] {
  const region = sake.region_id ? regionNames.get(sake.region_id) : undefined;
  return [sake.prefecture, region].filter(Boolean) as string[];
}

export default async function AdminSakeListPage() {
  const [allSake, regions] = await Promise.all([
    repo.listSake(),
    repo.listRegions(),
  ]);
  const sake = allSake.sort((a, b) => a.fridge_number - b.fridge_number);
  const regionNames = new Map(regions.map((r) => [r.id, r.name]));

  const outOfStock = sake.filter((s) => !s.in_stock).length;

  return (
    <main className="flex flex-1 flex-col">
      {/* Header and the one action sit on separate lines until there is room to
          put them on the same one. `flex flex-col` below `lg`, not a bare block:
          the two used to be direct children of this screen's own flex column and
          so were stretched to full width by `align-items: stretch`. In a block
          wrapper the `inline-flex` action would collapse to its text and the
          phone layout would change — which is the one thing it must not do. */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between lg:gap-8">
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
          className="mb-4 inline-flex items-center justify-center gap-1.5 rounded-lg border border-cream/20 bg-cream/8 py-3 text-[13.5px] text-cream transition-colors hover:bg-cream/16 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none lg:mb-[1.375rem] lg:shrink-0 lg:px-5"
        >
          <Plus aria-hidden="true" className="size-4" />
          Add a sake
        </Link>
      </div>

      {sake.length === 0 ? (
        <p className="rounded-lg border border-cream/12 bg-cream/5 px-3.5 py-6 text-center text-[13px] text-muted">
          No sake on the list yet. Add the first bottle to get the guest app
          working.
        </p>
      ) : (
        <>
          {/* ── Phone and tablet: the card list ── */}
          <ul className="overflow-hidden rounded-lg border border-cream/12 bg-cream/5 lg:hidden">
            {sake.map((s) => (
              <li
                key={s.id}
                className="flex items-stretch gap-1 border-b border-cream/10 pr-3 last:border-b-0"
              >
                <Link
                  href={`/admin/${s.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3 py-3 pr-3 pl-3 transition-colors hover:bg-cream/10 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
                >
                  <FridgeNumber value={s.fridge_number} />

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

          {/* ── Desktop: the table ── */}
          <div className="hidden overflow-hidden rounded-lg border border-cream/12 bg-cream/5 lg:block">
            {/* `table-fixed`: a long sake name must eat into its own column and
                truncate, never push price and the stock toggle off their
                gridlines. Widths are set once on the header row. */}
            <table className="w-full table-fixed border-separate border-spacing-0 text-left">
              <caption className="sr-only">
                Sake inventory, sorted by fridge number, lowest first.
              </caption>
              <thead className="[&_th]:border-b [&_th]:border-cream/12">
                <tr>
                  <Th sorted className="w-[7.5rem]">
                    Fridge
                  </Th>
                  <Th>Sake</Th>
                  {/* Origin and Category are the two cells that can afford to
                      truncate — both are secondary metadata, and the name is
                      what the row is *for*. Trimmed from 13rem and 10.5rem to
                      buy the name column back 56px, which at 1024 takes it from
                      238px to 294px — the difference between "Kubota Manju
                      Junmai Daiginjo" fitting and not. */}
                  <Th className="w-[11rem]">Origin</Th>
                  <Th className="w-[9rem]">Category</Th>
                  <Th className="w-[7.5rem] text-right">Price</Th>
                  <Th className="w-[6.5rem] text-center">Stock</Th>
                </tr>
              </thead>
              <tbody className="[&_td]:border-b [&_td]:border-cream/10 [&_tr:last-child_td]:border-b-0">
                {sake.map((s) => {
                  const origin = originOf(s, regionNames);
                  return (
                    // `relative` so the name cell's link can stretch its
                    // `::after` across the whole row: staff click the slot
                    // number as readily as the name, and a table row cannot
                    // itself be an anchor. The toggle cell is lifted above it.
                    <tr
                      key={s.id}
                      className="relative transition-colors hover:bg-cream/8"
                    >
                      <td className="px-3 py-2.5">
                        <FridgeNumber value={s.fridge_number} />
                      </td>

                      <td className="px-3 py-2.5">
                        <Link
                          href={`/admin/${s.id}`}
                          className="block rounded-md after:absolute after:inset-0 after:rounded-md focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-gold focus-visible:after:ring-inset"
                        >
                          {/* `truncate` lives on the inner span, never on the
                              link: `overflow: hidden` on the link would clip
                              the stretched `::after` back to the name.

                              What a too-long name does, deliberately: with
                              `table-fixed` above it truncates to one line with
                              an ellipsis and the column keeps its width — it
                              does not wrap, does not grow the row, and does not
                              push Price or Stock off their gridlines. Verified
                              with a 79-character name at 1024 and 1440: column
                              widths and row height both unchanged. The seed
                              inventory happens to fit in 294px at 1024, but
                              real inventory will not always, so `title` carries
                              the full name for the hover that costs nothing —
                              this markup only ever renders on a pointer device.
                              The edit page remains the place it is readable in
                              full. */}
                          <span
                            title={s.name_en}
                            className={`block truncate font-display text-[15px] font-bold ${s.in_stock ? "text-cream" : "text-muted"}`}
                          >
                            {s.name_en}
                          </span>
                        </Link>
                        {s.name_jp ? (
                          <span className="mt-0.5 block truncate text-[11.5px] text-muted">
                            {s.name_jp}
                          </span>
                        ) : null}
                      </td>

                      <td className="px-3 py-2.5 text-[12.5px] text-muted">
                        <span className="block truncate">
                          {origin.length === 0 ? "—" : origin[0]}
                        </span>
                        {/* 11.5px, matching the `name_jp` sub-line two cells
                            over: same role, so the same size. */}
                        {origin.length > 1 ? (
                          <span className="mt-0.5 block truncate text-[11.5px]">
                            {origin[1]}
                          </span>
                        ) : null}
                      </td>

                      <td className="px-3 py-2.5 text-[12.5px] text-muted">
                        <span className="block truncate">
                          {s.category || "—"}
                        </span>
                      </td>

                      <td className="px-3 py-2.5 text-right text-[13px] text-cream tabular-nums">
                        {s.price === null ? (
                          <span className="text-muted">—</span>
                        ) : (
                          formatPrice(s.price)
                        )}
                      </td>

                      {/* Above the stretched row link — it is a real control,
                          not a cell you click through to the edit page.
                          `text-center` on the cell, not only `mx-auto` on the
                          toggle: the centring is a property of the column (its
                          header is centred too), so anything that ever joins
                          the toggle in here lands centred rather than left. */}
                      <td className="relative px-2 py-1 text-center">
                        <StockToggle
                          id={s.id}
                          name={s.name_en}
                          inStock={s.in_stock}
                          className="mx-auto pl-0"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
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
