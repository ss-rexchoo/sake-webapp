import type { Sake, TastePoint } from "@/lib/types";

/**
 * Deterministic attribute-distance recommendation — plan v2 §6.
 * Two axes only (sweetness, body) plus descriptive tags. No LLM, no embeddings,
 * and deliberately not the 8-attribute model that was cut in v2.
 */

/** Max possible distance on a 0–100 x 0–100 grid: hypot(100, 100). */
const MAX_DISTANCE = 141.42;

/** Below this best-match score we tell the guest the truth instead of pretending. */
export const LOW_CONFIDENCE_THRESHOLD = 50;

export interface MatchResult {
  sake: Sake;
  /** 0–100, higher is closer. */
  score: number;
}

/**
 * How close a sake sits to the customer's point on the taste compass.
 * A customer sitting exactly on a sake's point scores 100.
 *
 * Kept verbatim from plan v2 §6, including its one quirk: true opposite
 * corners (0,0 vs 100,100) round to `-0` because 141.42 is slightly under the
 * real max distance. Clamp at the display layer if you render the raw number.
 */
export function matchScore(customer: TastePoint, sake: Sake): number {
  const d = Math.hypot(
    customer.sweetness - sake.sweetness,
    customer.body - sake.body,
  );
  return Math.round(100 - (d / MAX_DISTANCE) * 100);
}

/**
 * Top `n` in-stock sake, best score first. Out-of-stock bottles are excluded
 * outright: a recommendation the guest can't find in the fridge is worse than
 * no recommendation.
 */
export function topMatches(
  customer: TastePoint,
  sakeList: Sake[],
  n = 3,
): MatchResult[] {
  return sakeList
    .filter((sake) => sake.in_stock)
    .map((sake) => ({ sake, score: matchScore(customer, sake) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

/**
 * True when even the best match is weak, so the UI can say
 * "nothing's a perfect match tonight, but here's what comes closest"
 * rather than presenting a poor match at false confidence.
 * An empty result set counts as low confidence.
 */
export function isLowConfidence(results: MatchResult[]): boolean {
  if (results.length === 0) return true;
  const best = Math.max(...results.map((r) => r.score));
  return best < LOW_CONFIDENCE_THRESHOLD;
}

/**
 * Plain-language readout for the taste compass, e.g. "dry & full-bodied".
 * Ported from the prototype: thresholds at 38 and 62 on both axes.
 *
 * @param x sweetness, 0 = dry, 100 = sweet
 * @param y body, 0 = light, 100 = rich
 */
export function describeTaste(x: number, y: number): string {
  const sweetness = x < 38 ? "dry" : x > 62 ? "sweet" : "balanced";
  const body = y < 38 ? "light" : y > 62 ? "full-bodied" : "medium-bodied";
  return `${sweetness} & ${body}`;
}
