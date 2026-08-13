import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // No `dark:` variants — the app is dark-only (`<html class="dark">`), so
        // shadcn's `dark:` rules are not a theme branch but unconditional rules
        // that outrank whatever a caller passes in `className`. Same fix as
        // `input.tsx`.
        //
        // `[@media(pointer:fine)]:text-sm` rather than `md:text-sm`: iOS Safari
        // zooms the page when a field under 16px receives focus, and `md` keys
        // that off viewport WIDTH — so an iPad in portrait (768–834px) crosses
        // into 14px and zooms on every tap, which is the exact thing `text-base`
        // is here to prevent. Pointer type is the real question being asked.
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [@media(pointer:fine)]:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
