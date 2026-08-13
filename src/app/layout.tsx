import type { Metadata, Viewport } from "next";
import { Shippori_Mincho, Zen_Kaku_Gothic_New } from "next/font/google";

import { AppShell } from "@/components/AppShell";
import { SeasonalAmbience } from "@/components/SeasonalAmbience";
import "./globals.css";

const shipporiMincho = Shippori_Mincho({
  variable: "--font-shippori",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const zenKakuGothicNew = Zen_Kaku_Gothic_New({
  variable: "--font-zen-kaku",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sake Discovery",
  description: "Discover the sake that matches you tonight.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#16233d",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // `dark` is hardcoded: this app has one palette and no theme toggle.
      className={`dark ${shipporiMincho.variable} ${zenKakuGothicNew.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-body">
        {/* The seasonal drift, behind everything. A sibling of AppShell rather
            than a child so it is measured against the viewport, not the
            centred reading column, and so it renders nothing at all on the
            server — it decides its own season, and whether to exist, on the
            client. It excludes itself from /admin. */}
        <SeasonalAmbience />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
