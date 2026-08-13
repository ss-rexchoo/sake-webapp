"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteSakeAction } from "@/app/actions/admin";
import { EMPTY_DELETE_STATE } from "@/app/actions/admin-types";

/**
 * Destructive, so it takes two deliberate taps and names what is being deleted
 * in between. A one-tap delete on a phone behind a bar is a wiped record.
 *
 * An inline confirm rather than a modal: it keeps the record on screen while
 * the question is being asked, and needs no dialog primitive or focus trap to
 * get right.
 */
export function DeleteSakeButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState(
    deleteSakeAction,
    EMPTY_DELETE_STATE,
  );

  const handled = useRef(EMPTY_DELETE_STATE);
  useEffect(() => {
    if (state === handled.current || state.status === "idle") return;
    handled.current = state;

    if (state.status === "success") {
      toast.success(state.message ?? "Deleted.");
      router.push("/admin");
    } else if (state.message) {
      // The confirm panel deliberately stays open on failure: nothing was
      // deleted, and collapsing it would hide the retry behind another tap.
      toast.error(state.message);
    }
  }, [state, router]);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1.5 self-start rounded-lg border border-vermillion/45 bg-vermillion/10 px-3.5 py-3 text-[13px] text-vermillion-light transition-colors hover:bg-vermillion/20 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
      >
        <Trash2 aria-hidden="true" className="size-3.5" />
        Delete this sake
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-2.5 rounded-lg border border-vermillion/45 bg-vermillion/15 p-3.5"
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="name_en" value={name} />

      <p className="text-[13px] leading-relaxed text-vermillion-light">
        Delete <span className="font-bold">{name}</span> for good? It disappears
        from the guest app straight away, and there is no undo.
      </p>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-lg bg-vermillion px-3 py-3 text-[13.5px] text-cream transition-colors hover:bg-vermillion-dark focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none disabled:opacity-60"
        >
          {pending ? "Deleting…" : "Yes, delete"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-lg border border-cream/20 bg-cream/8 px-4 py-3 text-[13.5px] text-cream transition-colors hover:bg-cream/16 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
        >
          Keep it
        </button>
      </div>
    </form>
  );
}
