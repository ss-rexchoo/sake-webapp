"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ADMIN_LOGIN_PATH, requireStaffSession, staffAuth } from "@/lib/auth";
import { clientKey, recordLoginAttempt } from "@/lib/auth/rate-limit";
import { repo } from "@/lib/data";
import type { SakeCreateInput } from "@/lib/types";
import type {
  DeleteState,
  SakeFieldName,
  SakeFormState,
  SignInState,
  StockToggleResult,
} from "./admin-types";

/**
 * Every mutation the admin screens can perform.
 *
 * Two rules hold throughout:
 *  1. Each action re-checks the session itself. The `/admin` proxy guard runs
 *     before page renders, but Next's docs warn that Server Function POSTs are
 *     handled as posts to the route that uses them and can fall outside a
 *     matcher after a refactor. The gate has to be here too.
 *  2. Validation runs server-side and is authoritative. The form's `required`,
 *     `min` and `max` attributes are a courtesy for fast feedback, nothing more.
 */

// ─── Sign in / out ──────────────────────────────────────────────────────────

/** Only `/admin` paths may be redirected to after sign-in — never an open redirect. */
function safeNextPath(value: FormDataEntryValue | null): string {
  const path = typeof value === "string" ? value : "";
  return path.startsWith("/admin") && !path.startsWith("//")
    ? path
    : "/admin";
}

export async function signInAction(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const password = String(formData.get("password") ?? "");
  const email = String(formData.get("email") ?? "").trim();

  if (!password) {
    return { error: "Enter the staff password." };
  }

  // Rate limited before the password is checked, so a blocked client cannot use
  // response timing to learn anything — and so a burst never gets as far as
  // scrypt, which is deliberately expensive. Counted per IP per task; see
  // `src/lib/auth/rate-limit.ts` for exactly how far that goes.
  const limit = recordLoginAttempt(clientKey(await headers()));
  if (!limit.allowed) {
    const minutes = Math.ceil(limit.retryAfterSeconds / 60);
    return {
      error: `Too many sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    };
  }

  const result = await staffAuth.signIn({
    email: email || undefined,
    password,
  });

  if (!result.ok) return { error: result.error };

  return redirect(safeNextPath(formData.get("next")));
}

export async function signOutAction(): Promise<void> {
  await staffAuth.signOut();
  redirect(ADMIN_LOGIN_PATH);
}

// ─── Sake CRUD ──────────────────────────────────────────────────────────────

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** Empty string means "not set" for every nullable text column. */
function nullableText(formData: FormData, key: string): string | null {
  const value = text(formData, key);
  return value === "" ? null : value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Refreshes every cached route in one call. Admin edits are rare and a stale
 * fridge number on a guest's screen is the exact failure this app exists to
 * avoid, so the blunt instrument is the right one here.
 */
function revalidateEverything(): void {
  revalidatePath("/", "layout");
}

export async function saveSakeAction(
  _prevState: SakeFormState,
  formData: FormData,
): Promise<SakeFormState> {
  await requireStaffSession();

  const id = text(formData, "id");
  const errors: Partial<Record<SakeFieldName, string>> = {};

  const nameEn = text(formData, "name_en");
  if (!nameEn) errors.name_en = "A name is required — it is what guests search for.";

  // Fridge number: the whole app exists to deliver this number, so it is the
  // one field with no forgiving fallback.
  const fridgeRaw = text(formData, "fridge_number");
  const fridgeNumber = Number(fridgeRaw);
  if (!fridgeRaw) {
    errors.fridge_number = "Required — this is the number the guest walks up to.";
  } else if (!Number.isInteger(fridgeNumber) || fridgeNumber < 1) {
    errors.fridge_number = "Must be a whole number, 1 or higher.";
  }

  const priceRaw = text(formData, "price");
  let price: number | null = null;
  if (priceRaw) {
    price = Number(priceRaw);
    if (!Number.isFinite(price)) {
      errors.price = "Must be a number, or left blank.";
    } else if (price < 0) {
      errors.price = "Cannot be negative.";
    }
  }

  const sweetnessRaw = Number(text(formData, "sweetness"));
  const bodyRaw = Number(text(formData, "body"));
  if (!Number.isFinite(sweetnessRaw)) {
    errors.sweetness = "Must be a number between 0 and 100.";
  }
  if (!Number.isFinite(bodyRaw)) {
    errors.body = "Must be a number between 0 and 100.";
  }
  const sweetness = Number.isFinite(sweetnessRaw) ? clamp(sweetnessRaw, 0, 100) : 50;
  const body = Number.isFinite(bodyRaw) ? clamp(bodyRaw, 0, 100) : 50;

  const imageUrl = nullableText(formData, "image_url");
  if (imageUrl && !/^https?:\/\/\S+$/i.test(imageUrl)) {
    errors.image_url = "Must be a full web address starting with http:// or https://.";
  }

  const regionId = nullableText(formData, "region_id");
  if (regionId) {
    const region = await repo.getRegion(regionId);
    if (!region) errors.region_id = "Unknown region.";
  }

  if (Object.keys(errors).length > 0) {
    return {
      status: "error",
      message: "Nothing was saved — check the highlighted fields.",
      errors,
    };
  }

  const fields = {
    name_en: nameEn,
    name_jp: nullableText(formData, "name_jp"),
    brewery: nullableText(formData, "brewery"),
    prefecture: nullableText(formData, "prefecture"),
    region_id: regionId,
    category: nullableText(formData, "category"),
    sweetness,
    body,
    description: nullableText(formData, "description"),
    food_pairing: formData
      .getAll("food_pairing")
      .map((tag) => String(tag).trim())
      .filter(Boolean),
    image_url: imageUrl,
    fridge_number: fridgeNumber,
    price,
    in_stock: text(formData, "in_stock") === "true",
  } satisfies Omit<SakeCreateInput, "aroma_intensity">;

  try {
    if (id) {
      // `aroma_intensity` is deliberately absent: it is descriptive metadata
      // (§10), not something the admin form should be inventing. Omitting it
      // from the patch leaves whatever is already on the record untouched.
      await repo.updateSake(id, fields);
      revalidateEverything();
      return {
        status: "success",
        message: `Saved ${nameEn} — fridge #${fridgeNumber}.`,
        errors: {},
        savedId: id,
      };
    }

    const created = await repo.createSake({ ...fields, aroma_intensity: null });
    revalidateEverything();
    return {
      status: "success",
      message: `Added ${nameEn} — fridge #${fridgeNumber}.`,
      errors: {},
      savedId: created.id,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? `Could not save: ${error.message}`
          : "Could not save. Nothing was changed.",
      errors: {},
    };
  }
}

export async function deleteSakeAction(
  _prevState: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
  await requireStaffSession();

  const id = text(formData, "id");
  if (!id) return { status: "error", message: "No sake was selected." };

  const name = text(formData, "name_en") || "That sake";

  try {
    await repo.deleteSake(id);
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? `Could not delete: ${error.message}`
          : "Could not delete. Nothing was changed.",
    };
  }

  revalidateEverything();
  return { status: "success", message: `${name} was deleted.` };
}

/** The one-tap toggle on the staff list — the most-used control behind the bar. */
export async function setStockAction(
  id: string,
  inStock: boolean,
): Promise<StockToggleResult> {
  await requireStaffSession();

  try {
    await repo.updateSake(id, { in_stock: inStock });
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Could not update stock.",
    };
  }

  revalidateEverything();
  return { ok: true };
}
