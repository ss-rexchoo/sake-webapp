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
    chip: "surface-14 text-cream",
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
    // `data-wide-shell` is read by `AppShell` (via `:has()`): this screen is a
    // list of three equal choices, not a single decision, so it takes the wider
    // column — 768px at `md`, 1088px at `lg` — and lays the cards out in a row.
    <main
      data-wide-shell
      className="flex flex-1 flex-col [justify-content:safe_center] pb-[6vh]"
    >
      {/*
       * The kicker labels the hero, so it stays tight to it.
       *
       * The hero block — kicker, title, English line — centres from `md`, where
       * the cards become a symmetric row of three. Left-flush is right on a
       * phone, where the hero and the cards share one edge; across 1024px it
       * would leave the title stranded in the top-left corner of a symmetric
       * triptych, which is the "stretched, not designed" look this widening
       * exists to avoid. The cards keep their own left-flush interior — only
       * the hero recentres, so the three tap targets still read as a list.
       */}
      <Kicker className="mb-1.5 md:text-center">{VENUE_LABEL}</Kicker>

      {/* The hero itself rides in on the route transition (see PageTransition);
          only the cards animate independently, so they read as arriving after it. */}
      {/* One step up from `md`, in step with `PageHeader` and the sake name —
          the hero stays the largest type in the app at every width. */}
      <h1 className="font-display text-[30px] leading-[1.3] font-bold md:text-center md:text-[34px]">
        今夜、どんな日本酒？
      </h1>
      <p className="mt-1 text-sm text-muted md:text-center">
        What kind of sake are you feeling tonight?
      </p>

      {/*
       * One column on a phone, a row of three equal columns from `md`.
       *
       * The stagger is untouched and needs to be: `staggerChildren` follows DOM
       * order, which in a row is left to right, so the same variants that make
       * the cards arrive top-to-bottom on a phone make them arrive
       * left-to-right on a laptop. Nothing here is breakpoint-aware.
       */}
      <motion.ul
        className="mt-[30px] flex flex-col gap-3 md:mt-9 md:flex-row md:gap-4 lg:gap-5"
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
          // `md:flex-1` with no basis: three items sharing the row equally,
          // and `min-w-0` so a long sub line wraps inside its card instead of
          // widening one column at the other two's expense.
          <li key={href} className="flex md:min-w-0 md:flex-1">
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
              // From `md` the card turns on its side: chip above the words
              // rather than beside them. A third of the row is ~229px at `md`,
              // and a horizontal card spends 86px of that on the chip, its gap
              // and the padding — leaving 143px of measure and a sub line that
              // wraps twice. Stacking hands the text the full card width and
              // buys height, which is the direction a tap target should grow.
              // `items-stretch` overrides the phone's `items-center` so the
              // text block fills the card; the chip keeps its own fixed size.
              //
              // One more step of padding at `lg`. The card's box grows sideways
              // there (229x162 at `md`, 328x143 without this) while its content
              // still stacks downwards, so the widest breakpoint is where a
              // portrait arrangement would sit in a landscape box. Growing the
              // padding rather than re-flipping the card keeps one shape across
              // both wide breakpoints, and buys the height a tap target wants.
              className="flex w-full items-center gap-3.5 rounded-lg border border-cream/14 surface-6 p-4 text-left transition-colors duration-200 hover:bg-cream/12 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none md:flex-col md:items-stretch md:gap-4 md:p-5 lg:gap-5 lg:p-6"
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
