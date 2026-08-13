"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  resolveSeason,
  SEASON_MOTIFS,
  type MotifShape,
  type SeasonMotif,
} from "@/lib/season";

/**
 * The seasonal ambient layer — sakura, leaves, momiji or snow drifting behind
 * the guest journey, chosen by the time of year (see `src/lib/season.ts`).
 *
 * ── The one rule this component has to keep ─────────────────────────────────
 * Plan v2 §4 puts the whole animation and polish budget on the taste compass.
 * This layer is a different register — atmosphere, not interaction — and it is
 * only allowed to exist as *ground*: slow, sparse, low-opacity, peripheral. If
 * it ever competes with the compass or the fridge badge for the eye, the fix is
 * to turn the numbers in `SEASON_MOTIFS` down, not to add more of it.
 *
 * ── Why canvas ──────────────────────────────────────────────────────────────
 * §16: the QR experience has to load fast on restaurant wifi and run on a
 * mid-range phone. Twenty transform-animated DOM nodes means twenty elements
 * the compositor and style engine carry on every frame, forever. One canvas and
 * one rAF loop is a single layer, gives real control over per-particle motion,
 * and adds no dependency — this is plain Canvas 2D.
 *
 * ── Why nothing renders on the server ───────────────────────────────────────
 * Everything this component needs — the date, the reduced-motion preference,
 * `devicePixelRatio`, the resolved token colours — is client-only. It returns
 * `null` until `useEffect` has run, so the SSR HTML contains no canvas at all
 * and there is no season-dependent tree to mismatch during hydration.
 */

/** Cap the canvas backing store at 2x. A 3x phone gains nothing visible here. */
const MAX_DPR = 2;

/**
 * ~30fps. After the density pass the motion is 7–19 px/sec, i.e. 0.23–0.63px of
 * travel per frame at this rate — sub-pixel, on a float translate, so halving
 * the frame budget is invisible and is a real battery saving on a guest's phone
 * mid-meal. Raise the speeds far enough and this cap stops being free.
 */
const FRAME_INTERVAL = 1000 / 30;

/**
 * Largest step a single frame may advance, in seconds. Without this, a phone
 * that slept for two minutes would resume with one enormous delta and teleport
 * every particle across the screen at once.
 */
const MAX_DT = 0.05;

/** Particles fade in and out over this many px at the top and bottom edges. */
const EDGE_FADE = 64;

/** How far past the bottom a particle travels before it is recycled. */
const RECYCLE_MARGIN = 40;

const TAU = Math.PI * 2;

