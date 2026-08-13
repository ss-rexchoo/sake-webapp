import { redirect } from "next/navigation";

import { isPasswordAuthConfigured } from "./config";
import { mockAuth } from "./mock";
import { passwordAuth } from "./staff";
import type { StaffAuth, StaffSession } from "./types";

/**
 * The one-line swap, mirroring `src/lib/data/index.ts`. With
 * `ADMIN_PASSWORD_HASH` present, `/admin` is behind the real shared staff
 * password; without it, it is behind the development stand-in, and every admin
 * screen says so.
 */
export const staffAuth: StaffAuth = isPasswordAuthConfigured()
  ? passwordAuth
  : mockAuth;

/** True when `/admin` is guarded by the development stand-in, not real auth. */
export const isMockAuth = staffAuth.mode === "mock";

/** Where an unauthenticated request to an admin screen is sent. */
export const ADMIN_LOGIN_PATH = "/admin/login";

/**
 * The authoritative gate. Called from the protected admin layout *and* from
 * every server action — Next's own docs warn that a proxy `matcher` does not
 * reliably cover Server Function POSTs, so the guard cannot live only there.
 */
export async function requireStaffSession(): Promise<StaffSession> {
  const session = await staffAuth.getSession();
  if (!session) redirect(ADMIN_LOGIN_PATH);
  return session;
}

export type { AuthMode, SignInResult, StaffAuth, StaffSession } from "./types";
