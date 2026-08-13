import { TriangleAlert } from "lucide-react";

import { DEFAULT_DEV_PASSWORD } from "@/lib/auth/config";

/**
 * Rendered on every admin screen — sign-in included — while `/admin` is behind
 * the development stand-in rather than a real password hash.
 *
 * The wording is deliberately blunt. A restaurant owner glancing at this screen
 * must not be able to read it as "we have a login, we're fine". It names what is
 * missing and what has to happen before service.
 *
 * Two variants, because unmissable-once and shouting-forever are different jobs:
 *  - `full` on the sign-in screen. That is the moment somebody is deciding
 *    whether this login is real, and they get the whole paragraph.
 *  - `compact` on the working screens, where the banner sits above every page
 *    title all shift. A four-line vermillion block there would out-mass the
 *    `<h1>` on every screen and be tuned out inside a day — which is the one
 *    failure mode a warning cannot afford.
 *
 * Same border, fill and text colour in both, so it never reads as decoration.
 */
export function MockAuthBanner({
  variant = "full",
  className,
}: {
  variant?: "full" | "compact";
  className?: string;
}) {
  return (
    <div
      role="status"
      // The same vermillion notice surface the guest-side FridgeBadge uses for
      // its out-of-stock message (border /45, fill /15) — one alert treatment
      // across both sides of the counter, not a near-miss per screen.
      className={`flex gap-2.5 rounded-lg border border-vermillion/45 bg-vermillion/15 px-3 py-2.5 text-[12px] leading-relaxed text-vermillion-light ${className ?? ""}`}
    >
      <TriangleAlert aria-hidden="true" className="mt-px size-4 shrink-0" />
      {variant === "compact" ? (
        <p>
          <span className="font-bold">
            Development sign-in — not real security.
          </span>{" "}
          Set a real staff password before service.
        </p>
      ) : (
        <p>
          <span className="font-bold">
            Development sign-in — not real security.
          </span>{" "}
          This login checks one shared password from a local environment variable
          (default{" "}
          {/* Explicitly font-body: a bare <code> falls back to the browser's
              monospace, which would be a third typeface in a two-font system. */}
          <code className="rounded-sm bg-cream/10 px-1 font-body">
            {DEFAULT_DEV_PASSWORD}
          </code>
          ). There is no account and no audit trail, and the password is a
          published default. Set <code className="rounded-sm bg-cream/10 px-1 font-body">
            ADMIN_PASSWORD_HASH
          </code>{" "}
          before this goes live in the restaurant.
        </p>
      )}
    </div>
  );
}
