/**
 * Restaurant-editable configuration.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EDIT ME — this is the one place the venue's own wording lives.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `VENUE_LABEL` is the small uppercase kicker above the hero on the landing
 * screen (plan v2 §2). Keep it short — it is one line at 12px. If each table
 * gets its own QR code, something like "Table 12 · Sake bar" works; otherwise a
 * plain venue line is fine.
 *
 * Deliberately a constant rather than an inline string so the restaurant only
 * ever has to change one file.
 */
export const VENUE_LABEL = "Sake bar";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * The other editable knob lives in `src/lib/season.ts`: `SEASON_OVERRIDE`.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * It picks what drifts in the background — sakura, green leaves, momiji or
 * snow. Leave it on "auto" and it follows the calendar; set it to one season
 * name to pin that motif all year. Not re-exported here on purpose: the motif
 * definitions it belongs with are in that file, and one constant with two homes
 * is one constant somebody edits in the wrong place.
 */
