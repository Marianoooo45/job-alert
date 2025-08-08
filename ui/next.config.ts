// ui/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Laisse comme tu as
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  // 👇 Logos distants (Clearbit) + images Unsplash du hero
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "logo.clearbit.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
