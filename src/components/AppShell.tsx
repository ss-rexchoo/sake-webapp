import type { ReactNode } from "react";

/**
 * The app frame.
 *
 * This is a phone experience reached by QR code at the table, and the phone is
 * still the real device — there is no desktop layout, and there is deliberately
 * no side-by-side or multi-column arrangement at any width. What there IS is a
 * modest step up in the column: 440px on a phone, 480px from `sm`, 512px from
 * `md` and up. A reading-and-deciding flow wants a reading measure, so the
 * column is capped rather than fluid; the old behaviour — one fixed 440px
 * column stranded on a 1440px screen — was not restraint, it was the column
 * refusing to acknowledge the extra room at all.
 *
 * `/admin` opts into a wider cap (576px at `md`) by marking itself with
 * `data-admin-shell`, matched here with `:has()`. It is data-dense and staff
 * dwell on it, so the guest column's measure is the wrong constraint for it.
 * The marker lives in the admin layout rather than in a pathname check because
 * this is a server component in the root layout with no router access, and a
 * CSS-only opt-in costs nothing at runtime.
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
      <div className="mx-auto flex w-full max-w-[27.5rem] flex-1 flex-col px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-[calc(env(safe-area-inset-bottom)+1.75rem)] sm:max-w-[30rem] sm:px-6 md:max-w-[32rem] md:has-[[data-admin-shell]]:max-w-[36rem]">
        {children}
      </div>
    </div>
  );
}
