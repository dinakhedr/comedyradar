import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
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
