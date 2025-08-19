// ui/src/components/landing/Hero.tsx
"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import * as React from "react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
// ⚠️ vérifie le nom exact de ton MP4 dans /public/media.
// Si ton fichier s'appelle "hero-city.mp4", remplace simplement la ligne ci-dessous.
const HERO_VIDEO_MP4 = `${BASE}/media/hero-city-loop.mp4`;
const HERO_VIDEO_WEBM = `${BASE}/media/hero-city.webm`;
const HERO_POSTER = `${BASE}/media/hero-city.jpg`;      // dark: poster
const HERO_DAY    = `${BASE}/media/hero-city-day.jpg`;  // light: image jour

export default function Hero() {
  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const yMedia = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const yOverlay = useTransform(scrollYProgress, [0, 1], [0, -20]);

  return (
    <section
      ref={ref}
      className="hero-section relative rounded-3xl overflow-hidden border border-border panel-xl min-h-[56vh] sm:min-h-[62vh]"
    >
      {/* --- MEDIA: vidéo en dark, image en light (la CSS choisit) --- */}
      <motion.div style={{ y: yMedia }} className="absolute inset-0 hero-media">
        {/* DARK = vidéo + image poster dessous en vrai fallback */}
        <div className="media-dark">
          {/* image sous la vidéo : s'affiche si la vidéo ne charge pas */}
          <img
            src={HERO_POSTER}
            alt="Cityscape (night)"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <video
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            poster={HERO_POSTER}
            onError={(e) => {
              // si la vidéo échoue, on la masque et le poster reste visible
              (e.currentTarget as HTMLVideoElement).style.display = "none";
            }}
          >
            <source src={HERO_VIDEO_WEBM} type="video/webm" />
            <source src={HERO_VIDEO_MP4} type="video/mp4" />
          </video>
        </div>

        {/* LIGHT = photo jour */}
        <img
          src={HERO_DAY}
          alt="City skyline (day)"
          className="media-light absolute inset-0 w-full h-full object-cover"
        />
      </motion.div>

      {/* --- SCRIMS (pilotées par variables de thème) --- */}
      <motion.div style={{ y: yOverlay }} className="absolute inset-0 hero-scrim" />
      {/* léger fondu vertical dark (garde ton rendu) */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,14,20,.30),transparent_40%,rgba(11,14,20,.55)_100%)]" />

      {/* --- CONTENU --- */}
      <div className="relative z-10 p-6 sm:p-10 flex flex-col gap-4 sm:gap-6 max-w-3xl">
        <motion.h1
          className="hero-title text-4xl sm:text-6xl font-semibold tracking-tight"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 0.9, 0.34, 1] }}
        >
          La plateforme d’opportunités <span className="neon-title">Finance</span>
        </motion.h1>

        <motion.p
          className="hero-sub text-lg sm:text-xl"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.5 }}
        >
          Offres centralisées, alertes intelligentes, suivi de candidatures. Conçu pour les étudiants et jeunes diplômés.
        </motion.p>

        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24, duration: 0.5 }}
        >
          <Link href="/offers" className="btn">Explorer les offres</Link>
          <Link href="/inbox" className="btn-ghost">Créer une alerte</Link>
        </motion.div>
      </div>
    </section>
  );
}
