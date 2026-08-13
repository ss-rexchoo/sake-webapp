/**
 * Display formatting shared across the guest journey and the admin desk.
 *
 * Small on purpose. The rule this file exists to enforce is that a price is
 * rendered by exactly one function: `FridgeBadge` (the detail page), the result
 * cards on `/taste/results`, `/search` and the map panel, and the admin
 * inventory list all read the same number off the same row, and a guest holding
 * the phone next to a staff member looking at the same bottle must see the same
 * string. Two formatters is how "RM 145" and "RM145.00" ship in the same app.
 */

/**
 * `RM 175`.
 *
 * MYR, but written as a plain prefix rather than via `style: "currency"`: the
 * currency style emits "RM 175.00" with trailing zeros on every whole-ringgit
 * price, and a restaurant list is all whole ringgit. `maximumFractionDigits: 2`
 * keeps the cents if a price ever has them.
 *
 * The locale is pinned to `en-MY` rather than left to the runtime, so the server
 * render and the client hydration produce byte-identical strings — an unpinned
 * locale is a hydration mismatch waiting for the first guest whose phone is set
 * to de-DE and sees "RM 1.145".
 */
export function formatPrice(price: number): string {
  return `RM ${new Intl.NumberFormat("en-MY", {
    maximumFractionDigits: 2,
  }).format(price)}`;
}
