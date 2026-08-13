/**
 * Shapes passed between the admin server actions and the forms that call them.
 *
 * Split out of `admin.ts` because a `"use server"` module may only export async
 * functions — the initial-state constants below would make the whole file fail
 * to load at runtime.
 */

// ─── Sign in ────────────────────────────────────────────────────────────────

export type SignInState = { error: string | null };

export const EMPTY_SIGN_IN_STATE: SignInState = { error: null };

// ─── Create / edit ──────────────────────────────────────────────────────────

/** Exactly the fields the plan v2 §11 admin form owns — nothing else. */
export type SakeFieldName =
  | "name_en"
  | "name_jp"
  | "brewery"
  | "prefecture"
  | "region_id"
  | "category"
  | "fridge_number"
  | "price"
  | "sweetness"
  | "body"
  | "description"
  | "image_url";

export type SakeFormState = {
  status: "idle" | "success" | "error";
  /** Honest, plain-language summary shown as a toast. */
  message: string | null;
  errors: Partial<Record<SakeFieldName, string>>;
  /** The row that was written. Set on both create and update. */
  savedId?: string;
};

export const EMPTY_SAKE_FORM_STATE: SakeFormState = {
  status: "idle",
  message: null,
  errors: {},
};

// ─── Delete ─────────────────────────────────────────────────────────────────

export type DeleteState = {
  status: "idle" | "success" | "error";
  message: string | null;
};

export const EMPTY_DELETE_STATE: DeleteState = {
  status: "idle",
  message: null,
};

// ─── Inline stock toggle ────────────────────────────────────────────────────

export type StockToggleResult = { ok: boolean; error?: string };
