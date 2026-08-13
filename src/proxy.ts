import { NextResponse, type NextRequest } from "next/server";

import {
  ADMIN_SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  sessionSecret,
} from "@/lib/auth/config";
import { verifySessionToken } from "@/lib/auth/token";

/**
 * Route guard for `/admin`.
 *
 * Next 16 deprecated the `middleware.js` file convention and renamed it to
 * `proxy.js` — same behaviour, same request-time position, new name. This is
 * that file.
 *
 * The `matcher` is scoped to `/admin/:path*` so the guest QR journey (landing,
 * taste, map, search, detail) never runs a single line of this. That matters:
 * the whole point of §16 is that the QR page loads fast on restaurant wifi.
 *
 * This is the *first* of two gates, not the only one. It redirects before a
 * protected page renders so nothing leaks, but the authoritative check is
 * `requireStaffSession()` in the protected layout and in every server action —
 * Next's own docs note that Server Function POSTs can slip out of a matcher's
 * coverage when routes move.
 *
 * Real and mock mode share one cookie format, so unlike the Supabase-era version
 * this file has a single code path: verify the signed token against whichever
 * secret `sessionSecret()` yields for the current mode. Nothing here imports
 * `node:crypto`, `pg` or anything Node-only — `token.ts` is Web Crypto and
 * `config.ts` is plain environment reads, so this keeps working wherever the
 * proxy runs.
 */

export const config = {
  matcher: ["/admin/:path*"],
};

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = "";
  // Remembered so staff land back on the screen they asked for. Read back only
  // if it is an /admin path — see `safeNextPath` in the login page.
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The login screen is the one admin route that must stay reachable.
  if (pathname === "/admin/login") return NextResponse.next();

  const valid = await verifySessionToken(
    request.cookies.get(ADMIN_SESSION_COOKIE)?.value,
    sessionSecret(),
    SESSION_MAX_AGE_SECONDS,
  );

  return valid ? NextResponse.next() : redirectToLogin(request);
}