interface Particle {
  /** Sway centre. The drawn x oscillates around this. */
  baseX: number;
  y: number;
  /** 0 = far (small, slow, faint), 1 = near. Couples size, speed and alpha. */
  depth: number;
  size: number;
  speed: number;
  alpha: number;
  swayAmp: number;
  swayRate: number;
  swayPhase: number;
  drift: number;
  spin: number;
  rotation: number;
  flutterRate: number;
  flutterPhase: number;
  color: string;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const lerp = (min: number, max: number, t: number) => min + (max - min) * t;
const pick = <T,>(values: readonly T[]) =>
  values[Math.floor(Math.random() * values.length)];

/**
 * Resolve a CSS colour expression to a concrete `rgb(...)` string.
 *
 * Canvas cannot read `var(--cream)` or evaluate `color-mix()` in `fillStyle`,
 * so the browser is asked to do it: set the expression on a throwaway element,
 * read back the computed colour. That keeps `season.ts` written in tokens
 * rather than hexes, and means the ambience follows the palette automatically
 * if a token is ever retuned.
 *
 * The fallback matters more than it looks. If the browser cannot parse an
 * expression, the probe keeps whatever colour it already had — so the reset
 * below is `--muted`, not the inherited cream. Cream is the body-text token and
 * the brightest thing in the palette; a browser too old for `color-mix(in
 * oklch, …)` would have rendered summer's leaves in the exact colour of text.
 * Degrading to muted makes an unparsed motif quieter, never louder.
 */
function resolveColors(expressions: readonly string[]): string[] {
  const probe = document.createElement("span");
  probe.style.position = "absolute";
  probe.style.opacity = "0";
  probe.style.pointerEvents = "none";
  document.body.appendChild(probe);

  const resolved = expressions.map((expression) => {
    probe.style.color = "var(--muted)";
    probe.style.color = expression;
    return getComputedStyle(probe).color || "rgb(154, 167, 189)";
  });

  probe.remove();
  return resolved;
}

function createParticle(
  motif: SeasonMotif,
  colors: string[],
  width: number,
  height: number,
  /** Seed the first fill across the whole screen; recycled ones start above it. */
  seeded: boolean,
): Particle {
  const depth = Math.random();

  return {
    baseX: Math.random() * width,
    y: seeded
      ? Math.random() * height
      : -EDGE_FADE - Math.random() * RECYCLE_MARGIN,
    depth,
    size: lerp(motif.size[0], motif.size[1], depth),
    speed: lerp(motif.speed[0], motif.speed[1], depth),
    // Near particles read slightly stronger than far ones. The 0.55 floor keeps
    // the whole field below the motif's stated peak alpha on average.
    alpha: motif.opacity * (0.55 + 0.45 * depth),
    swayAmp: rand(motif.sway[0], motif.sway[1]),
    swayRate: TAU / rand(motif.swayPeriod[0], motif.swayPeriod[1]),
    swayPhase: Math.random() * TAU,
    drift: rand(-motif.drift, motif.drift),
    spin: rand(motif.spin[0], motif.spin[1]) * (Math.random() < 0.5 ? -1 : 1),
    rotation: Math.random() * TAU,
    flutterRate: rand(motif.flutter[0], motif.flutter[1]),
    flutterPhase: Math.random() * TAU,
    color: pick(colors),
  };
}

/** A sakura petal: a rounded teardrop with the notch cherry blossom is known by. */
function tracePetal(ctx: CanvasRenderingContext2D, length: number) {
  const half = length / 2;
  const width = length * 0.62;

  ctx.beginPath();
  ctx.moveTo(0, -half);
  ctx.bezierCurveTo(
    width * 0.55,
    -length * 0.2,
    width * 0.5,
    length * 0.35,
    width * 0.18,
    half,
  );
  ctx.quadraticCurveTo(0, length * 0.3, -width * 0.18, half);
  ctx.bezierCurveTo(
    -width * 0.5,
    length * 0.35,
    -width * 0.55,
    -length * 0.2,
    0,
    -half,
  );
  ctx.closePath();
}

/** A plain lanceolate leaf. No midrib — at 8–14px a stroke would read as noise. */
function traceLeaf(ctx: CanvasRenderingContext2D, length: number) {
  const half = length / 2;
  const width = length * 0.46;

  ctx.beginPath();
  ctx.moveTo(0, -half);
  ctx.quadraticCurveTo(width * 0.62, -length * 0.06, 0, half);
  ctx.quadraticCurveTo(-width * 0.62, -length * 0.06, 0, -half);
  ctx.closePath();
}

/**
 * A momiji silhouette, traced in polar coordinates: `|cos(2.5θ)|` puts exactly
 * five maxima around the turn, and the fractional exponent broadens them into
 * maple lobes separated by narrow, deep sinuses. Cheaper and more controllable
 * than a hand-plotted 30-point path, and it closes cleanly because the function
 * returns to the same value at 0 and 2π.
 *
 * No serrated edge: a leaf here is 8–13px, so tooth detail is sub-pixel, and a
 * high-frequency radius term sampled at this rate aliases into an outline that
 * wobbles instead of reading as teeth — visible noise in exchange for detail
 * nobody can see. Five clean lobes are what makes it read as momiji at this size.
 *
 * `SQUASH` flattens it very slightly: a perfectly radially symmetric star reads
 * as a snowflake or a mark, and a real leaf is wider than it is long.
 */
const MOMIJI_SQUASH = 0.92;

function traceMomiji(ctx: CanvasRenderingContext2D, length: number) {
  const radius = length / 2;
  // 40, not 60. At the tuned size range (8–13px, so a 4–6.5px radius) the extra
  // 20 segments change the longest segment by 0.5px, because the longest one is
  // the sinus cut itself — a real V in the silhouette, not a sampling artefact.
  // The lobe curves are smooth well below this. 320 path ops per frame instead
  // of 480, for nothing visible.
  const steps = 40;

  ctx.beginPath();
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * TAU;
    // 0.26 base -> the sinuses cut to 26% of the radius; peak is exactly 1.0,
    // so the silhouette never exceeds the particle's stated size.
    const r = radius * (0.26 + 0.74 * Math.sqrt(Math.abs(Math.cos(2.5 * t))));
    const x = Math.sin(t) * r;
    const y = -Math.cos(t) * r * MOMIJI_SQUASH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Snow: a solid core inside a fainter halo, so it reads soft without a gradient. */
function drawSnow(
  ctx: CanvasRenderingContext2D,
  diameter: number,
  alpha: number,
) {
  const r = diameter / 2;

  ctx.globalAlpha = alpha * 0.35;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.9, 0, TAU);
  ctx.fill();

  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
}

function drawParticle(
  ctx: CanvasRenderingContext2D,
  shape: MotifShape,
  particle: Particle,
  x: number,
  alpha: number,
) {
  ctx.save();
  ctx.translate(x, particle.y);
  ctx.fillStyle = particle.color;

  if (shape === "snow") {
    // Snow does not rotate: a round flake spinning is motion nobody can see,
    // paid for on every frame.
    drawSnow(ctx, particle.size, alpha);
    ctx.restore();
    return;
  }

  ctx.rotate(particle.rotation);
  // The edge-on flutter. Squeezing the width rather than tilting in 3D is the
  // whole trick: a petal turning through the air is mostly a width change.
  // Floored at 0.25 so a particle never blinks fully out, which reads as flicker
  // at this opacity rather than as a leaf turning over.
  ctx.scale(0.25 + 0.75 * Math.abs(Math.cos(particle.flutterPhase)), 1);
  ctx.globalAlpha = alpha;

  if (shape === "sakura") tracePetal(ctx, particle.size);
  else if (shape === "leaf") traceLeaf(ctx, particle.size);
  else traceMomiji(ctx, particle.size);

  ctx.fill();
  ctx.restore();
}

export function SeasonalAmbience() {
  const pathname = usePathname();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // The motif is resolved after mount, on the client, on purpose — see the note
  // at the top of the file. `null` means "not decided yet", and also "reduced
  // motion, so never".
  const [motif, setMotif] = useState<SeasonMotif | null>(null);

  // Back of house. `/admin` was built deliberately quiet and utilitarian; a
  // petal field over an inventory form is the wrong room for it.
  const isAdmin = pathname?.startsWith("/admin") ?? false;

  useEffect(() => {
    if (isAdmin) return;

    // Reduced motion switches the layer OFF, not down. A drifting particle
    // field is vestibular-motion territory, and a slower version of it is still
    // the thing the preference is asking us not to do. The canvas is never
    // mounted, so there is no loop and no element to pay for.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    const sync = () => setMotif(reduced.matches ? null : SEASON_MOTIFS[resolveSeason()]);

    sync();
    reduced.addEventListener("change", sync);
    return () => reduced.removeEventListener("change", sync);
  }, [isAdmin]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (isAdmin || !motif || !canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const colors = resolveColors(motif.colors);
    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let last = 0;

    const resize = () => {
      const nextWidth = window.innerWidth;
      const nextHeight = window.innerHeight;
      if (nextWidth === width && nextHeight === height) return;

      // Keep the field where it was relative to the viewport rather than
      // re-seeding: on a phone the URL bar collapsing fires resize mid-scroll,
      // and a full re-seed there would look like the screen blinked.
      const scaleX = width > 0 ? nextWidth / width : 1;
      const scaleY = height > 0 ? nextHeight / height : 1;

      width = nextWidth;
      height = nextHeight;

      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      // setTransform, not scale: this runs on every resize and scale() would
      // compound.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (particles.length === 0) {
        particles = Array.from({ length: motif.count }, () =>
          createParticle(motif, colors, width, height, true),
        );
      } else {
        for (const p of particles) {
          p.baseX *= scaleX;
          p.y *= scaleY;
        }
      }
    };

    const step = (dt: number) => {
      for (const p of particles) {
        p.y += p.speed * dt;
        p.baseX += p.drift * dt;
        p.swayPhase += p.swayRate * dt;
        p.rotation += p.spin * dt;
        p.flutterPhase += p.flutterRate * dt;

        if (p.y > height + RECYCLE_MARGIN) {
          Object.assign(
            p,
            createParticle(motif, colors, width, height, false),
          );
        }

        // Wrap sideways so a steady wind never empties one edge of the screen.
        const bleed = p.size + p.swayAmp;
        if (p.baseX < -bleed) p.baseX = width + bleed;
        else if (p.baseX > width + bleed) p.baseX = -bleed;
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        // Fade at both edges so particles are never seen to pop in or out.
        const fade = Math.min(
          1,
          Math.max(0, (p.y + EDGE_FADE) / EDGE_FADE),
          Math.max(0, (height + EDGE_FADE - p.y) / EDGE_FADE),
        );
        if (fade <= 0) continue;

        const x = p.baseX + Math.sin(p.swayPhase) * p.swayAmp;
        drawParticle(ctx, motif.shape, p, x, p.alpha * fade);
      }

      ctx.globalAlpha = 1;
    };

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);

      const elapsed = now - last;
      if (elapsed < FRAME_INTERVAL) return;
      // Subtract the remainder rather than snapping to `now`, so the 30fps cap
      // does not slowly drift against the display's real refresh rate.
      last = now - (elapsed % FRAME_INTERVAL);

      step(Math.min(elapsed / 1000, MAX_DT));
      draw();
    };

