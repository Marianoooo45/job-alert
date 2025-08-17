// ui/src/components/landing/Hero.tsx
// -------------------------------------------------------------
"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import * as React from "react";

const HERO_VIDEO = "/media/hero-city-loop-2x.mp4"; // add to public/media
const HERO_POSTER = "/media/hero-city.jpg"; // fallback image

export default function Hero() {
  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  // Parallax translate for media layer
  const yMedia = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const yOverlay = useTransform(scrollYProgress, [0, 1], [0, -20]);

  return (
    <section ref={ref} className="relative rounded-3xl overflow-hidden border border-border panel-xl min-h-[56vh] sm:min-h-[62vh]">
      {/* Media layer (video with photo fallback) */}
      <motion.div style={{ y: yMedia }} className="absolute inset-0">
        <video
          className="w-full h-full object-cover opacity-85"
          autoPlay
          loop
          muted
          playsInline
          poster={HERO_POSTER}
        >
          <source src={HERO_VIDEO} type="video/mp4" />
          {/* Fallback */}
          <img src={HERO_POSTER} alt="Cityscape finance" className="w-full h-full object-cover" />
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
          Offres centralisées, alertes intelligentes, suivi de candidatures. Conçu pour les étudiants et jeunes diplômés.
        </motion.p>

        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24, duration: 0.5 }}
        >
          <Link href="/" className="btn">Explorer les offres</Link>
          <Link href="/inbox" className="btn-ghost">Créer une alerte</Link>
        </motion.div>
      </div>
    </section>
  );
}
