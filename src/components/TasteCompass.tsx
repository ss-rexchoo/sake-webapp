"use client";

import type { PointerEvent as ReactPointerEvent, KeyboardEvent } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
} from "motion/react";

import {
  DOT_HALO_DURATION,
  DOT_SPRING,
  EASE_SOFT,
  READOUT_FADE,
} from "@/lib/motion";
import { describeTaste } from "@/lib/recommend";
import type { TastePoint } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The taste compass — plan v2 §5, and the app's signature interaction (§4).
 *
 * ── Geometry ────────────────────────────────────────────────────────────────
 * Horizontal is sweetness: left edge = 0 (dry), right edge = 100 (sweet).
 * Vertical is body, and it is INVERTED against screen coordinates: the top edge
 * is `body: 100` (rich), the bottom edge is `body: 0` (light). Every conversion
 * between the two lives in `toPixels` / `toPoint` below and nowhere else.
 *
 * ── Why motion values and not React state ───────────────────────────────────
 * The dot's position is a pair of `MotionValue`s, so a drag moves it outside
 * the React render loop — no re-render per pointer frame. React state only
 * holds the two things a human actually perceives changing: the descriptor
 * under the pad, and whether a drag is in progress.
 *
 * ── The two gestures ────────────────────────────────────────────────────────
 * Grabbing the dot is a real Motion `drag`: 1:1 under the finger, because
 * direct manipulation that lags feels broken. Pressing anywhere else on the pad
 * springs the dot over to meet the finger and then follows it — that one has
 * physics, because the dot is travelling rather than being held.
 */

const KEY_STEP = 5;
const KEY_STEP_FINE = 1;

/** Visual dot diameter. The touch target around it is `HIT_SIZE`. */
const DOT_SIZE = 22;
/** 44px — the smallest comfortable touch target, centred on the dot. */
const HIT_SIZE = 44;

const clamp = (n: number) => Math.min(100, Math.max(0, n));

/** 9% cream, the prototype's grid line, expressed against the token. */
const GRID_LINE = "color-mix(in srgb, var(--cream) 9%, transparent)";

export interface TasteCompassProps {
  /**
   * Starting position. Read once, on mount — the compass owns its position
   * after that, so a parent re-render can never yank the dot out from under a
   * finger mid-drag.
   */
  defaultValue: TastePoint;
  /** Fired when a gesture settles or a key lands, not on every pointer frame. */
  onChange?: (point: TastePoint) => void;
  className?: string;
}

