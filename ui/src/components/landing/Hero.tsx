// ui/src/components/landing/Hero.tsx
// -------------------------------------------------------------
"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import * as React from "react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ""; // "" si pas de basePath
const HERO_VIDEO_MP4 = `${BASE}/media/hero-city-loop.mp4`;
const HERO_VIDEO_WEBM = `${BASE}/media/hero-city.webm`; // optionnel si tu l’ajoutes
const HERO_POSTER = `${BASE}/media/hero-city.jpg`;

export default function Hero() {
  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  // Parallax translate for media layer
  const yMedia = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const yOverlay = useTransform(scrollYProgress, [0, 1], [0, -20]);

  return (
    <section
      ref={ref}
      className="relative rounded-3xl overflow-hidden border border-border panel-xl min-h-[56vh] sm:min-h-[62vh]"
    >
      {/* Media layer (video with photo fallback) */}
      <motion.div style={{ y: yMedia }} className="absolute inset-0">
        <video
          className="w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster={HERO_POSTER}
          onError={(e) => {
            // si la vidéo ne peut pas jouer, on affiche le poster à la place
            (e.currentTarget as HTMLVideoElement).style.display = "none";
            const img = new Image();
            img.src = HERO_POSTER;
            img.alt = "Cityscape finance";
            img.className = "w-full h-full object-cover";
            e.currentTarget.parentElement?.appendChild(img);
          }}
        >
          {/* Fallback codec-wise: WebM d’abord (VP9), puis MP4 (H.264) */}
          <source src={HERO_VIDEO_WEBM} type="video/webm" />
          <source src={HERO_VIDEO_MP4} type="video/mp4" />
        </video>
      </motion.div>

      {/* Color overlays */}
      <motion.div
        style={{ y: yOverlay }}
        className="absolute inset-0 bg-[radial-gradient(60%_120%_at_80%_-20%,rgba(187,154,247,.18),transparent),radial-gradient(60%_120%_at_0%_40%,rgba(247,118,142,.14),transparent)]"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,14,20,.30),transparent_40%,rgba(11,14,20,.55)_100%)]" />

      {/* Content */}
      <div className="relative z-10 p-6 sm:p-10 flex flex-col gap-4 sm:gap-6 max-w-3xl">
        <motion.h1
          className="text-4xl sm:text-6xl font-semibold tracking-tight"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 0.9, 0.34, 1] }}
        >
          La plateforme d’opportunités <span className="neon-title">Finance</span>
        </motion.h1>

        <motion.p
          className="text-lg sm:text-xl text-muted-foreground/90"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.5 }}
        >
          Offres centralisées, alertes intelligentes, suivi de candidatures.
          Conçu pour les étudiants et jeunes diplômés.
        </motion.p>

        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24, duration: 0.5 }}
        >
          {/* Nouveau bouton principal V2C */}
          <Link
            href="/offers"
            className="rounded-md bg-gradient-to-r from-indigo-700 to-fuchsia-600 
                       hover:from-indigo-800 hover:to-fuchsia-700 
                       px-4 py-2 text-sm font-semibold text-white 
                       shadow-[0_12px_36px_-12px_rgba(99,102,241,.55)] 
                       ring-1 ring-white/15 hover:ring-white/25 
                       focus:outline-none focus:ring-2 focus:ring-offset-2 
                       focus:ring-indigo-500 transition"
          >
            Explorer les offres
          </Link>

          {/* Bouton secondaire */}
          <Link href="/inbox" className="btn-ghost">
            Créer une alerte
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
