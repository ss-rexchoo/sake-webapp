import type { Sake } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * A hand-authored sake bottle, drawn per record — the detail page's empty state
 * for `image_url` (plan v2 §9).
 *
 * ── Why a drawing and not a photograph ──────────────────────────────────────
 * Every seed record has `image_url: null`, and a restaurant will not photograph
 * its whole list before opening, so this is what most guests actually see. The
 * obvious fix — pulling product shots of Hakkaisan, Dassai, Juyondai — ships
 * someone else's trademarked brand photography inside a commercial app, which is
 * a licensing exposure the restaurant would carry. An inline SVG also costs zero
 * network bytes on restaurant wifi (§16) and needs no `next.config.ts` host
 * allowlist.
 *
 * ── Why it stays quiet ──────────────────────────────────────────────────────
 * §4/§9 make the fridge number the most dominant element on this page, and gold
 * is spent almost entirely on that badge. The glass is cream at 9.5% alpha, the
 * label paper at 15%, and the loudest mark in the drawing is a hairline at 30%
 * — all of it well under the 26px full-cream sake name directly beneath, let
 * alone under a 240px gold gradient carrying a 72px numeral. The bottle is
 * scene-setting, not signage.
 *
 * The ONE exception is the foil capsule, which is `--gold` at 30%. This was an
 * explicit design decision, not a drift: four treatments (no gold / gold
 * hairline contour / gold capsule / both) were rendered side by side and judged
 * against the real badge, and the capsule won. The reasoning worth keeping is
 * that "gold is reserved" is a rule about MASS, not about hue — the capsule is
 * ~4% of the drawing's area, sits at the top edge far from the badge, and is
 * gold because foil is gold rather than to claim importance. A gold contour, by
 * contrast, runs a gold line down the whole silhouette and does start competing.
 * If gold ever needs to come back out, take the capsule to `--cream` at 0.14;
 * do not put gold on the contour instead.
 *
 * Measured at 390x844: the drawing's ink mass (area weighted by contrast above
 * the page's indigo) is ~3,100, against ~7,500 for the sake name and ~271,000
 * for the fridge badge. It also has the lowest peak contrast of any content
 * region on the page — 4.2 : 1, where the attribute bars, the description, the
 * pills and the back button all peak between 8.7 and 12.0.
 *
 * ── Why nothing animates ────────────────────────────────────────────────────
 * This is a plain server component: no `"use client"`, no Motion, zero JS. The
 * hero already rises once as part of the page under `PageTransition`, and the
 * fridge badge owns the only ambient loop on the route. Giving the illustration
 * its own entrance would put a second thing in motion above the fold and start
 * an argument the badge is supposed to win. Nothing to strip for reduced motion,
 * because nothing moves.
 *
 * ── What varies, and what drives it ─────────────────────────────────────────
 * Three deterministic inputs, all read off the record itself — no `Math.random`,
 * no `Date.now`, so server and client markup are byte-identical and a bottle
 * looks the same on every render:
 *
 *   1. `category`   → silhouette + label motif. Daiginjo is the tall, slim,
 *                     long-necked bottle with a seal on the label; each step
 *                     down the polish ladder gets a little wider and shorter,
 *                     ending at the stout Honjozo. One input drives both so the
 *                     grade reads as a single coherent class of bottle rather
 *                     than as two unrelated knobs.
 *   2. `region_id`  → label configuration: a full-bleed wrap, a wrap plus a
 *                     kubikake neck ring, or a narrower pasted panel. Laid out
 *                     north to south, two regions per style, so every bottle
 *                     from one region shares a label convention and the map
 *                     screen's grouping survives into the detail page.
 *   3. `id`         → label height on the body (four steps). The smallest knob,
 *                     and the one that stops two bottles of the same grade from
 *                     the same region being pixel-identical.
 *
 * Deliberately NOT varied: colour, opacity, stroke weight, overall size. Those
 * are the dimensions that would let one bottle out-shout another, and the whole
 * point is that none of them does. Colour in particular was tried and cut — see
 * `GLASS_FILL`, which is the more interesting half of that story.
 */

