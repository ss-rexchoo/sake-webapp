/**
 * Seasonal ambience — which motif drifts behind the guest journey, and how.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TWO KNOBS, and the URL wins.
 *
 *   ?season=winter   Preview any motif on the LIVE site, no redeploy. Sticks
 *                    for the rest of the browser session, so it survives the
 *                    walk from landing → taste → results → map → detail.
 *                    `?season=auto` clears it. Best way to demo, and the only
 *                    quick way to check all four.
 *
 *   SEASON_OVERRIDE  The constant below. Pins one motif all year (e.g. sakura
 *                    for a themed menu). "auto" follows the calendar.
 *
 * Full precedence chain, and why the parameter ships to production, are on
 * `resolveSeason` at the foot of this file.
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

/** The four, in calendar order. Single source of truth for the type guard. */
export const SEASONS = ["spring", "summer", "autumn", "winter"] as const;

/** `Season`, plus the calendar-following default. */
export type SeasonSetting = Season | "auto";

/**
 * Narrow an untrusted string — a URL parameter, a `sessionStorage` value — to a
 * `Season`. Everything unrecognised is simply not a season, so callers fall
 * through to the next level of the precedence chain rather than throwing or
 * rendering nothing. `?season=banana` is a no-op, not an error.
 */
export function isSeason(value: string | null | undefined): value is Season {
  return value != null && (SEASONS as readonly string[]).includes(value);
}

/**
 * EDIT ME. "auto" follows the month; any season name pins that motif year-round.
 *
 * This is the SECOND level of the chain — `?season=` in the URL outranks it.
 * See `resolveSeason`.
 */
export const SEASON_OVERRIDE: SeasonSetting = "auto";

/** Query parameter that previews a season. See `resolveSeason`. */
export const SEASON_PARAM = "season";

/**
 * `sessionStorage` key holding a previewed season.
 *
 * Session-scoped for the same reason `sake:revealed` is: a QR scan at the next
 * table must start clean. A season pinned for a demo should survive that demo's
 * navigation and nothing else.
 */
export const SEASON_STORAGE_KEY = "sake:season";

/** Which silhouette `SeasonalAmbience` draws. */
export type MotifShape = "sakura" | "leaf" | "momiji" | "snow";

/** An inclusive `[min, max]` range, sampled by a particle's depth. */
type Range = [number, number];