export function TasteCompass({
  defaultValue,
  onChange,
  className,
}: TasteCompassProps) {
  const padRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  /** Pad edge length in px. Mirrored into a ref so handlers read it without a dep. */
  const sizeRef = useRef(0);
  const [size, setSize] = useState(0);
  const [measured, setMeasured] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  /** Where the gesture is heading. During a spring flight this leads the dot. */
  const targetRef = useRef<TastePoint>(defaultValue);
  const padPointerId = useRef<number | null>(null);

  const [descriptor, setDescriptor] = useState(() =>
    describeTaste(defaultValue.sweetness, defaultValue.body),
  );
  /** The value announced to assistive tech — updated on settle, not per frame. */
  const [announced, setAnnounced] = useState<TastePoint>(defaultValue);
  const [dragging, setDragging] = useState(false);

  // Read inside handlers only, never during render: the hook returns null on the
  // server and `true` after mount on a reduced-motion client, so branching on it
  // in the returned markup would guarantee a hydration mismatch. See the note in
  // `PageTransition`.
  const reduceMotion = useReducedMotion();

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const hintId = useId();

  /*
   * The dot's travel is inset by its own radius at each edge.
   *
   * 0 and 100 therefore park the dot flush against the inside of the pad rather
   * than centred on its border. Both extremes stay reachable; the difference is
   * that the marker never leaves the field it is marking, which is the whole
   * claim this component makes about being an object rather than a control.
   *
   * Pointer taps are NOT inset (see `pointFromEvent`): pressing the very edge of
   * the pad should mean "all the way dry", and clamping does the rest.
   */

  /** Screen pixels → taste point. The single place the Y axis is flipped. */
  const toPoint = useCallback((px: number, py: number): TastePoint => {
    const span = Math.max(1, sizeRef.current - DOT_SIZE);
    return {
      sweetness: clamp(((px - DOT_SIZE / 2) / span) * 100),
      body: clamp(100 - ((py - DOT_SIZE / 2) / span) * 100),
    };
  }, []);

  /** Taste point → screen pixels. The inverse of `toPoint`. */
  const toPixels = useCallback((point: TastePoint) => {
    const span = Math.max(0, sizeRef.current - DOT_SIZE);
    return {
      px: DOT_SIZE / 2 + (clamp(point.sweetness) / 100) * span,
      py: DOT_SIZE / 2 + ((100 - clamp(point.body)) / 100) * span,
    };
  }, []);

  // The descriptor follows the dot itself, not the gesture's target, so the
  // readout changes as the dot crosses a threshold mid-flight. `setDescriptor`
  // returning `prev` unchanged is the whole point: a 60fps stream of motion
  // value events produces a React render only on the handful of frames where
  // the words actually differ.
  const syncDescriptor = useCallback(() => {
    if (!sizeRef.current) return;
    const here = toPoint(x.get(), y.get());
    const text = describeTaste(here.sweetness, here.body);
    setDescriptor((prev) => (prev === text ? prev : text));
  }, [toPoint, x, y]);

  useMotionValueEvent(x, "change", syncDescriptor);
  useMotionValueEvent(y, "change", syncDescriptor);

  /** Publish the settled value: to the parent (for the CTA link) and to AT. */
  const commit = useCallback(() => {
    const settled = targetRef.current;
    setAnnounced(settled);
    onChangeRef.current?.(settled);
  }, []);

  /**
   * Send the dot travelling to a point — used by taps, pad slides and the
   * keyboard. A direct drag never goes through here: Motion writes x/y itself,
   * because a held object that springs toward the finger reads as broken.
   *
   * Under reduced motion the spring is replaced by a `set`. Note this is read
   * inside a handler, never during render — see the `useReducedMotion` note above.
   */
  const moveTo = useCallback(
    (point: TastePoint) => {
      if (!sizeRef.current) return;
      const { px, py } = toPixels(point);
      targetRef.current = {
        sweetness: clamp(point.sweetness),
        body: clamp(point.body),
      };

      if (reduceMotion) {
        x.set(px);
        y.set(py);
        return;
      }
      animate(x, px, DOT_SPRING);
      animate(y, py, DOT_SPRING);
    },
    [reduceMotion, toPixels, x, y],
  );

  // Measure the pad and place the dot. Re-runs on rotate/resize, re-deriving the
  // pixel position from the taste point rather than scaling the old pixels, so
  // the guest's actual choice is what survives a rotation.
  useEffect(() => {
    const el = padRef.current;
    if (!el) return;

    const apply = (width: number) => {
      if (!width) return;
      sizeRef.current = width;
      setSize(width);
      const { px, py } = toPixels(targetRef.current);
      x.set(px);
      y.set(py);
      setMeasured(true);
    };

    apply(el.clientWidth);
    const observer = new ResizeObserver((entries) => {
      apply(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [toPixels, x, y]);

  /** Pointer coordinates → taste point, measured against the live pad rect. */
  const pointFromEvent = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      sweetness: clamp(((event.clientX - rect.left) / rect.width) * 100),
      body: clamp(100 - ((event.clientY - rect.top) / rect.height) * 100),
    };
  };

  const handlePadPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // Mouse: primary button only. Touch/pen have no button semantics to honour.
    if (event.pointerType === "mouse" && event.button !== 0) return;
    // A press that landed on the dot belongs to Motion's drag, not to us.
    if (event.target instanceof Node && dotRef.current?.contains(event.target)) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    padPointerId.current = event.pointerId;
    setDragging(true);
    moveTo(pointFromEvent(event));
    // Keep the keyboard and pointer on the same element, so tabbing back after a
    // tap resumes from where the guest left off. `focus-visible` keeps the ring
    // off for the touch case.
    dotRef.current?.focus({ preventScroll: true });
  };

  const handlePadPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (padPointerId.current !== event.pointerId) return;
    moveTo(pointFromEvent(event));
  };

  const endPadGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (padPointerId.current !== event.pointerId) return;
    padPointerId.current = null;
    setDragging(false);
    commit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? KEY_STEP_FINE : KEY_STEP;
    let { sweetness, body } = targetRef.current;

    switch (event.key) {
      case "ArrowLeft":
        sweetness -= step;
        break;
      case "ArrowRight":
        sweetness += step;
        break;
      // Up is rich, matching the axis label at the top edge.
      case "ArrowUp":
        body += step;
        break;
      case "ArrowDown":
        body -= step;
        break;
      case "Home":
        sweetness = 0;
        break;
      case "End":
        sweetness = 100;
        break;
      default:
        return;
    }

    event.preventDefault();
    moveTo({ sweetness: clamp(sweetness), body: clamp(body) });
    commit();
  };

  const valueText = `${describeTaste(announced.sweetness, announced.body)}, sweetness ${Math.round(announced.sweetness)} of 100, body ${Math.round(announced.body)} of 100`;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div
        ref={padRef}
        onPointerDown={handlePadPointerDown}
        onPointerMove={handlePadPointerMove}
        onPointerUp={endPadGesture}
        onPointerCancel={endPadGesture}
        className={cn(
          // Capped rather than fixed: on a 390px screen this is the widest
          // element on the page bar the CTA, which is what the signature
          // interaction deserves; on a narrow phone it simply fills the column.
          // The cap climbs with the column (320 → 376 → 400px) so the pad keeps
          // roughly the same share of the gutter at every width — the one
          // element in the app that most deserves the extra room gets it. All
          // the geometry below is derived from the measured `clientWidth`, so
          // growing the cap needs no other change: `toPoint`/`toPixels` and the
          // drag constraints follow the ResizeObserver.
          //
          // The `clamp` is not decoration. This pad is square, so a width cap is
          // also a height cap, and the breakpoints measure width only — a phone
          // in LANDSCAPE is 852x393 or 932x430, i.e. wider than `md` and barely
          // 400px tall. Keyed on width alone, the real device rotated would get
          // a 400px pad in a 393px viewport and push its own CTA off the screen.
          // So the cap is `clamp(320px, 50dvh, cap)`: half the viewport height
          // for the pad leaves the other half for the header above and the
          // readout plus CTA below, which is the actual budget, and the 20rem
          // floor means the pad is never smaller than it is on a phone today.
          // Growth is a bonus for screens with the height to spend; it can never
          // become a regression on one without it.
          "relative aspect-square w-full max-w-[20rem] touch-none select-none sm:max-w-[clamp(20rem,50dvh,23.5rem)] md:max-w-[clamp(20rem,50dvh,25rem)]",
          // `bg-bg` is an OPAQUE base under the gradient, not decoration. Every
          // other surface in the guest journey is cream/6–/12, so the seasonal
          // particle field shows *through* cards rather than passing behind
          // them. This pad is the worst case: it is the lightest surface in the
          // app (`from-gold/14` over `--bg`), and sRGB compositing is gamma-
          // space, so equal particle alpha lifts more here than anywhere else —
          // a sakura petal measured 1.17:1 over the pad against 1.29:1 for the
          // pad's own grid line. An opaque floor takes that to 1.00:1 and the
          // signature interaction stops having weather inside it. The fix
          // belongs here and not in the particle opacities, which are tuned as
          // ground and are another file's business.
          "rounded-[16px] bg-bg bg-linear-to-b from-gold/14 to-vermillion/10",
          // An inset ring rather than a border: a real border would shift the
          // padding box by 1px and put every pointer reading a pixel off the
          // motion values, which are measured against `clientWidth`.
          "ring-1 ring-cream/18 ring-inset",
          "cursor-crosshair",
        )}
      >
        {/* Grid at 25% intervals — quarters, so the pad reads as a field with
            landmarks rather than a slider with tick marks. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[16px]"
          style={{
            backgroundImage: `linear-gradient(${GRID_LINE} 1px, transparent 1px), linear-gradient(90deg, ${GRID_LINE} 1px, transparent 1px)`,
            backgroundSize: "25% 25%",
          }}
        />

        <AxisLabel className="top-2 left-1/2 -translate-x-1/2">Rich</AxisLabel>
        <AxisLabel className="bottom-2 left-1/2 -translate-x-1/2">
          Light
        </AxisLabel>
        <AxisLabel className="top-1/2 left-2 -translate-y-1/2">Dry</AxisLabel>
        <AxisLabel className="top-1/2 right-2 -translate-y-1/2">
          Sweet
        </AxisLabel>

        <motion.div
          ref={dotRef}
          role="slider"
          tabIndex={0}
          aria-label="Your taste"
          aria-describedby={hintId}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(announced.sweetness)}
          aria-valuetext={valueText}
          onKeyDown={handleKeyDown}
          drag
          // Numeric constraints clamp the x/y values themselves — the same
          // inset range `toPixels` maps to, so a drag cannot reach anywhere the
          // keyboard or a tap cannot. A ref-based constraint would clamp the
          // 44px hit box instead and quietly make 0 and 100 unreachable.
          dragConstraints={{
            left: DOT_SIZE / 2,
            right: Math.max(DOT_SIZE / 2, size - DOT_SIZE / 2),
            top: DOT_SIZE / 2,
            bottom: Math.max(DOT_SIZE / 2, size - DOT_SIZE / 2),
          }}
          dragElastic={0}
          dragMomentum={false}
          onDragStart={() => setDragging(true)}
          onDrag={() => {
            targetRef.current = toPoint(x.get(), y.get());
          }}
          onDragEnd={() => {
            targetRef.current = toPoint(x.get(), y.get());
            setDragging(false);
            commit();
          }}
          // The hit box is a geometric contract with `toPoint`, not a style
          // choice, so its numbers stay next to the constants that define them.
          // Anchored at the pad's origin and pulled back by half its own size,
          // so the x/y transform reads as the dot's CENTRE in pad coordinates.
          style={{
            x,
            y,
            width: HIT_SIZE,
            height: HIT_SIZE,
            margin: -HIT_SIZE / 2,
          }}
          className={cn(
            "absolute top-0 left-0 rounded-full",
            // Focus ring on the whole hit box, not the 22px dot: a keyboard user
            // should see the same target a finger gets.
            "focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none",
            // Held back until the pad has been measured, so the dot is never
            // painted in the top-left corner on the way to its real position.
            "transition-opacity duration-300",
            measured ? "opacity-100" : "opacity-0",
          )}
        >
          {/* Halo. A radial gradient rather than a blurred box shadow: it
              scales on the compositor, where an animated shadow spread or a
              filter would repaint the pad every frame on a phone. */}
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 rounded-full"
            style={{
              backgroundImage:
                "radial-gradient(circle, color-mix(in srgb, var(--vermillion) 48%, transparent) 0%, color-mix(in srgb, var(--vermillion) 22%, transparent) 55%, transparent 72%)",
            }}
            initial={false}
            animate={{ scale: dragging ? 1 : 0.78 }}
            transition={{ duration: DOT_HALO_DURATION, ease: EASE_SOFT }}
          />
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 m-auto block rounded-full border-2 border-cream bg-vermillion"
            style={{ width: DOT_SIZE, height: DOT_SIZE }}
            initial={false}
            animate={{ scale: dragging ? 1.12 : 1 }}
            transition={{ duration: DOT_HALO_DURATION, ease: EASE_SOFT }}
          />
        </motion.div>
      </div>

      <p id={hintId} className="sr-only">
        Use the arrow keys to move the mark. Left and right go from dry to
        sweet, up and down from light to rich. Hold shift for finer steps.
      </p>

      {/* Fixed height so the readout swapping never nudges the CTA under a
          thumb that is already reaching for it. */}
      <div className="relative mt-[18px] h-[1.625rem] w-full">
        {/* A true crossfade, not `mode="wait"`: the two lines are stacked in the
            same box, so the new words can arrive while the old ones leave. A
            sequential swap would blank the readout for the length of two
            transitions every time a drag crosses a threshold. */}
        <AnimatePresence initial={false}>
          <motion.p
            key={descriptor}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: READOUT_FADE, ease: EASE_SOFT }}
            className="absolute inset-x-0 top-0 text-center font-display text-[17px]"
          >
            {descriptor}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

function AxisLabel({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute text-[11px] tracking-[0.08em] text-gold-light uppercase select-none",
        className,
      )}
    >
      {children}
    </span>
  );
}
