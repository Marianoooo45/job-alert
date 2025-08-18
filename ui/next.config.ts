// ui/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "logo.clearbit.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },

  async redirects() {
    return [
      // Ancienne home (table) -> /offers en conservant la query
      {
        source: "/",
        has: [{ type: "query", key: "page" }], // si on venait de liens /?page=...
        destination: "/offers",
        permanent: true,
      },
      // /home devient la home
      {
        source: "/home",
        destination: "/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
