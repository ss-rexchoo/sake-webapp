/**
 * Seasonal ambience — which motif drifts behind the guest journey, and how.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EDIT ME — `SEASON_OVERRIDE` below is the one knob the restaurant touches.
 * Set it to "spring" | "summer" | "autumn" | "winter" to pin one motif all year
 * (e.g. sakura for the whole season the menu is themed around), or leave it on
 * "auto" to follow the calendar.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ── Why the Japanese calendar and not the Malaysian one ─────────────────────
 * The venue is in Malaysia, which has no four-season year at all. The motifs
 * follow the *Northern-Hemisphere Japanese* calendar on purpose: this screen is
 * a Japanese-restaurant conceit, and a guest reading momiji in October is
 * reading the sake's home, not the weather outside the window. Months below are
 * Japan's seasons, deliberately.
 *
 * ── Colour ─────────────────────────────────────────────────────────────────
 * Every colour here is a design token from plan v2 §4, or a `color-mix()` of
 * two of them — no raw hexes. The component resolves these strings through the
 * browser (see `SeasonalAmbience`), so the tokens stay the single source of
 * truth and the canvas can never drift from the palette.
 *
 * Sakura pink is the one hue §4 does not contain. Rather than introduce a pink,
 * it is mixed out of `--vermillion-light` (the existing pale vermillion tint)
 * and `--cream` — a blush that is demonstrably inside the palette's own gamut.
 * Summer green is likewise absent, and is made by mixing `--gold-light` toward
 * `--muted` *in oklch*: the shorter hue path from the gold's yellow to the
 * muted's blue passes through green, so a real leaf tone falls out of two
 * existing tokens without adding a fifth hue to the system.
 */

export type Season = "spring" | "summer" | "autumn" | "winter";

/** `Season`, plus the calendar-following default. */
export type SeasonSetting = Season | "auto";

/**
 * EDIT ME. "auto" follows the month; any season name pins that motif year-round.
 */
export const SEASON_OVERRIDE: SeasonSetting = "auto";

/** Which silhouette `SeasonalAmbience` draws. */
export type MotifShape = "sakura" | "leaf" | "momiji" | "snow";

/** An inclusive `[min, max]` range, sampled by a particle's depth. */
type Range = [number, number];

export interface SeasonMotif {
  season: Season;
  shape: MotifShape;
  /** How many particles exist at once. Tuned down, never up. */
  count: number;
  /** Peak per-particle alpha. Depth scales each particle to 55–100% of this. */
  opacity: number;
  /** Fall speed in CSS px per second. Near particles (large) fall faster. */
  speed: Range;
  /** Long axis in CSS px. */
  size: Range;
  /** Horizontal sway amplitude in px. */
  sway: Range;
  /** Seconds for one full sway cycle. */
  swayPeriod: Range;
  /** Rotation in radians/sec. Sign is randomised per particle. */
  spin: Range;
  /** Edge-on flutter in radians/sec of the width oscillation. 0 = rigid. */
  flutter: Range;
  /** Steady lateral wind in px/sec. Sign is randomised per particle. */
  drift: number;
  /** CSS colour expressions — tokens, or a `color-mix()` of tokens. */
  colors: readonly string[];
}

