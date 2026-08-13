"use client";

import { useActionState } from "react";

import { signInAction } from "@/app/actions/admin";
import { EMPTY_SIGN_IN_STATE } from "@/app/actions/admin-types";
import { Field } from "@/components/admin/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * The one shared staff login (plan v2 §11 — no per-user accounts in v1).
 *
 * Neither mode collects an email today: v1 is one shared password with no
 * account behind it, so asking for one would be theatre. `requiresEmail` stays
 * in the interface for the day §11's "no per-user accounts yet" stops being
 * true, and the field renders itself the moment an implementation sets it.
 */
export function LoginForm({
  requiresEmail,
  next,
}: {
  requiresEmail: boolean;
  next: string;
}) {
  const [state, formAction, pending] = useActionState(
    signInAction,
    EMPTY_SIGN_IN_STATE,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />

      {requiresEmail ? (
        <Field label="Staff account email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            className="h-11"
          />
        </Field>
      ) : null}

      <Field
        label="Staff password"
        htmlFor="password"
        error={state.error ?? undefined}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "password-error" : undefined}
          className="h-11"
        />
      </Field>

      <Button
        type="submit"
        disabled={pending}
        className="h-11 w-full text-[15px] font-normal"
      >
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