/** Author-space. Rendered at 72x150 CSS px — the photo slot's exact height. */
const VIEW_W = 72;
const VIEW_H = 150;

/** Centre line of the bottle in author space. */
const CX = VIEW_W / 2;

/** Where the base sits, and its corner radius. */
const BASE_Y = 147;
const BASE_R = 3;

/** Where the glass starts, below the capsule's top edge. */
const LIP_Y = 3;

/**
 * FNV-1a, 32-bit. A hash and not an index because `region_id` is a free-text
 * slug and `id` is a uuid in production — neither is a number we can modulo, and
 * neither should need a lookup table maintained alongside it.
 */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

type Motif = "seal" | "column" | "rules" | "block";

interface Silhouette {
  /** Full width of the body, in author units. */
  bodyWidth: number;
  /** Full width of the neck. */
  neckWidth: number;
  /** Y at which the shoulder starts flaring out of the neck. */
  shoulderY: number;
  /** How far below `shoulderY` the shoulder finishes meeting the body. */
  shoulderDrop: number;
  motif: Motif;
}

/**
 * The polish ladder as a shape. Real bottles do not sort this neatly, but the
 * gradient — tall and slim for the most polished, stout for the most everyday —
 * is the association a guest already has, so the drawing borrows it rather than
 * inventing a private code nobody can read.
 */
const SILHOUETTES: Record<string, Silhouette> = {
  daiginjo: {
    bodyWidth: 38,
    neckWidth: 12,
    shoulderY: 44,
    shoulderDrop: 20,
    motif: "seal",
  },
  ginjo: {
    bodyWidth: 42,
    neckWidth: 13,
    shoulderY: 50,
    shoulderDrop: 21,
    motif: "column",
  },
  junmai: {
    bodyWidth: 46,
    neckWidth: 14,
    shoulderY: 55,
    shoulderDrop: 22,
    motif: "rules",
  },
  honjozo: {
    bodyWidth: 49,
    neckWidth: 15,
    shoulderY: 59,
    shoulderDrop: 23,
    motif: "block",
  },
};

/**
 * Most-specific first: "Junmai Daiginjo" and "Junmai Ginjo" both contain
 * "junmai", so testing junmai early would collapse three grades into one.
 * Anything unrecognised — including `null` — lands on the Junmai silhouette,
 * which is the ordinary table bottle and the honest default.
 */
function silhouetteFor(category: string | null): Silhouette {
  const c = category?.toLowerCase() ?? "";
  if (c.includes("daiginjo")) return SILHOUETTES.daiginjo;
  if (c.includes("ginjo")) return SILHOUETTES.ginjo;
  if (c.includes("honjozo")) return SILHOUETTES.honjozo;
  return SILHOUETTES.junmai;
}

/**
 * One glass, one contour, for every bottle — and the reason is worth keeping.
 *
 * This started as three tints: cream, a `--muted` lean and a `--vermillion` lean,
 * for the clear / green / amber glass sake is really bottled in, keyed off
 * `region_id`. Measured over `--bg` they composite to
 *
 *     clear rgb(43,54,76)   green rgb(39,52,76)   amber rgb(41,51,72)
 *
 * — a spread of 4/255 per channel, and WCAG 1.23 / 1.25 / 1.29 : 1. That is
 * invisible, and it cannot be rescued: at the 9–11% alpha this drawing has to
 * live at, 90% of every pixel is already the background, so the tint is 10% of a
 * difference between two colours that are themselves close. The only lever is
 * alpha, and taking the fill to the ~28% where the hues separate roughly triples
 * the drawing's ink mass past the sake name's — which is the one thing this
 * component may not do.
 *
 * The tinted *contour* was worse than useless: `--muted` and `--vermillion` are
 * both darker than `--cream`, so tinting the hairline only ever dimmed it —
 * 2.30 : 1 for cream against 1.92 : 1 for the muted lean, at which point the
 * outline was no stronger than the 1.92–1.97 : 1 label paper it was supposed to
 * contain and four of the twelve bottles lost their drawn edge. It also varied
 * visible weight, the one dimension this file promises not to vary.
 *
 * So colour is constant and `region_id` varies geometry instead, where a
 * difference actually survives being 9% opaque. See `LABEL_STYLES`.
 */
