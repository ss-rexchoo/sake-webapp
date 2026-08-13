"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Compass, MapPin, Search } from "lucide-react";
import { motion } from "motion/react";

import { Kicker } from "@/components/Kicker";
import { VENUE_LABEL } from "@/lib/config";
import {
  EASE_SOFT,
  HOVER_DURATION,
  ITEM_DURATION,
  ITEM_RISE,
  STAGGER_DELAY,
  STAGGER_STEP,
} from "@/lib/motion";

const MotionLink = motion.create(Link);

interface Method {
  href: string;
  title: string;
  sub: string;
  icon: LucideIcon;
  /** Chip background + icon colour, both token utilities. */
  chip: string;
}

/**
 * The three ways in — plan v2 §2. Order is deliberate: the guided path first,
 * because the whole product exists for the guest who does not know what to ask
 * for. Search is last: it only helps someone who already has a name.
 */
const METHODS: Method[] = [
  {
    href: "/taste",
    title: "Find my sake",
    sub: "Answer a couple of taste questions",
    icon: Compass,
    chip: "bg-vermillion/22 text-vermillion-light",
  },
  {
    href: "/map",
    title: "Explore Japan",
    sub: "Discover sake by region",
    icon: MapPin,
    chip: "bg-gold/22 text-gold-light",
  },
  {
    href: "/search",
    title: "Search sake",
    sub: "Know the name? Look it up directly",
    icon: Search,
    chip: "bg-cream/14 text-cream",
  },
];

/**
 * Animation props are static, never branched on `useReducedMotion()` — see the
 * note in `PageTransition`, whose `MotionConfig reducedMotion="user"` strips the
 * transforms for us without desynchronising server and client output.
 */
export default function LandingPage() {
  return (
    // The whole composition is optically centred with a slight top bias
    // (`pb-[6vh]`) rather than top-aligned: on a tall phone, top-aligning leaves
    // a third of the screen unexplained and pushes the three tap targets out of
    // comfortable one-handed reach. `safe` centring keeps the top of the block
    // reachable if content ever exceeds the viewport (landscape, large type),
    // where plain `justify-center` would clip it unscrollably.
    <main className="flex flex-1 flex-col [justify-content:safe_center] pb-[6vh]">
      {/* The kicker labels the hero, so it stays tight to it. */}
      <Kicker className="mb-1.5">{VENUE_LABEL}</Kicker>

      {/* The hero itself rides in on the route transition (see PageTransition);
          only the cards animate independently, so they read as arriving after it. */}
      {/* One step up from `md`, in step with `PageHeader` and the sake name —
          the hero stays the largest type in the app at every width. */}
      <h1 className="font-display text-[30px] leading-[1.3] font-bold md:text-[34px]">
        今夜、どんな日本酒？
      </h1>
      <p className="mt-1 text-sm text-muted">
        What kind of sake are you feeling tonight?
      </p>

      <motion.ul
        className="mt-[30px] flex flex-col gap-3"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: {
            transition: {
              delayChildren: STAGGER_DELAY,
              staggerChildren: STAGGER_STEP,
            },
          },
        }}
      >
        {METHODS.map(({ href, title, sub, icon: Icon, chip }) => (
          <li key={href} className="flex">
            <MotionLink
              href={href}
              variants={{
                hidden: { opacity: 0, y: ITEM_RISE },
                show: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: ITEM_DURATION, ease: EASE_SOFT },
                },
              }}
              // Transition scoped to the gesture so it doesn't clobber the
              // entrance above, and matched to the CSS surface brighten below —
              // one gesture, one timeline.
              whileHover={{
                y: -2,
                transition: { duration: HOVER_DURATION, ease: EASE_SOFT },
              }}
              whileTap={{ scale: 0.985 }}
              // No `ring-offset`: the offset paints a solid --bg band, but the
              // page behind is a radial gradient nearer --bg2 at the top, so the
              // band reads as a mismatched halo. A 2px gold ring is plenty.
              className="flex w-full items-center gap-3.5 rounded-lg border border-cream/14 bg-cream/6 p-4 text-left transition-colors duration-200 hover:bg-cream/12 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
            >
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-[10px] ${chip}`}
              >
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <span>
                <span className="block font-display text-base font-bold">
                  {title}
                </span>
                <span className="mt-0.5 block text-[12.5px] text-muted">
                  {sub}
                </span>
              </span>
            </MotionLink>
          </li>
        ))}
      </motion.ul>
    </main>
  );
}