export interface SeasonMotif {
  season: Season;
  shape: MotifShape;
  /**
   * Particles on screen at the REFERENCE VIEWPORT (390x844). Not an absolute:
   * `particleCountFor()` scales it with viewport area so the field holds the
   * same ink per unit area on a laptop as on the phone this was tuned on.
   * Tuned down, never up.
   */
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
 * 1. OPACITY is set by the BARE SURROUND, not by the cards. This was measured
 *    the wrong way round once and the correction matters: the canvas is z-0 and
 *    the entire app frame is z-10, so a card veil paints ON TOP of a particle,
 *    which both scales its luminance delta by (1 - veil) and lifts the base the
 *    ratio is measured against. Both push the contrast ratio DOWN. A particle
 *    is at its loudest over open background and gets quieter under every
 *    surface in the app. See the trip-wire below for the measured numbers.
 *
 * 2. INK PER UNIT AREA, not ink per screen, is what the eye totals — and not
 *    count, because the silhouettes differ in filled area. Measured off the
 *    actual traced paths, per unit of nominal size²: summer leaf 0.190, sakura
 *    petal 0.377, momiji 0.476. So momiji is 1.26x a petal and 2.51x a leaf.
 *
 *    (An earlier version of this note said momiji was ~2.7x a *petal* and that
 *    autumn's `count` had been cut "roughly in that proportion" to compensate.
 *    Both halves were wrong — 2.51x is the leaf comparison, and autumn's 8 vs
 *    spring's 14 is a 1.75x cut. Anyone rebalancing counts from the old
 *    sentence would have cut autumn to ~5 and landed at half the intended
 *    presence.)
 *
 *    Alpha-weighted ink, normalised per 100k px² of viewport at the reference
 *    phone: summer 6.8 / winter 10.2 / autumn 11.5 / spring 14.8. Measured as
 *    depth-averaged filled area x alpha, including the flutter duty cycle and
 *    snow's halo overlap. Summer stays deliberately lowest — but see the
 *    visibility floor in the trip-wire: lowest ink is allowed, invisible
 *    particles are not, and those are different things.
 *
 *    "Per unit area" is load-bearing and is why `count` is scaled by
 *    `particleCountFor()`. These numbers were tuned on a 390x844 phone; a fixed
 *    count on a 1440x900 laptop spreads the same ink over 3.9x the area and
 *    lands at 25% of the tuned density, which is what "the backdrop looks
 *    faint on desktop" actually was.
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
 * ── ⚠ TRIP-WIRE — the numbers below are a BAND, not a ceiling ───────────────
 *
 * There is a floor here as well as a cap, and the floor is the one that has
 * actually been violated in production. Read both before touching `opacity`.
 *
 *   FLOOR:  peak particle contrast >= ~1.38:1 over `--bg2`, for EVERY motif.
 *   CAP:    peak particle contrast <= ~1.46:1 over `--bg2`, for EVERY motif.
 *
 * Current peaks: spring 1.434, summer 1.419, winter 1.416, autumn 1.234.
 * Autumn is the deliberate exception — see below.
 *
 * ── Why there is a floor at all (the bug that put it here) ──────────────────
 *
 * Every motif used to be tuned against the cap alone, and the band drifted
 * down until it fell through the bottom. Shipped, on a phone, a guest reported
 * the backdrop was "not visible at all" — and they were right. The live motif
 * was summer at `opacity: 0.07`, which is 1.16:1: below the threshold where a
 * 10px shape at 8px/sec is detectable on a handset in daylight.
 *
 * The failure was structural, not arithmetic. Summer is the deliberately
 * quietest of the four, and August is summer, so the quietest configuration
 * the system can produce was the only one anybody saw for three months — and
 * it was the one configuration never checked, because it was not the season
 * during development. "Quietest of the four" is a fine intent and a bad
 * outcome when it lands on the season guests are actually in.
 *
 * So: the ink band may be uneven, but PER-PARTICLE CONTRAST may not fall
 * through the floor for any motif. Ink is how much weather there is; contrast
 * is whether you can see it at all. Summer is still the lowest-ink motif by
 * some way (6.8 vs spring's 14.8) because it has the fewest and smallest
 * particles — it reads still through SPARSENESS, not through faintness. That
 * is the distinction the old numbers lost.
 *
 * ALWAYS check all four. `?season=` (below) exists so this is 30 seconds.
 *
 * ── Where the cap comes from ───────────────────────────────────────────────
 *
 * Measured structural marks the app already shows a guest:
 *
 *     compass grid line (`cream 9%` over its pad)      1.288:1
 *     AttributeBar track (`cream/12` over card fill)   1.382:1
 *     ResultCard border (`cream/14` over its own fill) 1.459:1
 *
 * The band sits between the attribute track and the card border: a particle at
 * its nearest and brightest is no more assertive than the edge of a card. That
 * is the most this layer may ever be and still be ground (§4).
 *
 * The old cap was 1.288 — the compass grid line — because a translucent
 * compass pad let particles drift *inside* the signature interaction, and a
 * moving thing out-measuring the pad's own grid was a genuine figure/ground
 * inversion. `TasteCompass.tsx` now paints an opaque `bg-bg` floor under its
 * gradient, so a particle behind the compass measures exactly 1.00:1. That
 * failure mode is not merely unlikely now, it is architecturally impossible,
 * which is what released the cap to the card border.
 *
 * ── How to measure (get this right, it has been got wrong twice) ────────────
 *
 * Peak = a depth-1 particle at full `opacity`, over `--bg2`. Two traps:
 *
 * 1. A TRANSLUCENT CARD MAKES A PARTICLE LESS VISIBLE, NOT MORE. The canvas is
 *    z-0 and the whole app frame is z-10, so a card veil paints ON TOP of a
 *    particle: it scales the particle's luminance delta by (1 - veil) AND
 *    lifts the base the ratio is taken against. Both push the ratio down.
 *    Spring at 0.15 is 1.434:1 over bare `--bg2`, 1.421:1 under `bg-cream/6`,
 *    and 1.382:1 under the lightest card in the app. The open surround is the
 *    worst case; the cards never were. It follows that giving cards opaque
 *    floors would buy content cleanliness and ZERO headroom here — do not let
 *    anyone trade one for the other. (It was also measured and rejected on
 *    appearance: a flat `bg-bg` floor darkens a card by 1.13:1 where cards
 *    actually sit at 1440x900, rising to 1.20:1 at the top of the column,
 *    because cards currently composite over the live radial wash and not over
 *    flat `--bg`. That is a bigger visual change than the entire particle
 *    field it would be paying for.)
 *
 * 2. `--bg2` is the brightest ground, so it is where a particle is HARDEST to
 *    see, which is why the FLOOR is measured there. It is not where a particle
 *    is loudest — contrast ratio rises over a *darker* base, so the cap is
 *    strictly checked at `--bg2` too and has ~0.4% of slack at the inked
 *    surround edges (`globals.css` lays `--ink` at up to 38% down both sides
 *    above 48rem). Immaterial today; it stops being immaterial if anyone
 *    deepens the surround.
 *
 * ── Winter's `opacity` is NOT its peak alpha ────────────────────────────────
 *
 * `drawSnow` paints a halo at `alpha * 0.35` and then the core at `alpha` ON
 * TOP of it, so the core's effective alpha is `1 - (1 - 0.35a)(1 - a)`. At the
 * stated 0.10 that is 0.132. Winter's contrast figures above are computed on
 * the effective value; the stated one is 32% lower than what you see. This is
 * intentional (it is what makes a flake read soft without a gradient) but it
 * means winter's number is not comparable to the other three by eye.
 *
 * ── Summer's colour cap is retired, with evidence ──────────────────────────
 *
 * Summer was held at ~0.09 on the theory that its oklch-derived green would
 * "become legible as green" past that. Measured, no: the leaf resolves to
 * #a2ceb2, but the COMPOSITE over `--bg2` at 0.16 is #324a64 — oklch hue
 * 251.1° against the background's own 261.3°, with chroma DOWN from 0.070 to
 * 0.053. Adding the leaf desaturates and very slightly cools the indigo. It
 * does not introduce a hue; it removes a little of one. The green would only
 * return as a nameable colour at alphas far above this band.
 *
 * ── What would re-introduce the problem ────────────────────────────────────
 *
 *  - Removing the opaque `bg-bg` floor under the compass pad. That reinstates
 *    the old figure/ground inversion underneath numbers that are now much
 *    higher, and the cap would have to fall back to 1.288.
 *  - Lightening `--bg2`. Every number above is measured on it.
 *  - Raising `MAX_DENSITY_SCALE`. Contrast is per-particle; salience is
 *    contrast x count, and the cap and these opacities were solved together.
 *  - Tuning any single motif without re-checking the other three at
 *    `?season=`. That is the exact bug this trip-wire exists to prevent.
  */
export const SEASON_MOTIFS: Record<Season, SeasonMotif> = {
  spring: {
    season: "spring",
    shape: "sakura",
    count: 14,
    // 1.434:1 over --bg2 — mid-band, just under the ResultCard border's 1.459.
    opacity: 0.15,
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
  // Its green is the one hue §4 does not contain (see the file header). It was
  // once held to ~0.09 on the theory that the green would become nameable past
  // that; the composite measurement does not support it, and the cap is retired
  // — see the trip-wire for the oklch figures. What survives from that argument
  // is the direction: check the COMPOSITE, never the swatch. #a2ceb2 is a green
  // and #334966 is not, and only the second one ever reaches a guest's eye.
  summer: {
    season: "summer",
    shape: "leaf",
    count: 10,
    // 1.419:1. Was 0.07, which measured 1.16:1 and is the value a guest saw as
    // "not visible at all" on a phone. The old colour cap that held it there
    // did not survive measurement (see the trip-wire). Summer is still the
    // lowest-ink motif of the four by a wide margin — 10 small leaves rather
    // than 14 petals or 16 flakes — but each one is now as legible as any
    // other motif's. Still through sparseness, not through faintness.
    opacity: 0.16,
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

  // The lowest count of the four, because the momiji silhouette is the largest:
  // 0.476 of nominal size² against a sakura petal's 0.377 and a summer leaf's
  // 0.190 — so 1.26x a petal and 2.51x a leaf. Autumn's 8 against spring's 14
  // is a 1.75x cut, which together with the size cap is what lands it near
  // spring's weight rather than above it. (An earlier note here claimed 2.7x
  // vs the petal and that `count` tracked that ratio; both were wrong, and
  // acting on them would have cut autumn to ~5.)
  //
  // Its colour is a mix of --vermillion and --gold — the app's CTA accent and
  // its "this is the answer" accent. That is fine as a whisper and wrong as a
  // presence: the fridge badge's claim to being the only warm mass on a cold
  // screen is what the whole detail page rests on.
  autumn: {
    season: "autumn",
    shape: "momiji",
    count: 8,
    // 1.234:1 — the ONE motif deliberately below the 1.38 floor, and the only
    // exception in the band. Three reasons it is allowed and the others are
    // not:
    //
    //   - Its colour is intrinsically dark against indigo. Reaching 1.40 would
    //     take opacity 0.231, and momiji is the largest silhouette in the set
    //     (0.476 size² vs a petal's 0.377), so its ink would land at ~17.7 —
    //     ABOVE spring's 14.8, making the warmest motif the loudest thing on
    //     screen. That is backwards on its own terms.
    //   - Detection is contrast x area, and this is the biggest particle here.
    //     At 11.5 ink it is the second most present motif despite the lowest
    //     per-particle ratio; the low number is an artefact of measuring a dark
    //     warm colour against a dark cold ground.
    //   - It is the only WARM motif on a cold screen, and warmth is salience a
    //     luminance ratio does not score. The fridge badge's claim to being the
    //     only warm mass in the app outranks the extra contrast.
    //
    // If autumn ever needs more presence, raise LUMINANCE via the colour mix
    // (shift toward --gold-light), not alpha. Alpha buys ink it does not need.
    opacity: 0.15,
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
    // 1.416:1 — but note this is computed on an EFFECTIVE alpha of 0.132, not
    // the 0.10 stated here: `drawSnow` paints the core on top of its own halo.
    // See the trip-wire. Winter's stated number is not comparable by eye to the
    // other three, and is ~32% lower than what actually reaches the screen.
    opacity: 0.1,
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
 * The viewport every `count` above was tuned on: a 390x844 phone, ~329k px².
 */
const REFERENCE_VIEWPORT_AREA = 390 * 844;

/**
 * Ceiling on the area multiplier.
 *
 * Why there is a cap at all, given the invariant is ink per unit area: the
 * linear law is right about the eye and wrong about everything else past a
 * point. Uncapped, a 4K screen asks for ~55 sakura or ~63 snow, and the extra
 * area it is asking on behalf of is all *surround* — the reading column stops
 * growing at 25rem — so the particles buy progressively less of what the field
 * is for. Meanwhile the per-frame path budget is real: momiji is 40 segments
 * a particle, so 3x autumn is already ~960 path ops per frame.
 *
 * Why 3 and not 2.5: 3.0 covers the entire tablet-to-laptop range outright
 * (768x1024 needs 2.39, so nothing in that band is clipped at all) and it is
 * the largest multiplier that keeps the worst motif — winter — under 50
 * particles. 2.5 would have started clipping at ~823k px², i.e. inside the
 * tablet range, for no perf gain worth having.
 *
 * Note what the cap does NOT protect. A mid-range Android is ~360-412 CSS px
 * wide, so its multiplier is ~0.9-1.3 and it never comes near this ceiling —
 * the cheap devices are cheap *because* they are small. This bounds large
 * desktops, which is where the count would otherwise run away.
 */
export const MAX_DENSITY_SCALE = 3;

/**
 * How many particles this motif should have on a `width` x `height` viewport.
 *
 * `count` is per *screen* but the invariant the eye reads is ink per unit
 * *area*, so scaling by area is what PRESERVES the phone tuning rather than
 * breaking it. `size`, `speed` and the per-motif ink ratios are untouched by
 * this — only how many of them there are.
 *
 * Floored at 1x: below the reference viewport the linear law would keep
 * removing particles from a screen that already has the fewest, and there is a
 * point where a field reads as a few stray specks rather than as weather. The
 * reference count is that floor.
 */
export function particleCountFor(
  motif: SeasonMotif,
  width: number,
  height: number,
): number {
  const scale = Math.min(
    Math.max((width * height) / REFERENCE_VIEWPORT_AREA, 1),
    MAX_DENSITY_SCALE,
  );
  return Math.round(motif.count * scale);
}

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
 * Read the `?season=` preview, and keep it for the rest of the session.
 *
 * Returns a pinned `Season`, or `null` to mean "no preview, fall through".
 *
 * The write is the whole point. Without it, `?season=winter` would survive
 * exactly one screen: the guest journey is landing → taste → results → map →
 * detail, and the parameter is gone the moment anything navigates. Persisting
 * on read means the season is set once and holds for the walkthrough.
 *
 * `?season=auto` is the explicit clear. It is not the same as omitting the
 * parameter — omitting means "whatever was already pinned", `auto` means
 * "unpin, go back to the calendar".
 *
 * Every `sessionStorage` touch is guarded: Safari in private mode throws on
 * access rather than returning null, and an ambient background layer is the
 * last thing in the app that should be able to break a page by throwing.
 */
function readSeasonPreview(search: string): Season | null {
  if (typeof window === "undefined") return null;

  const requested = new URLSearchParams(search).get(SEASON_PARAM);

  if (requested === "auto") {
    try {
      window.sessionStorage.removeItem(SEASON_STORAGE_KEY);
    } catch {
      // Storage unavailable; nothing was ever stored, so nothing to clear.
    }
    return null;
  }

  if (isSeason(requested)) {
    try {
      window.sessionStorage.setItem(SEASON_STORAGE_KEY, requested);
    } catch {
      // Storage unavailable. The preview still applies to this page view, it
      // just will not survive the next navigation. Degrade, do not throw.
    }
    return requested;
  }

  // Absent, or unrecognised (`?season=banana`). Both fall through to whatever
  // is already pinned — an invalid value must not clear a valid preview.
  try {
    const stored = window.sessionStorage.getItem(SEASON_STORAGE_KEY);
    return isSeason(stored) ? stored : null;
  } catch {
    return null;
  }
}

/**
 * The season to render.
 *
 * ── Precedence, highest first ───────────────────────────────────────────────
 *
 *   1. `?season=spring|summer|autumn|winter` in the URL — and, once seen, the
 *      same value out of `sessionStorage` for the rest of the session.
 *      `?season=auto` clears it. Anything unrecognised is ignored.
 *   2. `SEASON_OVERRIDE`, the constant at the top of this file.
 *   3. The calendar, via `seasonForMonth`.
 *
 * `prefers-reduced-motion` is NOT in this chain and outranks all of it — see
 * `SeasonalAmbience`. Someone who asked for stillness gets no canvas whatever
 * the URL says. `/admin` likewise renders no ambience at all.
 *
 * ── Why `?season=` ships to production deliberately ────────────────────────
 *
 * It is not a leftover debug hook. The restaurant can preview a motif on the
 * live deploy without a redeploy, which is the difference between "change the
 * constant, push, wait for Vercel, look" and "open a link". It also makes the
 * one thing this file most needs — checking all four motifs — a 30-second job
 * rather than four rebuilds.
 *
 * That matters more than it sounds. A whole season shipped unnoticed at an
 * invisible opacity precisely because it was not the season during development
 * and nobody could cheaply look at it. See the trip-wire above.
 *
 * The exposure is a guest changing which leaves fall behind a menu, which is a
 * small easter egg rather than a risk. There is nothing behind this parameter
 * but a choice of silhouette.
 *
 * ── Client only ────────────────────────────────────────────────────────────
 *
 * Call this AFTER MOUNT. Both inputs are client-only: deriving a season from
 * `new Date()` during render is a hydration hazard (the server's clock and
 * timezone are not the guest's, so a build rendered in UTC on 31 August serves
 * "summer" to a phone in Kuala Lumpur that has already ticked into September),
 * and `window.location` does not exist on the server at all. The canvas only
 * exists client-side anyway, so the server never renders a season-dependent
 * tree and there is nothing to mismatch.
 *
 * `window.location.search` rather than `useSearchParams()` on purpose: the hook
 * would force a `<Suspense>` boundary around this component and opt every route
 * that renders it into dynamic rendering, which for a QR menu that wants to be
 * static and fast is a real cost for a parameter read once inside an effect.
 */
export function resolveSeason(
  now: Date = new Date(),
  search: string = typeof window === "undefined" ? "" : window.location.search,
): Season {
  const preview = readSeasonPreview(search);
  if (preview) return preview;

  return SEASON_OVERRIDE === "auto"
    ? seasonForMonth(now.getMonth())
    : SEASON_OVERRIDE;
}
