"use client";

import { useState } from "react";

import { describeTaste } from "@/lib/recommend";

/**
 * The two scored axes — the only numbers the recommendation engine reads (§6).
 *
 * Three deliberate choices:
 *
 *  1. Every control states which end is which ("0 · dry" / "100 · sweet"). A
 *     bare number field would let one person score 20 as "quite dry" and the
 *     next score 20 as "quite sweet", and inconsistent scoring quietly wrecks
 *     recommendation quality (plan v2 §3).
 *  2. A slider *and* a number box share each value: the slider is what works
 *     one-handed behind the bar, the number box is what you use when you are
 *     copying a figure off a brewery spec sheet.
 *  3. The mini grid mirrors the guest-facing taste compass exactly — same
 *     geometry, sweetness left→right, body bottom→top — so staff can see the
 *     position a guest will be matched against, not just two abstract numbers.
 */

const clamp = (value: number) => Math.min(100, Math.max(0, value));

function Axis({
  name,
  label,
  lowLabel,
  highLabel,
  value,
  onChange,
  error,
}: {
  name: "sweetness" | "body";
  label: string;
  lowLabel: string;
  highLabel: string;
  value: number;
  onChange: (next: number) => void;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={`${name}-number`} className="text-[13px] text-cream">
          {label}
        </label>
        <input
          id={`${name}-number`}
          name={name}
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={(event) => onChange(clamp(Number(event.target.value) || 0))}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${name}-error` : undefined}
          // See `SakeForm`'s `selectClass`: `pointer:fine`, not `md:`, so an
          // iPad in portrait does not cross a width breakpoint into 14px and
          // trigger iOS zoom-on-focus.
          className="h-11 w-20 rounded-md border border-input bg-transparent px-2 text-right text-base text-cream tabular-nums focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none [@media(pointer:fine)]:text-sm"
        />
      </div>

      {/* Unnamed on purpose — the number input above carries the form value, so
          the two controls can't submit the field twice. */}
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={`${label}, ${lowLabel} to ${highLabel}`}
        // h-10, not h-6: the box is the thumb's hit area, and this is the
        // control the docblock above calls "what works one-handed behind the
        // bar". Vermillion, not gold, because the moving marker on the guest
        // compass is vermillion and gold is that page's "this is the answer".
        className="h-10 w-full cursor-pointer accent-vermillion focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
      />

      <div className="flex justify-between text-[10.5px] text-muted">
        <span>0 · {lowLabel}</span>
        <span>100 · {highLabel}</span>
      </div>

      {error ? (
        <p
          id={`${name}-error`}
          role="alert"
          className="text-[12px] text-vermillion-light"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TasteFields({
  defaultSweetness,
  defaultBody,
  errors,
}: {
  defaultSweetness: number;
  defaultBody: number;
  errors?: { sweetness?: string; body?: string };
}) {
  const [sweetness, setSweetness] = useState(clamp(defaultSweetness));
  const [body, setBody] = useState(clamp(defaultBody));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[12px] leading-relaxed text-muted">
        Start from the brewery&rsquo;s published figures where they exist
        (Nihonshu-do, acidity) and adjust after tasting — a guessed number is
        worse than a copied one.
      </p>

      {/* Preview. Labelled on all four sides so it can be read on its own, and
          left-aligned with the rest of the form — a centred block would be the
          only one on the screen. */}
      <div className="flex flex-col items-center gap-1 self-start">
        <span className="text-[10px] tracking-[0.08em] text-muted uppercase">
          rich
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] tracking-[0.08em] text-muted uppercase">
            dry
          </span>
          <div className="relative size-[180px] rounded-md border border-cream/15 bg-cream/5">
            <span className="absolute top-1/2 right-0 left-0 border-t border-cream/10" />
            <span className="absolute top-0 bottom-0 left-1/2 border-l border-cream/10" />
            <span
              // The compass's own marker: vermillion core, 2px cream ring,
              // AttributeBar's 14px. A bare gold dot matched neither, and gold
              // is the fridge badge's accent, not the taste marker's.
              className="absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cream bg-vermillion"
              style={{
                left: `${sweetness}%`,
                // Inverted against screen coordinates, matching TasteCompass:
                // the top edge is body 100 (rich).
                top: `${100 - body}%`,
              }}
            />
          </div>
          <span className="text-[10px] tracking-[0.08em] text-muted uppercase">
            sweet
          </span>
        </div>
        <span className="text-[10px] tracking-[0.08em] text-muted uppercase">
          light
        </span>
        {/* Same sentence, same `describeTaste()`, as the readout under the
            guest compass — so set it in the same display face. */}
        <p className="mt-1 font-display text-[15px] text-cream">
          Reads as {describeTaste(sweetness, body)}
        </p>
      </div>

      <Axis
        name="sweetness"
        label="Sweetness"
        lowLabel="dry"
        highLabel="sweet"
        value={sweetness}
        onChange={setSweetness}
        error={errors?.sweetness}
      />
      <Axis
        name="body"
        label="Body"
        lowLabel="light"
        highLabel="rich"
        value={body}
        onChange={setBody}
        error={errors?.body}
      />
    </div>
  );
}
