import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Produces `.next/standalone` — a self-contained server plus only the
   * `node_modules` the build actually traced — so the container image can be a
   * few hundred MB instead of shipping the whole dependency tree. See
   * `Dockerfile`.
   *
   * This is purely additive: `next build` writes the standalone directory *after*
   * the normal build and changes nothing about `.next/server` or the manifests,
   * so the Vercel prototype deploy is unaffected. Vercel's builder ignores the
   * extra directory (it costs a little build time and nothing else).
   */
  output: "standalone",

  /**
   * Security headers.
   *
   * These used to live in `vercel.json`, which ECS never reads. Defining them
   * here means both deploy targets — the Vercel prototype and the ECS/RDS
   * production service — get the same headers from the same source, rather than
   * the container quietly serving fewer. `vercel.json` keeps only what is
   * genuinely Vercel-specific (the framework hint and the Singapore region).
   */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      {
        // Back-of-house. Nothing under /admin should surface in a search result.
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
