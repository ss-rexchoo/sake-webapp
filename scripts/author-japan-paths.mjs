/*
 * Authoring tool for the Japan silhouette — plan v2 §7.
 *
 * NOT part of the build, not imported by the app, and its output is committed by
 * hand into src/components/map/shapes.ts. Kept because the next person to want a
 * different coastline should edit longitude/latitude, not bezier control points.
 *
 *   node scripts/author-japan-paths.mjs > scripts/out.json
 *
 * Control points are (lon, lat) so the silhouette stays geographically honest
 * while the emitted `d` is smooth/stylised. Output is pasted as literals into
 * src/components/map/shapes.ts — there is no runtime projection, no GeoJSON,
 * no dependency.
 */

// --- projection ------------------------------------------------------------
// Plate-carree-ish with a latitude stretch matching 1 deg lat / 1 deg lon at
// ~36N (111km / 90km = 1.23). Chosen so Japan's real proportions survive.
const LON0 = 128;
const LAT0 = 46;
const KX = 14;
const KY = 17.5;
const P = (lon, lat) => [ (lon - LON0) * KX, (LAT0 - lat) * KY ];

// --- Honshu coastline, clockwise from the north tip ------------------------
// `b:` marks an internal-boundary junction (shared vertex between two regions).
const HONSHU = [
  ["oma",         140.92, 41.53],
  ["shiriya",     141.48, 41.40],
  ["hachinohe",   141.52, 40.55],
  ["todo",        141.98, 39.55],
  ["kesennuma",   141.62, 38.90],
  ["oshika",      141.48, 38.28],
  ["soma",        141.02, 37.75],
  ["TC_PAC",      140.98, 36.95],
  ["hitachi",     140.72, 36.55],
  ["kashima",     140.66, 35.95],
  ["inubo",       140.87, 35.70],
  ["boso_e",      140.42, 35.20],
  ["nojima",      140.06, 34.90],
  ["tokyo_bay",   139.82, 35.62],
  ["miura",       139.51, 35.16],
  ["sagami",      139.15, 35.12],
  ["izu_tip",     138.86, 34.58],
  ["suruga",      138.55, 35.02],
  ["omaezaki",    138.23, 34.60],
  ["hamamatsu",   137.70, 34.68],
  ["atsumi",      137.08, 34.58],
  ["CK_PAC",      136.72, 35.06],
  ["toba",        136.86, 34.46],
  ["shima",       136.90, 34.26],
  ["owase",       136.20, 33.90],
  ["shionomisaki",135.78, 33.44],
  ["tanabe",      135.33, 33.72],
  ["wakayama",    135.13, 34.24],
  ["osaka",       135.44, 34.70],
  ["kobe",        135.02, 34.70],
  ["KC_SETO",     134.30, 34.66],
  ["okayama",     133.85, 34.48],
  ["hiroshima",   132.45, 34.22],
  ["tokuyama",    131.75, 33.86],
  ["shimonoseki", 130.92, 33.96],
  ["hagi",        131.35, 34.55],
  ["masuda",      131.85, 34.86],
  ["hamada",      132.30, 35.16],
  ["izumo",       132.75, 35.68],
  ["mihonoseki",  133.30, 35.80],
  ["tottori",     134.18, 35.67],
  ["KC_JSEA",     134.50, 35.68],
  ["kinosaki",    134.86, 35.66],
  ["amino",       135.08, 35.76],
  ["CK_JSEA",     135.55, 35.50],
  ["obama",       135.86, 35.56],
  ["tsuruga",     136.10, 35.68],
  ["fukui",       136.14, 36.06],
  ["kanazawa",    136.60, 36.55],
  ["noto_w",      136.76, 37.12],
  ["noto_tip",    137.33, 37.33],
  ["noto_e",      137.04, 36.82],
  ["uozu",        137.48, 36.88],
  ["naoetsu",     138.25, 37.18],
  ["niigata",     139.05, 37.92],
  ["murakami",    139.48, 38.35],
  ["TC_JSEA",     139.55, 38.55],
  ["sakata",      139.85, 38.95],
  ["oga",         139.70, 39.95],
  ["akita_n",     140.05, 40.38],
  ["tappi",       140.34, 41.26],
  ["mutsu_bay",   140.72, 41.02],
];