    const start = () => {
      if (frame) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };

    const stop = () => {
      if (!frame) return;
      cancelAnimationFrame(frame);
      frame = 0;
    };

    // A hidden tab still gets rAF callbacks in some browsers, and always gets
    // them again the instant it returns. Stopping outright is both cheaper and
    // the only way the delta cap is not doing the work alone.
    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    resize();
    start();


    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", resize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      window.removeEventListener("resize", resize);
      window.removeEventListener("orientationchange", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [motif, isAdmin]);

  if (isAdmin || !motif) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      // `pointer-events-none` is the load-bearing one: the taste compass is a
      // drag surface covering most of its screen, and a full-viewport canvas
      // over it would swallow every gesture. z-0 against the app frame's z-10
      // is only about paint order.
      //
      // The fade-in matters because the field is seeded across the whole
      // viewport on the first frame rather than drifting in from above — which
      // would leave a minute of empty screen. Without it the particles would
      // simply appear mid-air. Done in CSS (tw-animate-css, already a
      // dependency) rather than with state, so it replays on remount and costs
      // no render.
      //
      // Linear over 2.2s, deliberately not an ease-out preset. An ease-out
      // front-loads: the field would reach ~80% in the first 300ms, landing on
      // top of PageTransition's 450ms entrance and then creeping for a second
      // afterwards — two arrivals competing. Linear and long enough that nobody
      // sees it arrive at all is the whole intent.
      className="pointer-events-none animate-in fade-in fixed inset-0 z-0 duration-[2200ms] ease-linear"
    />
  );
}
