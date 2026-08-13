"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Input } from "@/components/ui/input";

/**
 * Chip editor over the `food_pairing text[]` column.
 *
 * A comma-separated text field would look simpler and quietly produce
 * `"Sashimi, Seafood"` as one tag the first time somebody typed a space wrong.
 * Each chip submits its own `food_pairing` entry, so the array that reaches
 * Postgres is exactly what is on screen.
 */
export function TagEditor({ initialTags }: { initialTags: string[] }) {
  const [tags, setTags] = useState(initialTags);
  const [draft, setDraft] = useState("");

  function addTag() {
    const value = draft.trim();
    if (!value) return;
    // Case-insensitive, so "Sashimi" and "sashimi" don't both end up on a card.
    if (tags.some((tag) => tag.toLowerCase() === value.toLowerCase())) {
      setDraft("");
      return;
    }
    setTags([...tags, value]);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-2">
      {tags.map((tag) => (
        <input key={tag} type="hidden" name="food_pairing" value={tag} />
      ))}

      {tags.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                onClick={() => setTags(tags.filter((t) => t !== tag))}
                aria-label={`Remove ${tag}`}
                // TagPill's colours, but not TagPill's 3px padding: that pill
                // is a label, this one is a destructive control a thumb has to
                // hit. py-1.5 takes it from 22px to ~29px.
                className="inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/15 py-1.5 pr-2 pl-3 text-[11.5px] text-gold-light transition-colors hover:bg-gold/25 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
              >
                {tag}
                <X aria-hidden="true" className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[12px] text-muted">No pairings yet.</p>
      )}

      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          // Enter inside a form submits it. Here it means "add this chip".
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addTag();
            }
          }}
          placeholder="Sashimi"
          aria-label="Add a food pairing"
          className="h-10"
        />
        <button
          type="button"
          onClick={addTag}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-cream/20 bg-cream/8 px-3 text-[13px] text-cream transition-colors hover:bg-cream/16 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
        >
          <Plus aria-hidden="true" className="size-3.5" />
          Add
        </button>
      </div>
    </div>
  );
}
