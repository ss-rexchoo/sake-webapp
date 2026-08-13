"use client";

import type { ReactNode } from "react";
import { MotionConfig, motion } from "motion/react";

import { EASE_SOFT, PAGE_DURATION, RISE_DISTANCE } from "@/lib/motion";

/**
 * Route-level entrance — the prototype's `fadeSlideUp`, rebuilt in Motion.
 *
 * Mounted from `src/app/template.tsx`, which Next re-instantiates on every
 * navigation, so every route gets this for free without repeating it per page.
 *
 * ── Reduced motion ──────────────────────────────────────────────────────────
 * This is also the app's single `MotionConfig`, and `reducedMotion="user"` is
 * how the whole app honours the preference: Motion drops transform and layout
 * animations for every descendant, leaving opacity to crossfade so screens
 * still read as arriving rather than snapping. Later pieces inherit it for free.
 *
 * Deliberately NOT `useReducedMotion()` in the components themselves: that hook
 * returns `null` during SSR and `true` on a reduced-motion client, so branching
 * on it changes both the serialised `style` and which gesture props are present
 * — a guaranteed hydration mismatch for exactly the users we are trying to
 * accommodate. Keeping the props static and letting `MotionConfig` neutralise
 * them at animation time keeps server and client output identical.
 *
 * The wrapper is `relative` so absolutely positioned page chrome (BackButton)
 * anchors to it predictably — Motion drops `transform` once a value returns to
 * rest, so relying on the transform to establish a containing block would make
 * the anchor move mid-animation.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      {/* The entrance starts at opacity 0, and that initial style ships in the
          SSR HTML — so with JS disabled the screen would stay blank. Every route
          is server-rendered and every link is a real <a>, so the app is readable
          without JS; this just uncovers it.

          The second rule is the important one: it is not only this wrapper that
          ships `opacity:0`. Every `motion.*` element with an `initial` — result
          rows, the fridge badge, the reveal — serialises that initial style into
          the SSR HTML too, so a rule scoped to `.page-transition` alone left the
          most important element on the detail page invisible without JS. Matching
          the inline style by substring is the only way to reach them, since the
          values are inline and no class marks them. */}
      <noscript>
        <style>
          {".page-transition,.page-transition [style*=\"opacity:0\"]{opacity:1!important;transform:none!important}"}
        </style>
      </noscript>
      <motion.div
        className="page-transition relative flex flex-1 flex-col"
        initial={{ opacity: 0, y: RISE_DISTANCE }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: PAGE_DURATION, ease: EASE_SOFT }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}