// Internal boundaries. Listed from their Pacific/Seto end to their Japan Sea
// end; endpoints are the shared coastline vertices above, so the four Honshu
// regions tile with no gap and no overlap.
const BORDERS = {
  // Fukushima's southern edge, then north up the Fukushima/Niigata spine.
  TC: [[140.98, 36.95], [140.20, 36.98], [139.38, 37.14], [139.44, 37.96], [139.55, 38.55]],
  // Head of Ise Bay, up the Gifu/Shiga divide to the Fukui/Kyoto coast.
  CK: [[136.72, 35.06], [136.38, 35.28], [135.96, 35.38], [135.55, 35.50]],
  // Hyogo's western edge — near-vertical, Seto to Japan Sea.
  KC: [[134.30, 34.66], [134.36, 35.14], [134.50, 35.68]],
};

// --- islands (closed rings, all soft) --------------------------------------
/*
 * Straits, nudged. Tsugaru (18km), Kanmon (0.7km) and the Seto Inland Sea are
 * all narrower than a stroke width at phone scale, so at true position Hokkaido
 * and Kyushu weld themselves onto Honshu and stop reading as islands. Each
 * island is offset by a fraction of a degree, away from Honshu and along the
 * axis it already sits on, which widens the water without moving anything
 * somewhere a reader would call wrong.
 */
const OFF = {
  hokkaido: [+0.10, +0.22],
  kyushu:   [-0.22, -0.22],
  shikoku:  [ 0.00, -0.16],
};

const HOKKAIDO = [
  [141.66, 45.34], // Cape Soya, blunted — at true length the north end
  [142.24, 45.36], // tapers to an acute wedge instead of reading as chunky.
  [142.72, 44.92],
  [143.40, 44.40],
  [144.28, 44.02], // Abashiri
  [145.06, 44.30], // Shiretoko tip — shortened; at true length the spit is
  [144.82, 43.82], // sub-pixel wide on a phone and reads as a rendering fault.
  [145.42, 43.36], // Nemuro / Nosappu
  [144.40, 42.96], // Kushiro
  [143.70, 42.30],
  [143.28, 41.93], // Cape Erimo
  [142.55, 42.55],
  [141.95, 42.62], // Tomakomai
  [141.02, 42.32], // Muroran
  [140.55, 42.60], // Uchiura Bay (notch)
  [140.78, 41.80], // Hakodate
  [140.22, 41.42], // Cape Shirakami
  [139.86, 41.88],
  [140.32, 42.80],
  [140.42, 43.34], // Shakotan
  [141.28, 43.24], // Ishikari Bay
  [141.55, 44.30],
  [141.72, 45.02],
];

const KYUSHU = [
  [130.97, 33.92], // Moji
  [130.40, 33.63], // Fukuoka
  [129.88, 33.48], // Karatsu
  [129.62, 33.20],
  [129.76, 32.74], // Nagasaki
  [130.22, 32.86], // Ariake (notch)
  [130.24, 32.48], // Kumamoto coast
  [130.18, 31.98],
  [130.24, 31.58], // Satsuma
  [130.16, 31.14], // Cape Nagasakibana
  [130.58, 31.28], // Kagoshima Bay (notch)
  [130.86, 30.99], // Cape Sata
  [131.12, 31.52],
  [131.48, 31.78], // Miyazaki
  [131.90, 32.58], // Cape Hyuga
  [131.68, 33.24], // Oita
  [131.88, 33.62], // Kunisaki
  [131.20, 33.66],
];

// Not selectable. Present because a Japan without Shikoku reads as broken.
const SHIKOKU = [
  [134.74, 34.24], // Naruto
  [134.60, 33.86],
  [134.18, 33.25], // Cape Muroto
  [133.60, 33.52],
  [133.02, 32.72], // Cape Ashizuri
  [132.55, 33.22], // Uwajima
  [132.02, 33.36], // Sada-misaki
  [132.72, 33.86], // Matsuyama
  [133.02, 34.06], // Imabari
  [134.05, 34.35], // Takamatsu
];

