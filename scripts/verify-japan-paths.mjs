/*
 * Geometric checks for the authored Japan paths. An authoring aid, not part of
 * the build and not imported by the app.
 *
 *   node scripts/author-japan-paths.mjs > scripts/out.json
 *   node scripts/verify-japan-paths.mjs
 *
 * Prints an ASCII render of the silhouette plus: Honshu region overlap, shared
 * border vertices, island strait widths, and label-box clearance. Useful because
 * this drawing cannot be checked by reading a screenshot.
 */
import fs from "node:fs";
const R = JSON.parse(fs.readFileSync(new URL("./out.json", import.meta.url), "utf8"));

/** Minimal parser for the restricted subset we emit: M, C, L, Z (absolute). */
function flatten(d, steps = 12) {
  const toks = d.match(/[MCLZ]|-?\d*\.?\d+/g);
  const pts = [];
  let i = 0, cur = [0, 0], start = [0, 0], cmd = null;
  const num = () => parseFloat(toks[i++]);
  while (i < toks.length) {
    if (/[MCLZ]/.test(toks[i])) cmd = toks[i++];
    if (cmd === "M") { cur = [num(), num()]; start = cur; pts.push(cur); }
    else if (cmd === "L") { cur = [num(), num()]; pts.push(cur); }
    else if (cmd === "C") {
      const c1 = [num(), num()], c2 = [num(), num()], p = [num(), num()];
      for (let s = 1; s <= steps; s++) {
        const t = s / steps, u = 1 - t;
        pts.push([
          u*u*u*cur[0] + 3*u*u*t*c1[0] + 3*u*t*t*c2[0] + t*t*t*p[0],
          u*u*u*cur[1] + 3*u*u*t*c1[1] + 3*u*t*t*c2[1] + t*t*t*p[1],
        ]);
      }
      cur = p;
    } else if (cmd === "Z") { pts.push(start); cur = start; i++; cmd = null; }
    else break;
  }
  return pts;
}

const inside = (poly, x, y) => {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
};

const ORDER = ["hokkaido", "tohoku", "chubu", "kansai", "chugoku", "kyushu", "shikoku"];
const CH = { hokkaido: "H", tohoku: "T", chubu: "C", kansai: "K", chugoku: "G", kyushu: "Y", shikoku: "s" };
const polys = Object.fromEntries(ORDER.map((k) => [k, flatten(R[k].d)]));

// --- ASCII render ----------------------------------------------------------
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
for (const k of ORDER) {
  const [a, b, c, d] = R[k].bounds;
  minX = Math.min(minX, a); minY = Math.min(minY, b);
  maxX = Math.max(maxX, c); maxY = Math.max(maxY, d);
}
console.log(`overall bounds  x ${minX}..${maxX}  y ${minY}..${maxY}  (w ${(maxX-minX).toFixed(1)} h ${(maxY-minY).toFixed(1)}, w/h ${((maxX-minX)/(maxY-minY)).toFixed(3)})`);

const COLS = 76, ROWS = 60;
const rows = [];
for (let r = 0; r < ROWS; r++) {
  let line = "";
  for (let c = 0; c < COLS; c++) {
    const x = minX + ((c + 0.5) / COLS) * (maxX - minX);
    const y = minY + ((r + 0.5) / ROWS) * (maxY - minY);
    let ch = ".";
    for (const k of ORDER) if (inside(polys[k], x, y)) { ch = CH[k]; break; }
    line += ch;
  }
  rows.push(line);
}
console.log(rows.join("\n"));

// --- overlap / gap checks --------------------------------------------------
const HONSHU = ["tohoku", "chubu", "kansai", "chugoku"];
let dbl = 0, land = 0;
const N = 500;
for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
  const x = minX + ((i + 0.5) / N) * (maxX - minX);
  const y = minY + ((j + 0.5) / N) * (maxY - minY);
  const hits = HONSHU.filter((k) => inside(polys[k], x, y));
  if (hits.length) land++;
  if (hits.length > 1) { dbl++; if (dbl <= 8) console.log("   overlap at", x.toFixed(1), y.toFixed(1), hits.join("+")); }
}
console.log(`\nHonshu overlap: ${dbl} of ${land} land samples in >1 region (${((dbl/land)*100).toFixed(3)}%)`);

