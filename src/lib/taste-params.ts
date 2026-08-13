import type { TastePoint } from "@/lib/types";

/**
 * The taste point travels between `/taste` and `/taste/results` in the URL
 * rather than in React state, so a result screen is shareable, reloadable, and
 * survives back/forward — plan v2 §5.
 *
 * `?x=` is sweetness (0 dry → 100 sweet), `?y=` is body (0 light → 100 rich).
 * Short names because the guest sees this URL.
 */

/** The centre of the pad — where the compass starts, and the fallback for junk input. */
export const DEFAULT_TASTE_POINT: TastePoint = { sweetness: 50, body: 50 };

type RawParam = string | string[] | undefined;

/**
 * Anything unparseable falls back to the centre of the pad. A hand-edited or
 * truncated URL should still land the guest on a usable screen — never a 404
 * and never `NaN%` on a card.
 */
function parseAxis(raw: RawParam): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined || value.trim() === "") return 50;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 50;

  return Math.min(100, Math.max(0, parsed));
}

export function parseTastePoint(x: RawParam, y: RawParam): TastePoint {
  return { sweetness: parseAxis(x), body: parseAxis(y) };
}

/**
 * Serialised to whole numbers: the pad is 280px wide, so a tenth of a point is
 * a quarter of a pixel of intent. Rounding keeps the shared URL readable.
 */
export function tasteQuery(point: TastePoint): string {
  return new URLSearchParams({
    x: String(Math.round(point.sweetness)),
    y: String(Math.round(point.body)),
  }).toString();
}
