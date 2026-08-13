/**
 * The Japan silhouette — plan v2 §7.
 *
 * Six selectable regions plus Shikoku, each a hand-authored SVG outline written
 * out as literal `d` data. No D3, no GeoJSON, no topojson, no map library and no
 * runtime projection (§3/§13/§16) — what ships is exactly what you see below.
 *
 * ── Why the shapes live in the component and not in the `regions` table ──────
 * `map_cx`/`map_cy` stay in the table because a label that collides with a
 * coastline is a real thing restaurant staff might want to nudge on a Tuesday
 * night. A coastline is not: nobody is going to hand-tune a bezier through an
 * admin form, and a half-edited outline would be a worse failure than a stale
 * label. So the outlines are source, the label anchors are data.
 *
 * ── Coordinate space ────────────────────────────────────────────────────────
 * Authored against real longitude/latitude and flattened with
 * `x = (lon - 128) * 14`, `y = (46 - lat) * 17.5` — an equirectangular
 * projection whose vertical stretch (1.25) matches the true ratio of a degree of
 * latitude to a degree of longitude at 36°N (1.23). That keeps the silhouette
 * honest without a projection library: the north-east to south-west arc, the
 * bend at Chubu, the western narrowing and the Pacific-side notch at Tokyo Bay
 * are all where they actually are. The outlines are then smoothed through those
 * points, so the result is stylised and calligraphic rather than surveyed —
 * roughly 20 to 60 control points per landmass, not 47 prefectures.
 *
 * Four places take deliberate liberties, all of them because the true figure
 * collapses at 350px wide: the Tsugaru, Kanmon and Seto straits are widened so
 * the islands read as islands rather than welding themselves to Honshu; Tokyo
 * Bay's mouth is opened so the notch survives two coastline strokes meeting;
 * Hokkaido's northern tip is blunted so the island reads chunky rather than as
 * a wedge; and Chugoku is deepened about a quarter so its own name fits inside
 * its coast. §7 asks for artistic, not precise.
 *
 * Regenerate with `node scripts/author-japan-paths.mjs` (an authoring aid, not a
 * build step — its output is pasted here by hand and committed).
 *
 * ── Where Kanto went ────────────────────────────────────────────────────────
 * The plan's six-region grouping has no Kanto, but Kanto is the land between
 * Tohoku and Chubu; leaving it out would put a hole in the middle of Honshu.
 * It is folded into **Chubu**, which is the adjacent group and literally means
 * "central". Chubu therefore carries the Tokyo Bay notch and the Boso peninsula.
 *
 * ── Where the internal borders come from ────────────────────────────────────
 * The four Honshu regions share their border vertices exactly, and those borders
 * are straight `L` runs rather than curves, so both sides trace an identical
 * polyline. Honshu reads as one landmass whose divisions are implied by the
 * seam, not as four floating blobs. Verified numerically: zero of ~24,700
 * sampled land points fall in more than one region.
 */

/** Left, top, right, bottom in viewBox units. */
export type Bounds = readonly [number, number, number, number];

export interface RegionPath {
  /** Closed outline. Filled, and stroked faintly — internal seams included. */
  readonly d: string;
  /**
   * The coastal part of `d` only, as an open path, stroked more strongly than
   * the fill outline. This is what makes Japan read as Japan: without it the
   * prefecture-style seams across Honshu are as loud as the shoreline. Absent on
   * the two islands, where the whole outline is coast.
   */
  readonly coast?: string;
  readonly bounds: Bounds;
  /** Fallback label anchor, used when the region row has no usable `map_cx`. */
  readonly label: readonly [number, number];
  /**
   * The range a staff-set `map_cx`/`map_cy` has to land in to be honoured.
   *
   * Derived, not guessed: every anchor on a half-unit grid was scored by how
   * much of the region's name lands inside its own coastline, and this is the
   * box of anchors that score within six points of the best one. A bounding-box
   * test would not do — several regions are much smaller than their own box, and
   * a stale coordinate landing in the corner of one would beat a good anchor.
   */
  readonly labelBox: Bounds;
}

