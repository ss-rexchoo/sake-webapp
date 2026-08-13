import type { ReactNode } from "react";

import { PageTransition } from "@/components/PageTransition";

/**
 * A `template` rather than part of the layout: Next remounts templates on every
 * navigation, which is exactly what makes the entrance animation replay per
 * screen. The layout (AppShell) stays put around it, so the frame never blinks.
 */
export default function Template({ children }: { children: ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
