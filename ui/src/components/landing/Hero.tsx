// ui/src/components/landing/Hero.tsx
// -------------------------------------------------------------
"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import * as React from "react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const HERO_VIDEO_MP4 = `${BASE}/media/hero-city-loop.mp4`;
const HERO_VIDEO_WEBM = `${BASE}/media/hero-city.webm`;
const HERO_POSTER = `${BASE}/media/hero-city.jpg`;

export default function Hero() {
  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const yMedia = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const yOverlay = useTransform(scrollYProgress, [0, 1], [0, -20]);

  return (
    <section ref={ref} className="relative rounded-3xl overflow-hidden border border-border panel-xl min-h-[56vh] sm:min-h-[62vh]">
      {/* Media */}
      <motion.div style={{ y: yMedia }} className="absolute inset-0">
        <video
          className="w-full h-full object-cover"
          style={{ filter: "var(--hero-media-filter)" }}  // 👈 assombrit en light
          autoPlay loop muted playsInline preload="metadata" poster={HERO_POSTER}
          onError={(e) => {
            (e.currentTarget as HTMLVideoElement).style.display = "none";
            const img = new Image();
            img.src = HERO_POSTER; img.alt = "Cityscape finance";
            img.className = "w-full h-full object-cover";
            e.currentTarget.parentElement?.appendChild(img);
          }}
        >
          <source src={HERO_VIDEO_WEBM} type="video/webm" />
          <source src={HERO_VIDEO_MP4} type="video/mp4" />
        </video>
      </motion.div>

      {/* Scrim */}
      <motion.div style={{ y: yOverlay }} className="hero-scrim" />

      {/* Texte (blanc) */}
      <div className="relative z-10 p-6 sm:p-10 flex flex-col gap-4 sm:gap-6 max-w-3xl text-white">
        <motion.h1
          className="text-4xl sm:text-6xl font-semibold tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,.35)]"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5, ease: [0.22,0.9,0.34,1] }}
        >
          La plateforme d’opportunités <span className="neon-title">Finance</span>
        </motion.h1>

        <motion.p
          className="text-lg sm:text-xl text-white/90 drop-shadow-[0_2px_10px_rgba(0,0,0,.35)]"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .12, duration: .5 }}
        >
          Offres centralisées, alertes intelligentes, suivi de candidatures. Conçu pour les étudiants et jeunes diplômés.
        </motion.p>

        <motion.div className="flex items-center gap-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .24, duration: .5 }}>
          <Link href="/offers" className="btn">Explorer les offres</Link>
          <Link href="/inbox" className="btn-ghost">Créer une alerte</Link>
        </motion.div>
      </div>
    </section>
  );
}