/** Keyed by `regions.id`. A region with no entry here still renders — see `resolveShape`. */
export const REGION_PATHS: Record<string, RegionPath> = {
  hokkaido: {
    // Chunky rhomboid: Cape Soya blunted at the north, the Shiretoko flick to
//   the north-east, Cape Erimo and the Oshima peninsula forking south.
    d: "M192.6 7.7C193.9 6.7 198.2 6.1 200.8 7.4C203.3 8.6 204.7 12.2 207.5 15C210.2 17.9 213.3 21.5 217 24.2C220.7 26.8 225.4 30.5 229.3 30.8C233.3 31.1 239 25.3 240.2 25.9C241.5 26.5 236 31.5 236.9 34.3C237.7 37.1 246.3 39.8 245.3 42.4C244.3 44.9 235.1 46.2 231 49.4C226.9 52.5 223.9 57.8 221.2 60.9C218.5 64 218.1 68.1 215.3 67.4C212.6 66.6 208.3 58.6 205.1 56.5C201.9 54.5 200.3 54.6 196.7 55.3C193.1 56 187 60.5 183.7 60.6C180.3 60.6 177.7 54.1 177.1 55.6C176.5 57.2 181.1 66.1 180.3 69.7C179.5 73.2 174.7 76.5 172.5 76.3C170.3 76.1 167.2 72.4 167.4 68.2C167.7 64.1 172.5 56.5 173.9 52.2C175.2 47.8 173 44 175.3 42.7C177.6 41.4 184.6 47.3 187.3 44.4C190 41.6 190.1 31.2 191.1 25.9C192.1 20.6 193.2 16.4 193.5 13.3C193.7 10.2 191.4 8.7 192.6 7.7Z",
    bounds: [164.4, 4.4, 248.3, 79.3],
    // 100% of the word's box falls inside this outline.
    label: [208.4, 41.9],
    labelBox: [191.9, 31.9, 224.9, 52.4],
  },
  tohoku: {
    // Cape Todo on the Pacific side is Honshu's easternmost point; Mutsu Bay
//   notches the top.
    d: "M161.7 130.4C162.4 129.2 165.5 127.5 165.9 123.4C166.3 119.2 163.3 110.1 163.8 105.9C164.3 101.6 167.2 102.2 168.7 98.3C170.2 94.5 171.2 84.9 172.8 83C174.4 81 176.7 88 178.1 87.1C179.5 86.3 179.1 79.4 180.9 78.2C182.7 77.1 187.3 77.6 188.7 80.5C190.1 83.4 188.1 89.9 189.3 95.4C190.5 100.9 195.5 108 195.7 112.9C196 117.8 191.9 120.5 190.7 124.3C189.5 128 190.1 131.7 188.7 135.1C187.3 138.5 183.5 140.4 182.3 144.4C181.1 148.3 181.8 156 181.7 158.4L170.8 157.9L159.3 155L160.2 140.7Z",
    coast: "M161.7 130.4C162.4 129.2 165.5 127.5 165.9 123.4C166.3 119.2 163.3 110.1 163.8 105.9C164.3 101.6 167.2 102.2 168.7 98.3C170.2 94.5 171.2 84.9 172.8 83C174.4 81 176.7 88 178.1 87.1C179.5 86.3 179.1 79.4 180.9 78.2C182.7 77.1 187.3 77.6 188.7 80.5C190.1 83.4 188.1 89.9 189.3 95.4C190.5 100.9 195.5 108 195.7 112.9C196 117.8 191.9 120.5 190.7 124.3C189.5 128 190.1 131.7 188.7 135.1C187.3 138.5 183.5 140.4 182.3 144.4C181.1 148.3 181.8 156 181.7 158.4",
    bounds: [156.3, 75.2, 198.7, 161.4],
    // 100% of the word's box falls inside this outline.
    label: [179.8, 114.7],
    labelBox: [177.8, 105.2, 181.3, 119.2],
  },
  chubu: {
    // Carries Kanto (see above): the Boso peninsula and the Tokyo Bay notch, the
//   Izu and Atsumi peninsulas, and the Noto hook on the Japan Sea side.
    d: "M181.7 158.4C181.1 159.6 178.8 162.4 178.1 165.4C177.3 168.4 176.9 173.3 177.2 175.9C177.6 178.4 180.8 178 180.2 180.2C179.6 182.5 175.8 186.6 173.9 189C172 191.4 170.3 195.5 168.8 194.3C167.4 193 166.8 182.4 165.5 181.7C164.2 180.9 162.7 188.2 161.1 189.7C159.5 191.2 157.6 188.7 156.1 190.4C154.6 192.1 153.5 199.6 152 199.9C150.6 200.1 149.2 192.2 147.7 192.1C146.2 192.1 145.2 198.5 143.2 199.5C141.2 200.5 138.5 198 135.8 198.1C133.1 198.2 129.5 201 127.1 199.9C124.8 198.7 122.9 192.9 122.1 191.4L117.3 187.6L111.4 185.8L105.7 183.8C106.4 183.6 108.7 183.2 110 182.7C111.3 182.2 112.7 182.1 113.4 180.6C114.1 179.1 112.8 176.5 114 173.9C115.1 171.4 118.9 168.5 120.4 165.4C121.9 162.2 120.9 157.7 122.6 155.4C124.4 153.1 130 150.8 130.6 151.7C131.3 152.6 126.2 159.3 126.6 160.7C126.9 162 129.8 160.7 132.7 159.6C135.6 158.5 139.8 157.4 143.5 154.4C147.2 151.3 151.8 144.9 154.7 141.4C157.6 137.9 159.5 135.7 160.7 133.9C161.9 132 161.5 131 161.7 130.4L160.2 140.7L159.3 155L170.8 157.9Z",
    coast: "M181.7 158.4C181.1 159.6 178.8 162.4 178.1 165.4C177.3 168.4 176.9 173.3 177.2 175.9C177.6 178.4 180.8 178 180.2 180.2C179.6 182.5 175.8 186.6 173.9 189C172 191.4 170.3 195.5 168.8 194.3C167.4 193 166.8 182.4 165.5 181.7C164.2 180.9 162.7 188.2 161.1 189.7C159.5 191.2 157.6 188.7 156.1 190.4C154.6 192.1 153.5 199.6 152 199.9C150.6 200.1 149.2 192.2 147.7 192.1C146.2 192.1 145.2 198.5 143.2 199.5C141.2 200.5 138.5 198 135.8 198.1C133.1 198.2 129.5 201 127.1 199.9C124.8 198.7 122.9 192.9 122.1 191.4M105.7 183.8C106.4 183.6 108.7 183.2 110 182.7C111.3 182.2 112.7 182.1 113.4 180.6C114.1 179.1 112.8 176.5 114 173.9C115.1 171.4 118.9 168.5 120.4 165.4C121.9 162.2 120.9 157.7 122.6 155.4C124.4 153.1 130 150.8 130.6 151.7C131.3 152.6 126.2 159.3 126.6 160.7C126.9 162 129.8 160.7 132.7 159.6C135.6 158.5 139.8 157.4 143.5 154.4C147.2 151.3 151.8 144.9 154.7 141.4C157.6 137.9 159.5 135.7 160.7 133.9C161.9 132 161.5 131 161.7 130.4",
    bounds: [102.7, 127.4, 184.7, 202.9],
    // 100% of the word's box falls inside this outline.
    label: [143.7, 164.9],
    labelBox: [123.7, 159.4, 168.2, 189.9],
  },
  kansai: {
    // The Kii peninsula hanging south to Cape Shionomisaki, Osaka Bay above it,
//   the Tango peninsula on the Japan Sea side.
    d: "M122.1 191.4C122.4 193.2 123.6 199.6 124 202C124.5 204.3 126.2 203.8 124.6 205.5C123 207.1 117.5 209.3 114.8 211.8C112.1 214.2 111 219.3 108.9 219.8C106.8 220.3 104.2 217.3 102.6 214.9C101.1 212.5 99.6 208.7 99.8 205.8C100.1 202.9 104.4 199.1 104.2 197.7C103.9 196.4 101 197.6 98.3 197.7C95.6 197.9 89.9 198.3 88.2 198.5L89 190L91 180.6C91.9 180.7 94.7 181.2 96 181C97.4 180.7 97.5 178.7 99.1 179.2C100.8 179.7 104.6 183 105.7 183.8L111.4 185.8L117.3 187.6Z",
    coast: "M122.1 191.4C122.4 193.2 123.6 199.6 124 202C124.5 204.3 126.2 203.8 124.6 205.5C123 207.1 117.5 209.3 114.8 211.8C112.1 214.2 111 219.3 108.9 219.8C106.8 220.3 104.2 217.3 102.6 214.9C101.1 212.5 99.6 208.7 99.8 205.8C100.1 202.9 104.4 199.1 104.2 197.7C103.9 196.4 101 197.6 98.3 197.7C95.6 197.9 89.9 198.3 88.2 198.5M91 180.6C91.9 180.7 94.7 181.2 96 181C97.4 180.7 97.5 178.7 99.1 179.2C100.8 179.7 104.6 183 105.7 183.8",
    bounds: [85.2, 176.2, 127.6, 222.8],
    // 97% of the word's box falls inside this outline.
    label: [108.2, 193.7],
    labelBox: [103.2, 188.7, 110.7, 193.7],
  },
  chugoku: {
    // Honshu's narrowing western tail, ending at Shimonoseki. Deliberately ~25%
//   deeper north-to-south than the real thing so its own name fits inside it.
    d: "M88.2 198.5C87.1 199 86.3 200.3 81.9 201.6C77.5 202.9 67.3 204.3 62.3 206.2C57.3 208 56.1 211.7 52.5 212.5C48.9 213.2 41.8 212.8 40.9 210.7C39.9 208.6 44.7 203.1 46.9 200.4C49.1 197.7 51.6 196.8 53.9 195C56.2 193.1 58.1 192.1 60.2 189.7C62.3 187.3 64.1 182.5 66.5 180.6C68.9 178.7 70.8 178.5 74.2 178.5C77.6 178.5 83.7 180.4 86.5 180.8C89.4 181.1 90.2 180.6 91 180.6L89 190Z",
    coast: "M88.2 198.5C87.1 199 86.3 200.3 81.9 201.6C77.5 202.9 67.3 204.3 62.3 206.2C57.3 208 56.1 211.7 52.5 212.5C48.9 213.2 41.8 212.8 40.9 210.7C39.9 208.6 44.7 203.1 46.9 200.4C49.1 197.7 51.6 196.8 53.9 195C56.2 193.1 58.1 192.1 60.2 189.7C62.3 187.3 64.1 182.5 66.5 180.6C68.9 178.7 70.8 178.5 74.2 178.5C77.6 178.5 83.7 180.4 86.5 180.8C89.4 181.1 90.2 180.6 91 180.6",
    bounds: [37.9, 175.5, 94, 215.5],
    // 97% of the word's box falls inside this outline.
    label: [70.9, 196.5],
    labelBox: [64.4, 193, 73.9, 199.5],
  },
  kyushu: {
    // Rounded, with the Ariake notch on the west and the Satsuma/Osumi fork
//   around Kagoshima Bay at the south.
    d: "M38.5 215.2C36.6 215.3 33.1 219 30.5 220.3C27.9 221.6 25.1 221.7 23.2 223C21.4 224.2 19.9 225.6 19.6 227.8C19.3 230.1 20.1 234.9 21.6 235.9C23 236.9 26.9 233 28 233.8C29.1 234.6 28.4 237.8 28.3 240.5C28.2 243.1 27.4 246.5 27.4 249.2C27.4 251.9 28.3 253.7 28.3 256.2C28.2 258.7 26.4 263 27.2 263.9C28 264.8 31.4 261 33 261.4C34.7 261.9 35.7 267.2 37 266.5C38.2 265.8 39.1 259.6 40.6 257.3C42.1 254.9 43.8 255.9 45.6 252.7C47.5 249.5 51 243 51.5 238.7C52 234.4 48.5 230.2 48.4 227.1C48.4 224.1 52.4 221.7 51.2 220.5C50.1 219.3 43.9 220.7 41.7 219.8C39.6 218.9 40.4 215.2 38.5 215.2Z",
    bounds: [16.6, 212.2, 54.5, 269.5],
    // 98% of the word's box falls inside this outline.
    label: [34.6, 230.2],
    labelBox: [32.6, 225.7, 36.6, 231.7],
  },
};

