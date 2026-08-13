"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { saveSakeAction } from "@/app/actions/admin";
import {
  EMPTY_SAKE_FORM_STATE,
  type SakeFieldName,
} from "@/app/actions/admin-types";
import { Field } from "@/components/admin/Field";
import { ADMIN_SWITCH } from "@/components/admin/StockToggle";
import { TagEditor } from "@/components/admin/TagEditor";
import { TasteFields } from "@/components/admin/TasteFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Region, Sake } from "@/lib/types";

/**
 * Add / edit form for one sake — plan v2 §11.
 *
 * The field list is closed on purpose: fridge number, price, in-stock,
 * sweetness, body, description, food pairing and image are the editable set,
 * plus the identity columns a new record cannot exist without. There is no
 * `aroma_intensity` control — §10 calls it descriptive metadata, "not a
 * customer-facing slider", and an admin field for it would invite staff to
 * score a third axis nothing reads.
 *
 * Every input is controlled. React 19 resets an uncontrolled form once its
 * action settles, which on a validation failure would wipe everything the
 * person just typed — the one moment they least deserve it.
 */

const CATEGORIES = [
  "Junmai",
  "Junmai Ginjo",
  "Junmai Daiginjo",
  "Ginjo",
  "Daiginjo",
  "Honjozo",
  "Nigori",
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3.5 rounded-lg border border-cream/12 bg-cream/5 p-3.5">
      {/* The `Kicker` treatment exactly (12px / 0.14em / gold-light) — same
          element in the system, so it must not be a near-miss 11px. Left as an
          <h2> rather than swapped for <Kicker> because the section headings
          carry the form's outline and Kicker renders a <p>. */}
      <h2 className="text-xs tracking-[0.14em] text-gold-light uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

// 44px, matching `LoginForm` and the guest search field — the app's own stated
// minimum touch target (`HIT_SIZE` in TasteCompass). The `Input` primitive's
// h-8 default is a desktop density this tool never runs at.
const inputClass = "h-11";
// `text-base md:text-sm` rather than a fixed 14px: iOS Safari zooms the page
// when a form control under 16px takes focus, which is why the `Input`
// primitive is written this way. The select has to match it.
const selectClass =
  "h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base text-cream focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:text-sm";

export function SakeForm({
  sake,
  regions,
}: {
  /** Null when creating. */
  sake: Sake | null;
  regions: Region[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    saveSakeAction,
    EMPTY_SAKE_FORM_STATE,
  );

  const [fields, setFields] = useState({
    name_en: sake?.name_en ?? "",
    name_jp: sake?.name_jp ?? "",
    brewery: sake?.brewery ?? "",
    prefecture: sake?.prefecture ?? "",
    region_id: sake?.region_id ?? "",
    category: sake?.category ?? "",
    fridge_number: sake ? String(sake.fridge_number) : "",
    price: sake?.price === null || sake === null ? "" : String(sake.price),
    description: sake?.description ?? "",
    image_url: sake?.image_url ?? "",
  });
  const [inStock, setInStock] = useState(sake?.in_stock ?? true);

  const set = (key: keyof typeof fields) => (value: string) =>
    setFields((current) => ({ ...current, [key]: value }));

  // One toast per action result, and only navigate away once.
  const handled = useRef(EMPTY_SAKE_FORM_STATE);
  useEffect(() => {
    if (state === handled.current || state.status === "idle") return;
    handled.current = state;

    if (state.status === "success") {
      toast.success(state.message ?? "Saved.");
      router.push("/admin");
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, router]);

  const errorFor = (field: SakeFieldName) => state.errors[field];
  // `Field` renders its error with id `<htmlFor>-error`, and every control
  // here uses its column name as its id — so an invalid field still explains
  // itself when a screen reader lands back on it, not only when it appears.
  const describedBy = (field: SakeFieldName) =>
    errorFor(field) ? `${field}-error` : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {sake ? <input type="hidden" name="id" value={sake.id} /> : null}
      <input type="hidden" name="in_stock" value={inStock ? "true" : "false"} />

      <Section title="Identity">
        <Field label="Name (English)" htmlFor="name_en" error={errorFor("name_en")}>
          <Input
            id="name_en"
            name="name_en"
            value={fields.name_en}
            onChange={(e) => set("name_en")(e.target.value)}
            required
            aria-invalid={errorFor("name_en") ? true : undefined}
            aria-describedby={describedBy("name_en")}
            className={inputClass}
          />
        </Field>

        <Field label="Name (Japanese)" htmlFor="name_jp">
          <Input
            id="name_jp"
            name="name_jp"
            value={fields.name_jp}
            onChange={(e) => set("name_jp")(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Brewery" htmlFor="brewery">
          <Input
            id="brewery"
            name="brewery"
            value={fields.brewery}
            onChange={(e) => set("brewery")(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Prefecture" htmlFor="prefecture">
          <Input
            id="prefecture"
            name="prefecture"
            value={fields.prefecture}
            onChange={(e) => set("prefecture")(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field
          label="Region"
          htmlFor="region_id"
          hint="Where it appears on the Explore Japan map."
          error={errorFor("region_id")}
        >
          <select
            id="region_id"
            name="region_id"
            value={fields.region_id}
            onChange={(e) => set("region_id")(e.target.value)}
            aria-invalid={errorFor("region_id") ? true : undefined}
            aria-describedby={describedBy("region_id")}
            className={selectClass}
          >
            <option value="">Not set</option>
            {regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Category"
          htmlFor="category"
          hint="Junmai, Ginjo, Daiginjo… Free text — pick from the list or type your own."
        >
          <Input
            id="category"
            name="category"
            list="sake-categories"
            value={fields.category}
            onChange={(e) => set("category")(e.target.value)}
            className={inputClass}
          />
          <datalist id="sake-categories">
            {CATEGORIES.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </Field>
      </Section>

      <Section title="In the fridge">
        <Field
          label="Fridge number"
          htmlFor="fridge_number"
          hint="The number the guest walks up to. Whole numbers only."
          error={errorFor("fridge_number")}
        >
          <Input
            id="fridge_number"
            name="fridge_number"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            required
            value={fields.fridge_number}
            onChange={(e) => set("fridge_number")(e.target.value)}
            aria-invalid={errorFor("fridge_number") ? true : undefined}
            aria-describedby={describedBy("fridge_number")}
            className={inputClass}
          />
        </Field>

        <Field
          label="Price (RM)"
          htmlFor="price"
          hint="Malaysian ringgit — what the guest sees on the bottle card."
          error={errorFor("price")}
        >
          <Input
            id="price"
            name="price"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={fields.price}
            onChange={(e) => set("price")(e.target.value)}
            aria-invalid={errorFor("price") ? true : undefined}
            aria-describedby={describedBy("price")}
            className={inputClass}
          />
        </Field>

        <div className="flex items-center justify-between gap-3">
          <label htmlFor="in_stock_switch" className="text-[13px] text-cream">
            In stock
          </label>
          <Switch
            id="in_stock_switch"
            className={ADMIN_SWITCH}
            checked={inStock}
            onCheckedChange={setInStock}
          />
        </div>
      </Section>

      <Section title="Taste">
        <TasteFields
          defaultSweetness={sake?.sweetness ?? 50}
          defaultBody={sake?.body ?? 50}
          errors={{ sweetness: errorFor("sweetness"), body: errorFor("body") }}
        />
      </Section>

      <Section title="Description & pairing">
        <Field
          label="Tasting description"
          htmlFor="description"
          hint="One or two sentences, in plain language — no junmai/ginjo vocabulary here."
        >
          <Textarea
            id="description"
            name="description"
            rows={3}
            value={fields.description}
            onChange={(e) => set("description")(e.target.value)}
          />
        </Field>

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] text-cream">Food pairing</span>
          <TagEditor
            key={sake?.id ?? "new"}
            initialTags={sake?.food_pairing ?? []}
          />
        </div>
      </Section>

      <Section title="Image">
        <Field
          label="Image URL"
          htmlFor="image_url"
          hint="Optional. A full web address — the app does not host uploads yet."
          error={errorFor("image_url")}
        >
          <Input
            id="image_url"
            name="image_url"
            type="url"
            inputMode="url"
            placeholder="https://"
            value={fields.image_url}
            onChange={(e) => set("image_url")(e.target.value)}
            aria-invalid={errorFor("image_url") ? true : undefined}
            aria-describedby={describedBy("image_url")}
            className={inputClass}
          />
        </Field>
      </Section>

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={pending}
          className="h-11 flex-1 text-[15px] font-normal"
        >
          {pending ? "Saving…" : sake ? "Save changes" : "Add sake"}
        </Button>
        <Link
          href="/admin"
          className="rounded-lg border border-cream/20 bg-cream/8 px-4 py-3 text-[13.5px] text-cream transition-colors hover:bg-cream/16 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
