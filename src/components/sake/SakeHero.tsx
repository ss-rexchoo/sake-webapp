import Image from "next/image";

import { BottleArt } from "@/components/sake/BottleArt";
import type { Sake } from "@/lib/types";

/**
 * The detail page's masthead — plan v2 §9: name (EN + JP), brewery, prefecture,
 * category, over the bottle image or its stand-in.
 *
 * ── The drawing is the normal path, not the error path ──────────────────────
 * Every seed record has `image_url: null` and a restaurant will not photograph
 * its whole list before opening, so the no-photo branch is what most guests will
 * actually see. It is therefore a deliberate illustration — `BottleArt`, a
 * hand-authored SVG varied per record — rather than a broken-image placeholder,
 * an empty box, or a single generic icon repeated twelve times. A real photo
 * still wins whenever one exists; the drawing is strictly the empty state.
 *
 * Both states stay cream/translucent rather than gold. Saturated gold is spent
 * once on this page, on the fridge badge (§4/§9); a gold mark here would put a
 * second warm mass above the fold and split the page's focus.
 *
 * `BottleArt` is drawn at exactly the photo's 150px height, so the hero — and
 * everything below it, including where the badge lands — does not shift when a
 * restaurant adds a photo to a record.
 *
 * Server component: nothing here animates on its own — the whole page rises
 * once under `PageTransition`.
 */
export function SakeHero({ sake }: { sake: Sake }) {
  const subline = [sake.name_jp, sake.brewery].filter(Boolean).join(" · ");
  const place = [
    sake.prefecture ? `${sake.prefecture}, Japan` : null,
    sake.category,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <header className="mt-8 mb-4 flex flex-col items-center text-center">
      {sake.image_url ? (
        <Image
          // `unoptimized` keeps this off the image optimizer, so a restaurant
          // can paste in any image host from the admin screen without anyone
          // editing `next.config.ts` remotePatterns to match.
          unoptimized
          src={sake.image_url}
          alt={`Bottle of ${sake.name_en}`}
          width={120}
          height={150}
          className="h-28 w-[5.6rem] rounded-2xl border border-cream/15 surface-6 object-cover"
        />
      ) : (
        <BottleArt sake={sake} />
      )}

      {/* 26 → 29px at `md`, the app's one type step up (~1.13, the same ratio
          the page header and landing hero take). `FridgeBadge` is sized against
          this number — it holds a ~2.76x ratio to the name's cap height — so if
          this changes, check that file too. */}
      <h1 className="mt-3 font-display text-[26px] leading-tight font-bold md:text-[29px]">
        {sake.name_en}
      </h1>

      {subline ? (
        <p className="mt-0.5 text-sm text-muted">
          {/* The Japanese name is Japanese text inside an English document —
              tagged so a screen reader switches voice instead of spelling it. */}
          {sake.name_jp ? <span lang="ja">{sake.name_jp}</span> : null}
          {sake.name_jp && sake.brewery ? " · " : null}
          {sake.brewery}
        </p>
      ) : null}

      {place ? (
        // Muted, not gold-light. The prototype's `.detail-loc` was gold-light,
        // but that was written for a page with no kicker above the attribute
        // bars. With one there, this line and "How it tastes" are two 12px
        // gold-light uppercase lines 24px apart, and the eye groups them — the
        // hero's last line starts reading as the taste section's label.
        // Muted is also the treatment `ResultCard` already gives the same
        // prefecture · category pair, so this is the consistent choice.
        <p className="mt-1 text-xs tracking-[0.06em] text-muted uppercase">
          {place}
        </p>
      ) : null}
    </header>
  );
}