const GLASS_FILL = "var(--cream)";
const GLASS_ALPHA = 0.095;
const CONTOUR = "var(--cream)";

/**
 * Label configuration — the `region_id` knob.
 *
 * Three real conventions off real bottles, and all three survive at this size
 * because they change the label's *shape* rather than its colour:
 *
 *   `wrap`  a full-bleed band, clipped to the silhouette so it wraps the glass
 *   `neck`  the same band plus a kubikake — the narrow ring high on the neck
 *   `panel` a pasted panel narrower than the body, glass showing either side
 *
 * Explicit table rather than `hash(region_id) % 3`: with only six slugs the hash
 * put three regions on style 0, three on style 1 and none on style 2, so a third
 * of the vocabulary was dead code and nobody would ever have noticed. Six keys
 * are cheap; a silently unreachable branch is not. Anything outside the table —
 * a new region, or a null `region_id` — still resolves through the hash.
 */
type LabelStyle = "wrap" | "neck" | "panel";

const LABEL_STYLES: readonly LabelStyle[] = ["wrap", "neck", "panel"];

/** North to south, two regions per style. */
const REGION_LABEL: Record<string, LabelStyle> = {
  hokkaido: "wrap",
  tohoku: "wrap",
  chubu: "neck",
  kansai: "neck",
  chugoku: "panel",
  kyushu: "panel",
};

/**
 * How far up the body the label sits — the `id` knob.
 *
 * Four steps, not the three this shipped with. `hash("1") % 3` and
 * `hash("2") % 3` both land on the same step, and Hakkaisan and Kubota Senju are
 * both chubu and both resolve to the `ginjo` silhouette — so the one pair this
 * knob exists to separate was the one pair it failed on, and the two records
 * rendered identically. (The "twelve distinct SVGs" check missed it: `uid`
 * embeds the sake id in the clip and gradient names, so the *markup* differed
 * while the *picture* did not.) Mod 4 separates all three same-silhouette,
 * same-region pairs in the seed — (1,2), (3,4) and (11,12) — and 3 units per
 * step keeps the highest label clear of even the Honjozo's low shoulder.
 */
const LABEL_LIFTS = [0, 3, 6, 9];
const LABEL_HEIGHT = 38;
/** Gap between the bottom of the label and the base. */
const LABEL_FOOT = 12;
/**
 * How far a `panel` label insets from the body's edge, each side.
 *
 * 5 is a swept optimum, not a round number — do not "tidy" it. The body
 * specular's peak lands within 0.4u of the panel's left edge, so the inset
 * trades the two vertical edges off against each other, and the paper-to-glass
 * step measures 1.22 / 1.35 / 1.45 : 1 across the three panel silhouettes at 5.
 * Every other value flattens all three to ~1.20-1.27 and eats the motif's
 * margin: at 8 the seal has 2u of clearance left. Proportional insets
 * (`bodyWidth * 0.12`) are no better.
 *
 * For scale, this is the edge that replaced the cut glass tint: 15-28 RGB levels
 * of step, against the tint's 4. And it is carried as a hard edge rather than a
 * field difference, which is the reason it survives at 9% alpha where a colour
 * could not.
 */
const PANEL_INSET = 5;

