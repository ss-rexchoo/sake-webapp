import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";

import { signOutAction } from "@/app/actions/admin";
import { MockAuthBanner } from "@/components/admin/MockAuthBanner";
import { Kicker } from "@/components/Kicker";
import { Toaster } from "@/components/ui/sonner";
import { isMockAuth, requireStaffSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Staff admin · Sake Discovery",
  robots: { index: false, follow: false },
};

/**
 * The gate and the chrome for every signed-in admin screen.
 *
 * `/admin/login` deliberately sits *outside* this route group, so the guard can
 * be unconditional here: reaching this layout at all means there is a session.
 * `src/proxy.ts` redirects first so a protected page never starts rendering, but
 * this check is the one that is authoritative — a server-side check, never a
 * client-side redirect, which would ship the page before hiding it.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireStaffSession();

  return (
    // `data-admin-shell` is read by `AppShell` (via `:has()`) to widen the
    // column for these screens only. Staff dwell here on a counter tablet or a
    // back-office laptop reading a dense list, so the guest reading measure is
    // the wrong cap — but it is still one column, not a table or a split view.
    <div data-admin-shell className="flex flex-1 flex-col">
      <div className="flex items-start justify-between gap-3">
        <Link
          href="/admin"
          className="rounded-sm focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
        >
          <Kicker>Sake admin</Kicker>
          {session.email ? (
            <span className="mt-0.5 block text-[11.5px] text-muted">
              {session.email}
            </span>
          ) : null}
        </Link>

        <form action={signOutAction}>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-full border border-cream/20 bg-cream/8 py-2 pr-3.5 pl-3 text-[12.5px] text-cream transition-colors hover:bg-cream/16 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
          >
            <LogOut aria-hidden="true" className="size-3.5" />
            Sign out
          </button>
        </form>
      </div>

      {isMockAuth ? (
        <MockAuthBanner variant="compact" className="mt-3.5" />
      ) : null}

      {children}

      {/* Scoped to admin: the guest journey has no toasts to show. */}
      <Toaster position="top-center" richColors={false} />
    </div>
  );
}
