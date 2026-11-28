import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // The social image route reads its TTF fonts and the logo from disk.
  outputFileTracingIncludes: {
    "/api/admin/social/**": ["./assets/fonts/**", "./public/brand/logos/comedy-radar-horizontal-dark.svg"],
  },
  experimental: {
    // Show and tour forms send up to two posters at once. The default 1 MB made
    // saving fail with an Error 500 (2026-11-27). Vercel accepts up to 4.5 MB;
    // the forms also shrink big posters in the browser before sending.
    serverActions: { bodySizeLimit: "4mb" },
  },
  // Admin Profiles was split into Comedians and Groups: old links still work.
  async redirects() {
    return [
      { source: "/admin/profiles/edit/comedian/:id", destination: "/admin/comedians/:id/edit", permanent: false },
      { source: "/admin/profiles/edit/group/:id", destination: "/admin/groups/:id/edit", permanent: false },
      { source: "/admin/profiles", has: [{ type: "query", key: "kind", value: "group" }], destination: "/admin/groups", permanent: false },
      { source: "/admin/profiles", destination: "/admin/comedians", permanent: false },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
