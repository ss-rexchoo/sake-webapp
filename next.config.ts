import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * `standalone` produces `.next/standalone` — a self-contained server plus only
   * the `node_modules` the build actually traced — so the ECS container image is
   * a few hundred MB instead of the whole dependency tree. See `Dockerfile`.
   *
   * ── Why this is conditional ─────────────────────────────────────────────────
   * It was originally set unconditionally, on the reasoning that standalone is
   * purely additive and Vercel would ignore the extra directory. That was wrong,
   * and it broke the first Vercel deploy:
   *
   *   Error: ENOENT: no such file or directory, open
   *   '/vercel/path0/.next/next-server.js.nft.json'
   *
   * Vercel's builder does not consume `.next/standalone`. It reads the
   * node-file-trace manifests (`*.nft.json`) that the DEFAULT output writes, and
   * standalone mode consumes those into its own bundle instead of leaving them
   * behind — so Vercel looks for a file that is no longer there.
   *
   * `VERCEL` is set by Vercel on every build, so this yields the default output
   * there and standalone everywhere else, including the Docker build. Both deploy
   * targets get what they need and neither needs a special build command.
   */
  output: process.env.VERCEL ? undefined : "standalone",

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