/**
 * The bottle outline, as one closed path: capsule shoulder → neck → shoulder
 * curve → body → rounded base, mirrored back up the other side.
 *
 * Built as a single path rather than as stacked rectangles because it is also
 * used as the clip for everything inside — the label band, the highlight and
 * the edge shade are all drawn full-width and let the silhouette trim them, so
 * the label wraps exactly to the glass no matter which silhouette is in play.
 */
function bottlePath({
  bodyWidth,
  neckWidth,
  shoulderY,
  shoulderDrop,
}: Silhouette): string {
  const bh = bodyWidth / 2;
  const nh = neckWidth / 2;
  const lh = nh + 1.6;
  const shoulderEnd = shoulderY + shoulderDrop;

  return [
    `M ${CX - lh} ${LIP_Y}`,
    `L ${CX + lh} ${LIP_Y}`,
    `L ${CX + lh} ${LIP_Y + 5}`,
    `L ${CX + nh} ${LIP_Y + 8}`,
    `L ${CX + nh} ${shoulderY}`,
    `C ${CX + nh} ${shoulderY + 9} ${CX + bh} ${shoulderY + 5} ${CX + bh} ${shoulderEnd}`,
    `L ${CX + bh} ${BASE_Y - BASE_R}`,
    `Q ${CX + bh} ${BASE_Y} ${CX + bh - BASE_R} ${BASE_Y}`,
    `L ${CX - bh + BASE_R} ${BASE_Y}`,
    `Q ${CX - bh} ${BASE_Y} ${CX - bh} ${BASE_Y - BASE_R}`,
    `L ${CX - bh} ${shoulderEnd}`,
    `C ${CX - bh} ${shoulderY + 5} ${CX - nh} ${shoulderY + 9} ${CX - nh} ${shoulderY}`,
    `L ${CX - nh} ${LIP_Y + 8}`,
    `L ${CX - lh} ${LIP_Y + 5}`,
    "Z",
  ].join(" ");
}

/**
 * The mark on the label. Four fixed motifs rather than generated glyphs: a
 * generated one would sooner or later draw something that reads as a real kanji
 * or a real brewery's kamon, and this is explicitly *not* claiming to depict the
 * bottle it stands in for.
 */
function LabelMotif({ motif, y }: { motif: Motif; y: number }) {
  const mark = "var(--cream)";

  if (motif === "seal") {
    return (
      <g>
        <circle
          cx={CX}
          cy={y + 13}
          r={6.5}
          fill="none"
          stroke={mark}
          strokeOpacity={0.3}
          strokeWidth={1}
        />
        <rect x={CX - 9} y={y + 25} width={18} height={1.2} fill={mark} fillOpacity={0.22} />
        <rect x={CX - 6} y={y + 30} width={12} height={1.2} fill={mark} fillOpacity={0.18} />
      </g>
    );
  }

  if (motif === "column") {
    // Four marks stacked down the centre — the rhythm of tategaki, at a size
    // that can't be mistaken for characters. Offset 7, not 8: at 8 the stack
    // ended at y+33 in a 38-unit label, leaving 8 units of headroom against 5 of
    // foot and sitting visibly low. 7/6 matches the other three motifs.
    return (
      <g fill={mark} fillOpacity={0.26}>
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={CX - 1.6} y={y + 7 + i * 7} width={3.2} height={4} rx={0.6} />
        ))}
      </g>
    );
  }

  if (motif === "rules") {
    return (
      <g fill={mark}>
        <rect x={CX - 13} y={y + 9} width={26} height={1.4} fillOpacity={0.28} />
        <rect x={CX - 9} y={y + 17} width={18} height={1.2} fillOpacity={0.2} />
        <rect x={CX - 9} y={y + 22} width={18} height={1.2} fillOpacity={0.2} />
        <rect x={CX - 5} y={y + 27} width={10} height={1.2} fillOpacity={0.16} />
      </g>
    );
  }

  return (
    <g fill={mark}>
      <rect x={CX - 11} y={y + 9} width={22} height={9} rx={1.5} fillOpacity={0.19} />
      <rect x={CX - 11} y={y + 24} width={22} height={1.4} fillOpacity={0.24} />
      <rect x={CX - 7} y={y + 29} width={14} height={1.2} fillOpacity={0.16} />
    </g>
  );
}