/**
 * The four motifs.
 *
 * Read the numbers as a set: this layer is *ground*, not figure. The taste
 * compass (§4, the signature interaction) and the fridge badge are the two
 * things allowed to pull the eye, and nothing here may compete with them. Every
 * range below is at the quiet end on purpose — a guest should notice the
 * ambience only if they stop and look for it.
 *
 * Motion differs per motif rather than just the sprite: petals flutter and sway
 * widely because they are broad and light; a maple leaf tumbles because it is
 * stiffer and heavier; snow falls nearly straight and does not rotate at all.
 *
 * ── The three constraints these numbers are solved against ──────────────────
 *
 * 1. OPACITY is set by the worst case, which is not the bare background. This
 *    app has no opaque surfaces in the guest journey — every card is
 *    `bg-cream/6`–`/12` — so a 6% veil attenuates the canvas by 6% and the
 *    field is effectively *inside* every card rather than behind it. And on a
 *    390px phone the reading column is the whole screen, so there is no gutter
 *    for the field to live in. Peak alpha is therefore tuned so a particle
 *    crossing *under body text* stays around 1.1:1 against the card it crosses,
 *    not merely faint over `--bg`.
 *
 * 2. INK, not count, is what the eye totals. A momiji silhouette is ~2.7x the
 *    filled area of a sakura petal at the same nominal size, so equal counts do
 *    not mean equal presence. Alpha-weighted ink per screen is balanced across
 *    the four: roughly 9 (summer) / 18 (spring) / 23 (autumn) / 24 (winter)
 *    alpha-px², summer deliberately quietest. If you change `count`, `size` or
 *    `opacity`, change them so this stays a band.
 *
 * 3. SPEED reads as distance. The fridge badge's idle breath moves its edge at
 *    ~1.4 px/s and it is the most important element in the app; anything in the
 *    background moving an order of magnitude faster gets tracked by the eye
 *    instead. A particle takes ~55–90s to cross an 844px viewport here. Slow
 *    does not read as sluggish, it reads as far away — which is the whole
 *    claim this layer makes. Lateral sway is held near 0.6x the fall speed for
 *    the three leaf motifs (so they wander without hovering) and 0.24x for
 *    snow, which falls nearly straight.
 *
 * ── ⚠ TRIP-WIRE — read before raising any `opacity` below ───────────────────
 *
 * HARD CAP: do not take spring or autumn `opacity` above ~0.10, or summer above
 * ~0.09, without also making the taste compass pad opaque.
 *
 * The compass pad (`TasteCompass.tsx`, `bg-linear-to-b from-gold/14
 * to-vermillion/10`) is the lightest surface in the app, ~#303540. sRGB
 * compositing is gamma-space, so the same alpha lifts *more* over a brighter
 * base — which is why a particle measures 1.17:1 over the pad while it measures
 * 1.14:1 over a card or over bare `--bg`. The compass's own grid line (`cream
 * 9%`) measures 1.29:1 against that pad.
 *
 * That ordering is the whole ballgame. At the values below, the signature
 * interaction's own structure (1.29) outweighs anything drifting behind it
 * (1.17), which is what makes this layer ground rather than figure. At the
 * originally shipped 0.14/0.15 a petal measured 1.31 — brighter than the grid
 * line, and unlike the grid line it moves. That was a ship-stopper.
 *
 * So: raising these past the cap does not merely make the ambience louder, it
 * inverts the compass's figure/ground and makes an opaque pad under
 * `TasteCompass`'s gradient MANDATORY rather than a nicety. Turn one knob and
 * you owe the other.
 *
 * The summer cap is stricter for a different reason — see the colour note at
 * the top of this file. Summer's green is a hue §4 does not contain, obtained
 * via an oklch hue path. It is defensible only while it is invisible.
 */
