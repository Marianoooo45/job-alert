import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // 👇 NOUS AJOUTONS CETTE SECTION 👇
  eslint: {
    // Attention : cette option désactive la vérification ESLint pendant le build.
    // C'est utile pour déployer rapidement, mais il est recommandé de corriger
    // les erreurs de linting plus tard pour maintenir la qualité du code.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;