// --- smoothing --------------------------------------------------------------
const K = 0.17; // Catmull-Rom-ish tension. Higher = rounder/more calligraphic.
const R = (n) => Math.round(n * 10) / 10;

/** Closed ring -> smooth cubic path. */
function ringPath(pts) {
  const n = pts.length;
  const at = (i) => pts[(i + n) % n];
  let d = `M${R(pts[0][0])} ${R(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1 = [p1[0] + K * (p2[0] - p0[0]), p1[1] + K * (p2[1] - p0[1])];
    const c2 = [p2[0] - K * (p3[0] - p1[0]), p2[1] - K * (p3[1] - p1[1])];
    d += `C${R(c1[0])} ${R(c1[1])} ${R(c2[0])} ${R(c2[1])} ${R(p2[0])} ${R(p2[1])}`;
  }
  return d + "Z";
}

/** Open polyline -> smooth cubic path fragment (no leading M). */
function openSegments(pts, lead) {
  const n = pts.length;
  const at = (i) => pts[Math.max(0, Math.min(n - 1, i))];
  let d = "";
  for (let i = 0; i < n - 1; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1 = [p1[0] + K * (p2[0] - p0[0]), p1[1] + K * (p2[1] - p0[1])];
    const c2 = [p2[0] - K * (p3[0] - p1[0]), p2[1] - K * (p3[1] - p1[1])];
    d += `C${R(c1[0])} ${R(c1[1])} ${R(c2[0])} ${R(c2[1])} ${R(p2[0])} ${R(p2[1])}`;
  }
  return (lead ? `M${R(pts[0][0])} ${R(pts[0][1])}` : "") + d;
}

/** Polyline -> straight `L` run. Used for internal borders so both sides match. */
function linePath(pts) {
  return pts.map(([x, y]) => `L${R(x)} ${R(y)}`).join("");
}

// --- assembly ---------------------------------------------------------------
const coastXY = HONSHU.map(([, lon, lat]) => P(lon, lat));
const idx = Object.fromEntries(HONSHU.map(([name], i) => [name, i]));

/** Coastline slice from `a` to `b`, walking clockwise (wrapping). */
function slice(a, b) {
  const out = [];
  let i = idx[a];
  for (;;) {
    out.push(coastXY[i]);
    if (i === idx[b]) break;
    i = (i + 1) % coastXY.length;
  }
  return out;
}

const border = (k) => BORDERS[k].map(([lon, lat]) => P(lon, lat));
/** Interior vertices only — the endpoints are already coastline vertices. */
const inner = (pts) => pts.slice(1, -1);

function honshuRegion(id) {
  if (id === "tohoku") {
    const coast = slice("TC_JSEA", "TC_PAC");
    const b = border("TC"); // TC_PAC -> TC_JSEA
    return {
      d: openSegments(coast, true) + linePath(inner(b)) + "Z",
      coastD: openSegments(coast, true),
      pts: [...coast, ...b],
    };
  }
  if (id === "chugoku") {
    const coast = slice("KC_SETO", "KC_JSEA");
    const b = border("KC").slice().reverse(); // KC_JSEA -> KC_SETO
    return {
      d: openSegments(coast, true) + linePath(inner(b)) + "Z",
      coastD: openSegments(coast, true),
      pts: [...coast, ...b],
    };
  }
  if (id === "chubu") {
    const c1 = slice("TC_PAC", "CK_PAC");
    const c2 = slice("CK_JSEA", "TC_JSEA");
    const bCK = border("CK");                    // CK_PAC -> CK_JSEA
    const bTC = border("TC").slice().reverse();  // TC_JSEA -> TC_PAC
    return {
      d:
        openSegments(c1, true) +
        linePath(bCK.slice(1)) +
        openSegments(c2, false) +
        linePath(inner(bTC)) +
        "Z",
      coastD: openSegments(c1, true) + openSegments(c2, true),
      pts: [...c1, ...c2, ...bCK, ...bTC],
    };
  }
  if (id === "kansai") {
    const c1 = slice("CK_PAC", "KC_SETO");
    const c2 = slice("KC_JSEA", "CK_JSEA");
    const bKC = border("KC");                    // KC_SETO -> KC_JSEA
    const bCK = border("CK").slice().reverse();  // CK_JSEA -> CK_PAC
    return {
      d:
        openSegments(c1, true) +
        linePath(bKC.slice(1)) +
        openSegments(c2, false) +
        linePath(inner(bCK)) +
        "Z",
      coastD: openSegments(c1, true) + openSegments(c2, true),
      pts: [...c1, ...c2, ...bKC, ...bCK],
    };
  }
  throw new Error(id);
}

const shift = (ring, [dl, dt]) => ring.map(([lon, lat]) => P(lon + dl, lat + dt));
const islands = {
  hokkaido: shift(HOKKAIDO, OFF.hokkaido),
  kyushu: shift(KYUSHU, OFF.kyushu),
  shikoku: shift(SHIKOKU, OFF.shikoku),
};

const out = {};
for (const id of ["hokkaido", "kyushu", "shikoku"]) {
  const pts = islands[id];
  out[id] = { d: ringPath(pts), coastD: ringPath(pts), pts };
}
for (const id of ["tohoku", "chubu", "kansai", "chugoku"]) {
  out[id] = honshuRegion(id);
}

function bounds(pts) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  return [minX, minY, maxX, maxY].map(R);
}


// --- label placement --------------------------------------------------------
/*
 * A place name has to sit on the land it names. On an ellipse that was free; on
 * a coastline it is a search. For each region we flatten its own path, then
 * score every candidate anchor on a half-unit grid by how much of the word's box
 * lands inside the outline — and emit both the best anchor and the box of
 * anchors that score nearly as well, which is the range a staff member's
 * `map_cx`/`map_cy` has to fall inside to be honoured.
 */
const NAMES = { hokkaido: "Hokkaido", tohoku: "Tohoku", chubu: "Chubu", kansai: "Kansai", chugoku: "Chugoku", kyushu: "Kyushu" };
const LABEL_SIZE = 9;
const ADVANCE = 0.52;   // Zen Kaku Gothic New, weight 400, measured average.
const BOX_H = 7.4;      // cap height plus a little; descenders are rare here.

function flattenPath(d, steps = 16) {
  const t = d.match(/[MCLZ]|-?\d*\.?\d+/g);
  const out = []; let i = 0, cur = [0, 0], st = [0, 0], c = null;
  const num = () => parseFloat(t[i++]);
  while (i < t.length) {
    if (/[MCLZ]/.test(t[i])) c = t[i++];
    if (c === "M") { cur = [num(), num()]; st = cur; out.push(cur); }
    else if (c === "L") { cur = [num(), num()]; out.push(cur); }
    else if (c === "C") {
      const a = [num(), num()], b = [num(), num()], q = [num(), num()];
      for (let k = 1; k <= steps; k++) {
        const u = k / steps, v = 1 - u;
        out.push([
          v*v*v*cur[0] + 3*v*v*u*a[0] + 3*v*u*u*b[0] + u*u*u*q[0],
          v*v*v*cur[1] + 3*v*v*u*a[1] + 3*v*u*u*b[1] + u*u*u*q[1],
        ]);
      }
      cur = q;
    } else if (c === "Z") { out.push(st); cur = st; i++; c = null; }
    else break;
  }
  return out;
}

function inPoly(poly, x, y) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** Minimum clear space between two labels, in viewBox units. */
const LABEL_GAP_X = 11;
const LABEL_GAP_Y = 3.5;

function labelWidth(id) { return NAMES[id].length * ADVANCE * LABEL_SIZE; }

function scoreCandidates(id, d, bounds) {
  const poly = flattenPath(d);
  const w = labelWidth(id);
  const cover = (cx, cy) => {
    let on = 0, n = 0;
    for (let i = 0; i <= 14; i++) for (let j = 0; j <= 3; j++) {
      const x = cx - w / 2 + (i / 14) * w;
      const y = cy - BOX_H / 2 + (j / 3) * BOX_H;
      n++; if (inPoly(poly, x, y)) on++;
    }
    return on / n;
  };
  const cands = [];
  for (let x = bounds[0]; x <= bounds[2]; x += 0.5)
    for (let y = bounds[1]; y <= bounds[3]; y += 0.5)
      cands.push([R(x), R(y), cover(x, y)]);
  return cands;
}

/**
 * Place all six at once, most-constrained first, so no two words crowd.
 *
 * Coverage alone puts Chugoku and Kansai on the same baseline about four units
 * apart — less than a word-space, which reads as one run at 13px. Scoring each
 * candidate as `coverage minus overlap with what is already placed` separates
 * them without pushing either off its own coastline.
 */
function placeLabels(shapes) {
  const pool = {};
  for (const id of Object.keys(NAMES)) pool[id] = scoreCandidates(id, shapes[id].d, shapes[id].bounds);
  const order = Object.keys(NAMES).sort((a, b) => {
    const f = (k) => pool[k].filter((c) => c[2] >= 0.95).length;
    return f(a) - f(b);
  });
  const placed = [];
  const boxOf = (id, x, y) => {
    const w = labelWidth(id) / 2 + LABEL_GAP_X / 2, h = BOX_H / 2 + LABEL_GAP_Y / 2;
    return [x - w, y - h, x + w, y + h];
  };
  const out = {};
  for (const id of order) {
    const scored = pool[id].map(([x, y, cov]) => {
      const b = boxOf(id, x, y);
      let pen = 0;
      for (const q of placed) {
        const ox = Math.max(0, Math.min(b[2], q[2]) - Math.max(b[0], q[0]));
        const oy = Math.max(0, Math.min(b[3], q[3]) - Math.max(b[1], q[1]));
        pen += (ox * oy) / ((b[2] - b[0]) * (b[3] - b[1]));
      }
      return [x, y, cov, cov - pen];
    });
    const best = Math.max(...scored.map((c) => c[3]));
    const tied = scored.filter((c) => c[3] >= best - 0.005);
    const cx = (shapes[id].bounds[0] + shapes[id].bounds[2]) / 2;
    const cy = (shapes[id].bounds[1] + shapes[id].bounds[3]) / 2;
    const pick = tied.sort((a, b) => Math.hypot(a[0]-cx, a[1]-cy) - Math.hypot(b[0]-cx, b[1]-cy))[0];
    placed.push(boxOf(id, pick[0], pick[1]));
    const near = scored.filter((c) => c[3] >= Math.max(0.72, best - 0.06));
    out[id] = {
      anchor: [pick[0], pick[1]],
      cover: R(pick[2] * 100) / 100,
      box: [
        R(Math.min(...near.map((c) => c[0]))), R(Math.min(...near.map((c) => c[1]))),
        R(Math.max(...near.map((c) => c[0]))), R(Math.max(...near.map((c) => c[1]))),
      ],
    };
  }
  return out;
}

const ORDER = ["hokkaido", "tohoku", "chubu", "kansai", "chugoku", "kyushu"];

/** `bounds` is needed before the emit loop, so compute the boxes up front. */
const PREBOUNDS = {};
for (const id of [...ORDER, "shikoku"]) {
  const b = bounds(out[id].pts);
  PREBOUNDS[id] = { d: out[id].d, bounds: [R(b[0] - 3), R(b[1] - 3), R(b[2] + 3), R(b[3] + 3)] };
}
const PLACED = placeLabels(PREBOUNDS);

const result = {};
for (const id of [...ORDER, "shikoku"]) {
  const o = out[id];
  const b = bounds(o.pts);
  // Bezier control points can push slightly outside the hull of the vertices;
  // 3 units of slack covers it at this tension.
  const pad = 3;
  result[id] = {
    d: o.d,
    coastD: o.coastD,
    bounds: [R(b[0] - pad), R(b[1] - pad), R(b[2] + pad), R(b[3] + pad)],
    ...(NAMES[id]
      ? { label: PLACED[id].anchor, labelBox: PLACED[id].box, labelCover: PLACED[id].cover }
      : { label: null }),
    centroid: [R((b[0] + b[2]) / 2), R((b[1] + b[3]) / 2)],
  };
}

console.log(JSON.stringify(result, null, 2));