export const SEASON_MOTIFS: Record<Season, SeasonMotif> = {
  spring: {
    season: "spring",
    shape: "sakura",
    count: 14,
    opacity: 0.08,
    speed: [9, 16],
    size: [7, 13],
    sway: [7, 13],
    swayPeriod: [6, 9.5],
    // Low spin, high flutter: a petal is broad and light, so it turns edge-on
    // through the air far more than it rotates in plane.
    spin: [0.06, 0.16],
    flutter: [0.32, 0.58],
    drift: 2.5,
    colors: [
      "color-mix(in srgb, var(--vermillion-light) 55%, var(--cream))",
      "color-mix(in srgb, var(--vermillion) 20%, var(--cream))",
    ],
  },

  // The quietest of the four by design: high summer in the app should feel
  // still, so this one is slower, fainter and less busy than the rest.
  //
  // Its green is the one hue §4 does not contain (see the file header). It
  // survives only because it is faint: at this alpha the composite over --bg is
  // a near-neutral lift with a trace of cool cast, and no guest can name the
  // hue. Do not raise `opacity` above ~0.09 — past that the green becomes
  // legible as green, and the palette has quietly gained a fifth hue.
  summer: {
    season: "summer",
    shape: "leaf",
    count: 10,
    opacity: 0.07,
    speed: [7, 12],
    size: [8, 14],
    sway: [6, 11],
    swayPeriod: [7, 11],
    spin: [0.045, 0.115],
    flutter: [0.22, 0.38],
    drift: 2,
    colors: [
      "color-mix(in oklch, var(--gold-light) 60%, var(--muted))",
      "color-mix(in oklch, var(--gold) 55%, var(--muted))",
    ],
  },

  // The lowest count of the four, and it is still the heaviest motif on screen:
  // the momiji silhouette fills ~2.7x the area of a sakura petal at the same
  // nominal size, so `count` had to come down roughly in that proportion for
  // autumn to weigh the same as spring. Size is capped below the others for the
  // same reason.
  //
  // Its colour is a mix of --vermillion and --gold — the app's CTA accent and
  // its "this is the answer" accent. That is fine as a whisper and wrong as a
  // presence: the fridge badge's claim to being the only warm mass on a cold
  // screen is what the whole detail page rests on.
  autumn: {
    season: "autumn",
    shape: "momiji",
    count: 8,
    opacity: 0.08,
    speed: [10, 17],
    size: [8, 13],
    sway: [7, 12],
    swayPeriod: [6, 9],
    // The spinniest of the four, and the only motif where spin exceeds flutter:
    // a maple leaf is stiff enough to hold its plane and tumble rather than
    // flap.
    spin: [0.1, 0.24],
    flutter: [0.19, 0.35],
    drift: 3,
    colors: [
      "color-mix(in srgb, var(--vermillion) 62%, var(--gold-light))",
      "color-mix(in srgb, var(--gold) 78%, var(--vermillion))",
    ],
  },

  // Snow carries the highest count and alpha of the four and is still the
  // calmest read: 2.5–5px dots rather than 8–13px silhouettes, so each particle
  // is a fraction of the ink, and it neither spins nor flutters — the only
  // motif with no rotational motion at all.
  //
  // Neither colour is pure --cream any more. Cream is the body-text token, and
  // drifting motes in the exact colour of text read as content the eye has to
  // dismiss. 12% muted is enough to break that identity and invisible otherwise.
  winter: {
    season: "winter",
    shape: "snow",
    count: 16,
    opacity: 0.09,
    speed: [11, 19],
    size: [2.5, 5],
    sway: [4, 9],
    // Long period against a short amplitude: lateral motion is ~0.24x the fall
    // speed, a quarter of the leaf motifs'. Snow falls, it does not wander.
    swayPeriod: [9, 14],
    spin: [0, 0],
    flutter: [0, 0],
    drift: 1.5,
    colors: [
      "color-mix(in srgb, var(--cream) 88%, var(--muted))",
      "color-mix(in srgb, var(--cream) 60%, var(--muted))",
    ],
  },
};

/**
 * Month index (0 = January) to season, on the Japanese calendar.
 * Mar–May spring, Jun–Aug summer, Sep–Nov autumn, Dec–Feb winter.
 */
export function seasonForMonth(month: number): Season {
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "autumn";
  return "winter";
}

/**
 * The season to render.
 *
 * Call this on the CLIENT ONLY, after mount. Deriving a season from `new Date()`
 * during render is a hydration hazard: the server's clock and timezone are not
 * the guest's, so a build rendered in UTC on 31 August serves "summer" to a
 * phone in Kuala Lumpur that has already ticked over to September. The canvas
 * only exists client-side anyway, so the server never renders a season-dependent
 * tree and there is nothing to mismatch.
 */
export function resolveSeason(now: Date = new Date()): Season {
  return SEASON_OVERRIDE === "auto"
    ? seasonForMonth(now.getMonth())
    : SEASON_OVERRIDE;
}