// Shared-border vertices: every interior `L` vertex of a Honshu region must
// also appear in exactly one neighbour, or the two do not tile.
const lset = (d) => new Set((d.match(/L-?[\d.]+ -?[\d.]+/g) || []));
console.log("\ninterior border vertices per region:");
for (const k of ["tohoku", "chubu", "kansai", "chugoku"]) console.log(" ", k, [...lset(R[k].d)].join("  "));
for (const [a, b] of [["tohoku","chubu"],["chubu","kansai"],["kansai","chugoku"]]) {
  const A = lset(R[a].d), B = lset(R[b].d);
  const shared = [...A].filter((v) => B.has(v));
  console.log(`shared ${a}/${b}: ${shared.length} vertices -> ${shared.join(" ")}`);
}

// Centroid ordering.
console.log("");
for (const k of ORDER) {
  const [a, b, c, d] = R[k].bounds;
  console.log(`${k.padEnd(9)} centre (${((a+c)/2).toFixed(1)}, ${((b+d)/2).toFixed(1)})`);
}

// Strait widths: nearest-point distance between island pairs.
function nearest(p, q) {
  let best = Infinity, at = null;
  for (const A of p) for (const B of q) {
    const dd = Math.hypot(A[0]-B[0], A[1]-B[1]);
    if (dd < best) { best = dd; at = [A, B]; }
  }
  return [best, at];
}
const honshuAll = HONSHU.flatMap((k) => polys[k]);
for (const [a, name] of [["hokkaido", "Tsugaru (Hokkaido–Honshu)"], ["kyushu", "Kanmon (Kyushu–Honshu)"], ["shikoku", "Seto (Shikoku–Honshu)"]]) {
  const [dist] = nearest(polys[a], honshuAll);
  console.log(`${name}: ${dist.toFixed(1)} units (~${(dist*1.37).toFixed(1)}px at 390w)`);
}

// Seeded (ellipse-era) map_cx/map_cy from src/lib/data/mock.ts.
const SEEDED = { hokkaido: [195,55], tohoku: [168,142], chubu: [138,236], kansai: [116,322], chugoku: [90,400], kyushu: [68,466] };
console.log("");
for (const [k, [x, y]] of Object.entries(SEEDED)) {
  const [a,b,c,d] = R[k].bounds;
  const inBounds = x >= a && x <= c && y >= b && y <= d;
  console.log(`seeded ${k.padEnd(9)} (${x}, ${y}) inBounds:${String(inBounds).padEnd(5)} inPath:${inside(polys[k], x, y)}`);
}

// Label anchors inside their own polygon?
for (const k of ORDER.slice(0, 6)) {
  const [lx, ly] = R[k].label;
  console.log(`label ${k.padEnd(9)} (${lx}, ${ly}) inside: ${inside(polys[k], lx, ly)}`);
}

// --- label box clearance ---------------------------------------------------
// Approximate advance for Zen Kaku Gothic New at weight 400.
const NAME = { hokkaido: "Hokkaido", tohoku: "Tohoku", chubu: "Chubu", kansai: "Kansai", chugoku: "Chugoku", kyushu: "Kyushu" };
const SIZE = 9, ADV = 0.52;
console.log("\nlabel box clearance (5 sample points across the word):");
for (const k of ORDER.slice(0, 6)) {
  for (const [tag, anchor] of [["authored", R[k].label], ["seeded", SEEDED[k]]]) {
    if (!anchor) continue;
    const w = NAME[k].length * ADV * SIZE;
    let onLand = 0;
    for (let i = 0; i <= 4; i++) {
      const x = anchor[0] - w / 2 + (i / 4) * w;
      if (inside(polys[k], x, anchor[1])) onLand++;
    }
    console.log(`  ${k.padEnd(9)} ${tag.padEnd(8)} (${anchor[0]}, ${anchor[1]}) width ${w.toFixed(1)} -> ${onLand}/5 on land`);
  }
}
