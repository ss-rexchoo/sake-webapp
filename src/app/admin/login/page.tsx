import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/admin/LoginForm";
import { MockAuthBanner } from "@/components/admin/MockAuthBanner";
import { PageHeader } from "@/components/PageHeader";
import { isMockAuth, staffAuth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Staff sign in · Sake Discovery",
  // Back-of-house. Nothing under /admin should ever surface in a search result.
  robots: { index: false, follow: false },
};

/** Only `/admin` paths are accepted, so `?next=` can't be turned into an open redirect. */
function safeNext(value: string | string[] | undefined): string {
  const path = Array.isArray(value) ? value[0] : value;
  return path && path.startsWith("/admin") && !path.startsWith("//")
    ? path
    : "/admin";
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Already signed in — don't make staff look at a login form they don't need.
  if (await staffAuth.getSession()) redirect("/admin");

  const { next } = await searchParams;

  return (
    <main className="flex flex-1 flex-col justify-center">
      <PageHeader
        className="mt-0 mb-5"
        kicker="Back of house"
        title="Staff sign in"
        subtitle="One shared login for everyone working the fridge."
      />

      {isMockAuth ? <MockAuthBanner className="mb-5" /> : null}

      <LoginForm requiresEmail={staffAuth.requiresEmail} next={safeNext(next)} />

      <Link
        href="/"
        className="mt-8 self-start text-[12.5px] text-muted underline underline-offset-4 transition-colors hover:text-cream focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
      >
        Back to the guest app
      </Link>
    </main>
  );
}
