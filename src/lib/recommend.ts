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

/* ───────────────────────────────────────────────────────────────────────────
   Why this bottle — the one-line reason under each match card.
   ─────────────────────────────────────────────────────────────────────────── */

/**
 * How far off an axis has to be before it is worth a word.
 *
 * `NOTICEABLE` (8) is the floor. Below it the difference is inside the noise of
 * a finger dragging a dot around a 350px pad — telling a guest their bottle is
 * 5 points drier than they asked is precision the input never had, and it would
 * make every card carry a caveat.
 *
 * `CLEAR` (22) is where a difference stops being a nuance and becomes something
 * the guest would taste. It is also the point at which the second axis earns a
 * mention of its own: below it the line names one axis and stays a sentence,
 * above it the line names both.
 *
 * `WIDE` (40) is where "much" is honest rather than dramatic — 40 points is
 * most of the way from one of `describeTaste`'s bands to the far one.
 *
 * These are display thresholds only. Nothing here feeds `matchScore`; the
 * ranking is untouched.
 */
const NOTICEABLE = 8;
const CLEAR = 22;
const WIDE = 40;

/** 0 = same, 1 = a nuance, 2 = clearly different, 3 = a long way off. */
function magnitude(delta: number): 0 | 1 | 2 | 3 {
  const size = Math.abs(delta);
  if (size < NOTICEABLE) return 0;
  if (size < CLEAR) return 1;
  if (size < WIDE) return 2;
  return 3;
}

/** One axis, resolved into the words the copy below needs. */
interface Axis {
  /** Signed: sake minus customer. */
  delta: number;
  level: 0 | 1 | 2 | 3;
  /** Comparative, in the sake's direction — "drier", "fuller". */
  word: string;
  /** The axis itself, for "…but the weight is right". */
  noun: string;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * A plain-language reason for a match, in terms of the guest's own input.
 *
 * ── Why this is not a compliment ────────────────────────────────────────────
 * The card already carries a number (`87% MATCH`) and the number says nothing —
 * 87% of what, measured how. This line is the explanation, and the temptation
 * is to make every explanation sound like good news. It deliberately does not.
 * The results screen has an honest low-confidence state precisely so the app
 * does not overclaim; a reason line that read "a great match for you" on every
 * card would quietly undo that on the same screen. So the line leads with the
 * DIFFERENCE — what the guest is giving up — and only says "spot on" about an
 * axis that actually is.
 *
 * ── Why it leads with one axis ──────────────────────────────────────────────
 * Both axes are always available, and naming both every time turns eleven
 * possible sentences into one template a guest reads three times in a row. So
 * the dominant difference leads, and the second axis is named only when it is
 * `CLEAR` on its own account. When the second axis is *close*, saying so is the
 * useful half of the sentence ("…but the weight is right"), and when it is a
 * nuance it gets a nuance's worth of words ("…and a shade fuller").
 *
 * ── The two special cases ───────────────────────────────────────────────────
 * Near-exact (neither axis `NOTICEABLE`) gets its own sentence, because a line
 * built from differences has nothing to say when there are none.
 *
 * Low confidence gets a different frame entirely rather than a suffix. It is a
 * property of the whole result set, not of this pairing, so the sentence opens
 * by admitting the distance and then names the axes — and it never claims to be
 * "the closest we have", which is only true of the first of the three cards.
 * The set-level caveat is the header's job.
 *
 * Deterministic and pure — no LLM at request time (plan v2 §13/§16), no
 * dependency, and callable from the server component that already has both the
 * taste point and the row.
 *
 * @param customer the point the guest dragged to on the compass
 * @param sake anything carrying the two scored axes
 * @param lowConfidence `isLowConfidence(results)` for the set this sake is in
 */
export function matchReason(
  customer: TastePoint,
  sake: Pick<Sake, "sweetness" | "body">,
  lowConfidence = false,
): string {
  const sweetnessDelta = sake.sweetness - customer.sweetness;
  const bodyDelta = sake.body - customer.body;

  const sweetnessAxis: Axis = {
    delta: sweetnessDelta,
    level: magnitude(sweetnessDelta),
    word: sweetnessDelta > 0 ? "sweeter" : "drier",
    noun: "sweetness",
  };
  const bodyAxis: Axis = {
    delta: bodyDelta,
    // "fuller"/"lighter" rather than "richer"/"thinner": the compass axis is
    // labelled light ↔ rich, but "thinner" is a criticism of a bottle rather
    // than a description of one, and a reason line must not talk a guest out of
    // a sake it is recommending.
    level: magnitude(bodyDelta),
    word: bodyDelta > 0 ? "fuller" : "lighter",
    noun: "weight",
  };

  // Nothing worth a word on either axis. Said once, plainly — the percentage
  // above it is already the precise version.
  if (sweetnessAxis.level === 0 && bodyAxis.level === 0) {
    return "Almost exactly where you landed.";
  }

  // Ties go to sweetness: it is the axis the guest reads first on the compass
  // (left-to-right), and a tie means the two differences are identical anyway.
  const sweetnessLeads =
    Math.abs(sweetnessAxis.delta) >= Math.abs(bodyAxis.delta);
  const lead = sweetnessLeads ? sweetnessAxis : bodyAxis;
  const other = sweetnessLeads ? bodyAxis : sweetnessAxis;

  if (lowConfidence) {
    // No adverbs in this frame. "A long way from where you landed" has already
    // set the magnitude, and the leading axis is always `WIDE` here anyway:
    // low confidence means the best score is under 50, so the distance exceeds
    // 70, so the larger of the two deltas is at least 70/√2 ≈ 50. A "much" here
    // would be a second intensifier on a sentence that already has one.
    //
    // Both axes as soon as the second one is audible at all: when the best
    // match in the set is this far out, a one-axis sentence understates it.
    return other.level >= 1
      ? `A long way from where you landed — ${lead.word} and ${other.word}.`
      : `A long way from where you landed — ${lead.word}.`;
  }

  // Both clearly different, so both are named. Each axis carries its own
  // adverb, which is what keeps this from being one sentence with two blanks:
  // "Much lighter and drier" says the weight is a long way out and the
  // sweetness merely off, and a guest choosing between three cards can see that
  // difference between them. `lead.level >= other.level` always holds (the lead
  // is picked by absolute delta), so only three shapes are reachable:
  //
  //   (2,2)  Lighter and drier than you picked.
  //   (3,2)  Much lighter and drier than you picked.
  //   (3,3)  Much lighter and much drier than you picked.
  if (other.level >= 2) {
    const emphasise = (axis: Axis) =>
      axis.level === 3 ? `much ${axis.word}` : axis.word;
    return `${capitalize(emphasise(lead))} and ${emphasise(other)} than you picked.`;
  }

  const opening =
    lead.level === 1
      ? `Just a touch ${lead.word} than you picked`
      : lead.level === 2
        ? `${capitalize(lead.word)} than you picked`
        : `Much ${lead.word} than you picked`;

  return other.level === 0
    ? `${opening}, but the ${other.noun} is right.`
    : `${opening}, and a shade ${other.word}.`;
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
