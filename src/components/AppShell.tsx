import type { ReactNode } from "react";

/**
 * The app frame.
 *
 * The phone is still the real device — a guest scans a QR code at the table —
 * so the phone column is the default and every screen is designed at 390px
 * first: 440px on a phone, 480px from `sm`, 512px from `md`.
 *
 * ── Three container widths, opted into per screen ───────────────────────────
 * A single narrow column everywhere left 512px of content stranded in a 1440px
 * screen — about a third of the width, two thirds empty. But widening
 * everything is the wrong correction: a reading-and-deciding flow wants a
 * reading measure, and the two screens the product is actually built around get
 * WORSE with width. So width is opt-in, per screen, via a data attribute
 * matched with `:has()`:
 *
 *   (default)          compass, reveal/results, sake detail, 404
 *                      Stays a narrow column at every width. The taste compass
 *                      is a single object you drag — stretching it across
 *                      1400px makes it harder to use, not better. The fridge
 *                      badge's whole claim is dominating a narrow column; widen
 *                      the column and the badge stops winning the page.
 *
 *   data-wide-shell    landing, search, map
 *                      Screens that are a LIST or a MAP rather than a single
 *                      decision. Three method cards want to be a row; search
 *                      results want a grid; the map wants its panel beside it.
 *                      The screens themselves lay out their own columns — this
 *                      only grants them the room.
 *
 *   data-admin-shell   /admin
 *                      Back-of-house inventory. Staff dwell on it and it is
 *                      genuinely tabular, so it takes the most width.
 *
 * The markers live in each screen rather than in a pathname check here: this is
 * a server component in the root layout with no router access, and a CSS-only
 * opt-in costs nothing at runtime. A screen that sets nothing stays narrow,
 * which is the safe default.
 *
 * The surround at wide viewports is handled in `globals.css`, not here: the
 * radial wash recentres over the column and a vignette settles the far edges,
 * both painted on `body` so no extra element enters the z-order.
 *
 * Two nested boxes on purpose:
 *  - the outer one absorbs the left/right safe-area insets (notch in landscape)
 *  - the inner one is the width-capped column that carries the reading gutter
 *    and the top/bottom safe-area padding, and acts as the positioning context
 *    for anything absolutely placed against the screen edge (e.g. BackButton,
 *    via the `relative` wrapper inside PageTransition).
 *
 * The outer box is `relative z-10` for one reason: `SeasonalAmbience` paints a
 * fixed, full-viewport canvas at `z-0` behind the app. Stated explicitly rather
 * than left to the default painting order, where a positioned element beats
 * in-flow content regardless of source order and the petals would land on top
 * of the page. Everything the guest touches lives above this line.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-10 flex min-h-full flex-1 flex-col pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <div className="mx-auto flex w-full max-w-[27.5rem] flex-1 flex-col px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-[calc(env(safe-area-inset-bottom)+1.75rem)] sm:max-w-[30rem] sm:px-6 md:max-w-[32rem] md:has-[[data-wide-shell]]:max-w-[48rem] md:has-[[data-admin-shell]]:max-w-[48rem] lg:has-[[data-wide-shell]]:max-w-[68rem] lg:has-[[data-admin-shell]]:max-w-[78rem] lg:has-[[data-admin-shell]]:px-8 lg:has-[[data-wide-shell]]:px-8">
        {children}
      </div>
    </div>
  );
}
