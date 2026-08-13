"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Wine, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { ResultBadge, ResultCard } from "@/components/ResultCard";
import { filterRows, type SearchRow } from "@/components/search/match";
import { Input } from "@/components/ui/input";
import { EASE_SOFT, HOVER_DURATION, STAGGER_STEP } from "@/lib/motion";

const MotionLink = motion.create(Link);

/**
 * How long typing has to settle before the URL and the live region catch up.
 *
 * The *list* is never debounced — it filters on the keystroke, because that
 * responsiveness is the whole reason the catalogue is on the client. Only the
 * two things that would be noise at typing speed wait: the address bar, and the
 * screen-reader announcement, which would otherwise read out a new count for
 * every letter of "Hakkaisan".
 */
const SETTLE_MS = 400;

function describeResults(count: number, hasQuery: boolean): string {
  if (!hasQuery) {
    return count === 1 ? "Showing 1 sake." : `Showing all ${count} sake.`;
  }
  if (count === 0) return "No sake match your search.";
  if (count === 1) return "1 sake matches your search.";
  return `${count} sake match your search.`;
}

export function SearchScreen({
  rows,
  initialQuery,
}: {
  /** The whole catalogue, in-stock first. Flattened on the server. */
  rows: SearchRow[];
  /** From `?q=` — so a shared link renders its results server-side. */
  initialQuery: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState(initialQuery);

  /**
   * Stagger is an *arrival* device, not a filtering device. On first paint the
   * cascade tells the guest the list is landing; on the ninth keystroke it turns
   * a live filter into a slot machine, because every row that re-enters the list
   * would queue up behind the ones before it. So the stagger is spent once, on
   * mount, and every row that mounts after the guest starts typing simply fades
   * in on its own — same duration, no delay.
   */
  const [hasTyped, setHasTyped] = useState(false);

  const trimmed = query.trim();
  const results = filterRows(rows, query);
  const matchCount = results.length;
  const hasQuery = trimmed.length > 0;

  const [announcement, setAnnouncement] = useState(() =>
    describeResults(filterRows(rows, initialQuery).length, initialQuery.trim().length > 0),
  );

  /*
   * The query lives in the URL so a result is shareable and reloadable — a
   * guest can hand the phone across the table on `?q=dassai` and the server
   * renders that list rather than the whole fridge.
   *
   * `history.replaceState`, not `router.push`: pushing would bury the landing
   * screen under one history entry per keystroke, so Back would walk the guest
   * backwards through their own typing instead of returning to the three ways
   * in. `replaceState` over `router.replace` because the client already holds
   * the data — this is address-bar bookkeeping, not a navigation, and it should
   * not cost a server round-trip.
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      const url = new URL(window.location.href);
      if (trimmed) {
        url.searchParams.set("q", trimmed);
      } else {
        url.searchParams.delete("q");
      }
      if (url.href !== window.location.href) {
        window.history.replaceState(null, "", url);
      }

      setAnnouncement(describeResults(matchCount, trimmed.length > 0));
    }, SETTLE_MS);

    return () => clearTimeout(timer);
  }, [trimmed, matchCount]);

  return (
    <>
      {/*
       * One persistent status region, mounted for the life of the screen and
       * only ever changing its text — a `role="status"` that appears at the same
       * moment as its own content announces nothing.
       */}
      <p role="status" className="sr-only">
        {announcement}
      </p>

      <div role="search" className="relative mb-[1.125rem]">
        <label htmlFor={inputId} className="sr-only">
          Search sake by name, brewery, or prefecture
        </label>

        <Input
          id={inputId}
          ref={inputRef}
          type="search"
          /*
           * No `autoFocus`. On a 390px phone it would throw the keyboard up over
           * the catalogue the instant the screen loads — and the catalogue is
           * the point: a guest who taps Search often wants to browse the fridge,
           * not type. The field is the first thing under the title and one tap
           * away, so the cost of asking for it is a tap and the cost of forcing
           * it is half the screen.
           */
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setHasTyped(true);
          }}
          placeholder="e.g. Dassai, Niigata, Junmai…"
          className={
            // The prototype's `.search-input`: translucent cream surface, ~12px
            // radius (`rounded-md` = 0.7 x --radius = 11.2px), cream text, muted
            // placeholder, gold border on focus and no ring — the border *is*
            // the focus mark here, so a second gold halo would double it.
            "h-12 rounded-md border-cream/20 bg-cream/8 px-3.5 pr-11 text-cream " +
            "placeholder:text-muted " +
            // 200ms, not shadcn's unqualified `transition-colors` (150ms): the
            // border warming to gold on focus runs on the same clock as every
            // other surface in the app.
            "duration-200 " +
            "focus-visible:border-gold focus-visible:ring-0 " +
            // WebKit's own clear affordance is a UA-coloured glyph that reads as
            // a smudge on this palette; the button below replaces it.
            "[&::-webkit-search-cancel-button]:appearance-none"
          }
        />

        {/*
         * Faded, not popped. This is the one control on the screen that
         * materialises under the guest's eye mid-gesture — on the first
         * keystroke, and again at the far right of the field as the list
         * re-expands on clear. Every other control in the app eases; a hard
         * pop in peripheral vision reads as a rendering glitch. 200ms is the
         * app's gesture clock (`HOVER_DURATION`), so the button answers the
         * finger on the same timeline as the field it sits in.
         */}
        <AnimatePresence>
          {hasQuery ? (
            <motion.button
              key="clear"
              type="button"
              onClick={() => {
                setQuery("");
                setHasTyped(true);
                inputRef.current?.focus();
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: HOVER_DURATION, ease: EASE_SOFT }}
              whileTap={{ scale: 0.9 }}
              aria-label="Clear search"
              // `inset-y-0` rather than a translate: Motion writes `transform`
              // for `whileTap`, which would overwrite a `-translate-y-1/2`
              // class and drop the button half a field on press.
              className={
                "absolute inset-y-0 right-1 flex w-10 items-center justify-center " +
                "rounded-full text-muted transition-colors duration-200 " +
                "hover:text-cream focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
              }
            >
              <X aria-hidden="true" className="size-4" />
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>

      {matchCount === 0 ? (
        <EmptyState query={trimmed} catalogueEmpty={rows.length === 0} />
      ) : (
        <ul className="flex flex-col gap-3">
          {results.map((row, index) => (
            <li key={row.id} className="flex">
              <ResultCard
                id={row.id}
                name={row.name}
                sub={
                  <>
                    {[row.prefecture, row.category].filter(Boolean).join(" · ")}
                    {row.inStock ? null : (
                      // Shown, not hidden: a guest typing a name they saw on the
                      // menu deserves "we have it, it's out" rather than a
                      // no-results screen that reads as a broken search. The row
                      // still links through — the detail page carries the bottle's
                      // full story — but nothing here implies it is in the fridge.
                      // `text-muted`, the app's one secondary-text token, and
                      // the same colour `FridgeBadge` gives its out-of-stock
                      // label. A cream tint at this luminance is a near-miss on
                      // --muted in a different hue, sitting 4px under a --muted
                      // line — two greys that read as one mistake.
                      <span className="mt-1 block text-[11px] text-muted">
                        Not in the fridge tonight
                      </span>
                    )}
                  </>
                }
                badge={
                  <ResultBadge tone="muted">
                    <Wine
                      aria-hidden="true"
                      className={
                        row.inStock ? "size-5 text-gold-light" : "size-5 text-muted"
                      }
                    />
                  </ResultBadge>
                }
                index={index}
                staggerStep={hasTyped ? 0 : STAGGER_STEP}
                className={
                  row.inStock
                    ? "w-full"
                    : // Unfilled, not dimmer-filled. 6% -> 3% cream over the
                      // indigo is about seven RGB levels across a 12px gap —
                      // invisible on a phone, so the row would have paid for a
                      // variant it never shows. Dropping the fill entirely is
                      // the same categorical move `FridgeBadge` makes when a
                      // bottle is out (gold gradient -> outlined block): filled
                      // vs outlined reads instantly, and because the list is
                      // sorted in-stock first, it draws one clean line under
                      // what the guest can actually drink tonight.
                      "w-full border-cream/12 bg-transparent hover:bg-cream/6"
                }
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * The honest empty state.
 *
 * Same shape as the low-confidence header on the results screen: a gold hairline
 * rather than a bordered panel, because a tinted box at this width lands within
 * a few percent of a `ResultCard` and would read as a result. Gold, not
 * vermillion — vermillion is the action colour, and nothing has gone wrong here.
 *
 * It says the miss plainly, offers the one fix that lives inside search
 * (spelling, or a broader term), and then hands the guest back to the other two
 * ways in. Search is the path that only helps someone who already has a name; if
 * the name isn't here, the answer is not a better query, it's a different door.
 */
function EmptyState({
  query,
  catalogueEmpty,
}: {
  query: string;
  catalogueEmpty: boolean;
}) {
  return (
    <div className="mt-2 text-center">
      <span aria-hidden="true" className="mx-auto mb-3.5 block h-px w-10 bg-gold/45" />

      {catalogueEmpty ? (
        <>
          <h2 className="font-display text-lg leading-snug font-bold">
            Nothing&rsquo;s in the fridge tonight
          </h2>
          <p className="mx-auto mt-1.5 max-w-[19rem] text-[13px] leading-relaxed text-muted">
            Every bottle is out of stock right now. Your server will know what
            else is open.
          </p>
        </>
      ) : (
        <>
          <h2 className="font-display text-lg leading-snug font-bold">
            No bottle by that name
          </h2>
          <p className="mx-auto mt-1.5 max-w-[19rem] text-[13px] leading-relaxed text-muted">
            We couldn&rsquo;t find{" "}
            <span className="text-cream">&ldquo;{query}&rdquo;</span> in tonight&rsquo;s
            fridge. Try the brewery or the prefecture on its own &mdash; or let us
            find you something instead.
          </p>
        </>
      )}

      <div className="mt-5 flex flex-wrap justify-center gap-2.5">
        <EmptyStateLink href="/taste">Find my sake</EmptyStateLink>
        <EmptyStateLink href="/map">Explore by region</EmptyStateLink>
      </div>
    </div>
  );
}

/** The app's secondary pill — same control as "Adjust my taste" on the results screen. */
function EmptyStateLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <MotionLink
      href={href}
      whileHover={{ y: -1, transition: { duration: HOVER_DURATION, ease: EASE_SOFT } }}
      whileTap={{ scale: 0.97 }}
      className={
        "inline-flex items-center rounded-full border border-cream/20 bg-cream/8 " +
        "px-4 py-2 text-[13px] text-cream transition-colors duration-200 " +
        "hover:bg-cream/16 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
      }
    >
      {children}
    </MotionLink>
  );
}
