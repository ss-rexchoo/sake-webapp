/**
 * The seam between the admin screens and whatever is actually checking
 * credentials — the same split as `SakeRepository` in `src/lib/data`.
 */

export type AuthMode = "password" | "mock";

export interface StaffSession {
  /**
   * Reserved for the day §11's "no per-user accounts yet" stops being true.
   * Null in both modes today — the v1 login is one shared password with no
   * account behind it.
   */
  email: string | null;
  mode: AuthMode;
}

export type SignInResult = { ok: true } | { ok: false; error: string };

export interface StaffAuth {
  /** Which implementation this is. Drives the mock-mode warning banner. */
  readonly mode: AuthMode;
  /** Whether the sign-in form needs to collect an email address. */
  readonly requiresEmail: boolean;

  /** Reads the current session server-side. Never trust a client for this. */
  getSession(): Promise<StaffSession | null>;

  signIn(credentials: {
    email?: string;
    password: string;
  }): Promise<SignInResult>;

  signOut(): Promise<void>;
}
