import type { ReactNode } from "react";

/**
 * One labelled control in an admin form: label, control, optional hint, optional
 * inline error. Every admin field goes through this, so the label size, the
 * cream/muted split (label is cream, hint is muted) and the error treatment are
 * decided once rather than per screen.
 *
 * Deliberately a plain `<label>` and not the shadcn `Label` primitive: `Label`
 * ships `font-medium`, a weight this two-weight system (400/700) does not load,
 * and every use would have to override it back to 400.
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] text-cream">
        {label}
      </label>
      {children}
      {hint ? <p className="text-[11.5px] text-muted">{hint}</p> : null}
      {/* `role="alert"` announces the error the moment it appears; the id is
          what lets a control point `aria-describedby` at it, so tabbing back to
          an invalid field still says why. Callers pass
          `aria-describedby={`${htmlFor}-error`}` when they have an error. */}
      {error ? (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="text-[12px] text-vermillion-light"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