export interface BottleArtProps {
  /** Only the three fields the drawing varies on — see the header comment. */
  sake: Pick<Sake, "id" | "category" | "region_id">;
  className?: string;
}

export function BottleArt({ sake, className }: BottleArtProps) {
  const shape = silhouetteFor(sake.category);
  const labelStyle =
    (sake.region_id != null ? REGION_LABEL[sake.region_id] : undefined) ??
    LABEL_STYLES[hash(sake.region_id ?? sake.id) % LABEL_STYLES.length];
  const labelY =
    BASE_Y -
    LABEL_FOOT -
    LABEL_HEIGHT -
    LABEL_LIFTS[hash(sake.id) % LABEL_LIFTS.length];

  const bh = shape.bodyWidth / 2;
  const nh = shape.neckWidth / 2;
  const path = bottlePath(shape);

  // A `panel` label is drawn to its own width; the other two are drawn full-bleed
  // and let the silhouette clip trim them to the glass.
  const labelX = labelStyle === "panel" ? CX - bh + PANEL_INSET : 0;
  const labelW =
    labelStyle === "panel" ? shape.bodyWidth - PANEL_INSET * 2 : VIEW_W;

  // Modelling widths are a fraction of the shape they sit on, not constants.
  // Fixed 6/10 gave the 38-unit Daiginjo 42% of its width modelled and the
  // 49-unit Honjozo 32%, so the slim bottle read rounder than the wide one.
  const bodyHighlightW = shape.bodyWidth * 0.16;
  const bodyShadeW = shape.bodyWidth * 0.26;
  const neckHighlightW = shape.neckWidth * 0.28;
  const neckShadeW = shape.neckWidth * 0.28;

  // Derived from the record, so two bottles on one document can never collide,
  // and the markup is identical on server and client. `useId` is unavailable
  // here on purpose — this stays a server component with no JS.
  const uid = `bottle-${sake.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <svg
      // Decorative: the sake's name is the <h1> immediately below, so alt text
      // here would just make a screen reader say the name twice.
      aria-hidden="true"
      role="presentation"
      focusable="false"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={cn("h-28 w-[4.03rem] shrink-0", className)}
    >
      <defs>
        <clipPath id={`${uid}-clip`}>
          <path d={path} />
        </clipPath>
        {/* Left-hand specular band: bright at the contour, gone by the middle.
            Horizontal, not vertical — glass catches light down its edge. */}
        <linearGradient id={`${uid}-hl`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--cream)" stopOpacity={0.05} />
          <stop offset="35%" stopColor="var(--cream)" stopOpacity={0.26} />
          <stop offset="100%" stopColor="var(--cream)" stopOpacity={0} />
        </linearGradient>
        {/* And the far edge turning away from it. Painted in the page's own
            background so the bottle rounds off into the page rather than being
            outlined against it. */}
        <linearGradient id={`${uid}-shade`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--bg)" stopOpacity={0} />
          <stop offset="100%" stopColor="var(--bg)" stopOpacity={0.45} />
        </linearGradient>
      </defs>

      <path d={path} fill={GLASS_FILL} fillOpacity={GLASS_ALPHA} />

      <g clipPath={`url(#${uid}-clip)`}>
        {/* Capsule over the neck — the one place this drawing spends gold.
            Denser than the glass, because foil is opaque and glass is not.

            Gold is otherwise reserved for the fridge badge (see the file header),
            and that rule still holds: what it forbids is gold competing for
            "this is the answer", which is a question of MASS, not of hue. The
            capsule is ~4% of the drawing's area at the very top, far from the
            badge, and it is gold for a physical reason rather than an emphatic
            one — sake capsules are foil. It reads as material.

            The alternatives were measured against the badge and rejected: a full
            gold contour puts a gold line down the entire silhouette, which is
            where the eye starts competing. Keep gold on the foil only.

            0.30 rather than the glass's 0.095 because foil is the one genuinely
            opaque part of a bottle; below ~0.22 it greys out and stops reading
            as metal at 72px wide. */}
        <rect
          x={0}
          y={0}
          width={VIEW_W}
          height={shape.shoulderY * 0.42}
          fill="var(--gold)"
          fillOpacity={0.3}
        />

        {/* Kubikake — the narrow ring high on the neck, below the capsule and
            above the shoulder, on the regions whose label style calls for one.

            One rule, on the top edge only, where the label band below has both:
            deliberate, and not an oversight to correct. Two rules 4.4u apart on
            a 6u band read as a stripe rather than as a ring, and with the light
            coming from the upper left the ring's lower edge is in shadow
            anyway. The asymmetry is the better drawing. */}
        {labelStyle === "neck" ? (
          <>
            <rect
              x={0}
              y={shape.shoulderY * 0.62}
              width={VIEW_W}
              height={6}
              fill="var(--cream)"
              fillOpacity={0.15}
            />
            <rect
              x={0}
              y={shape.shoulderY * 0.62}
              width={VIEW_W}
              height={0.8}
              fill="var(--cream)"
              fillOpacity={0.22}
            />
          </>
        ) : null}

        {/* Label paper. Full-bleed and clipped for `wrap`/`neck`, so it wraps to
            the glass edge; drawn to its own width for `panel`, so glass shows
            either side of it. `rx` only on the panel — a wrap has no visible
            vertical edge to round. */}
        <rect
          x={labelX}
          y={labelY}
          width={labelW}
          height={LABEL_HEIGHT}
          rx={labelStyle === "panel" ? 1.5 : 0}
          fill="var(--cream)"
          fillOpacity={0.15}
        />
        <rect
          x={labelX}
          y={labelY}
          width={labelW}
          height={0.8}
          fill="var(--cream)"
          fillOpacity={0.22}
        />
        <rect
          x={labelX}
          y={labelY + LABEL_HEIGHT - 0.8}
          width={labelW}
          height={0.8}
          fill="var(--cream)"
          fillOpacity={0.22}
        />

        <LabelMotif motif={shape.motif} y={labelY} />

        {/* Both sides of both masses are modelled. The neck is 22–32% of the
            drawing's height and only its top 42% is capsule, so leaving it lit
            on one side and flat on the other made a third of the bottle read as
            card stock — the same argument the two highlights below make. Each
            shade box ends exactly on its contour, so the gradient's 0.45 stop
            lands on the edge rather than short of it. */}
        <rect
          x={CX + bh - bodyShadeW}
          y={shape.shoulderY}
          width={bodyShadeW}
          height={VIEW_H}
          fill={`url(#${uid}-shade)`}
        />
        <rect
          x={CX + nh - neckShadeW}
          y={LIP_Y}
          width={neckShadeW}
          height={shape.shoulderY + 6}
          fill={`url(#${uid}-shade)`}
        />
        {/* Two highlights, not one: the body band is wider than the neck, so a
            single strip would be clipped away above the shoulder. */}
        <rect
          x={CX - bh + 2.5}
          y={shape.shoulderY}
          width={bodyHighlightW}
          height={VIEW_H}
          fill={`url(#${uid}-hl)`}
        />
        <rect
          x={CX - nh + 1.5}
          y={LIP_Y}
          width={neckHighlightW}
          height={shape.shoulderY + 6}
          fill={`url(#${uid}-hl)`}
        />
      </g>

      <path
        d={path}
        fill="none"
        stroke={CONTOUR}
        strokeOpacity={0.28}
        strokeWidth={1}
      />
    </svg>
  );
}