/**
 * Shikoku — drawn, but not one of the six.
 *
 * The plan's grouping omits Shikoku, and it is not a place a guest can tap here.
 * But it is a real island sitting in the Seto Inland Sea between Chugoku and
 * Kansai, and a Japan with a hole where Shikoku should be reads as a broken
 * drawing rather than as a stylised one. Folding it into a neighbour was the
 * other option and it is simply wrong: Shikoku is not part of Chugoku or Kansai.
 *
 * So it is drawn as landmass and nothing else — quieter fill, no stroke, no
 * label, no hit target, `aria-hidden`. It completes the silhouette without
 * implying there is anything to tap.
 */
export const SHIKOKU: { readonly d: string; readonly bounds: Bounds } = {
  d: "M94.4 208.6C95.7 210.1 93.7 212.3 92.4 215.2C91.1 218.2 88.9 224.9 86.5 225.9C84.1 226.9 81.2 219.6 78.4 221.2C75.6 222.8 72.8 234.3 70.3 235.2C67.8 236.1 66.1 228.4 63.7 226.4C61.3 224.5 55.9 225.9 56.3 224C56.7 222.1 63.7 217.3 66.1 215.2C68.5 213.2 67.1 213.2 70.3 211.7C73.4 210.3 80.6 207.2 84.7 206.7C88.8 206.1 93.1 207.1 94.4 208.6Z",
  bounds: [53.3, 203.7, 97.4, 238.2],
};
