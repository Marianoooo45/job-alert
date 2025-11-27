// ui/src/components/landing/Hero.tsx
"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import * as React from "react";
import { useTheme } from "next-themes";

const HERO_NIGHT = "/media/hero-city.jpg";      // dark
const HERO_DAY   = "/media/hero-city-day.jpg";  // light

export default function Hero() {
  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const yMedia   = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const yOverlay = useTransform(scrollYProgress, [0, 1], [0, -20]);

  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const currentTheme = (theme ?? resolvedTheme) === "light" ? "light" : "dark";
  const heroSrc = currentTheme === "light" ? HERO_DAY : HERO_NIGHT;

  return (
    <section
      ref={ref}
      className="hero-section relative overflow-hidden border border-border panel-xl min-h-[62vh] sm:min-h-[68vh] rounded-[26px]"
    >
      {/* MEDIA */}
      <motion.div style={{ y: yMedia }} className="hero-media absolute inset-0 z-0">
        {mounted && (
          <img
            key={currentTheme}
            src={heroSrc}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            decoding="async"
            onError={(e) => {
              if (currentTheme === "light") {
                (e.currentTarget as HTMLImageElement).src = HERO_NIGHT;
              }
            }}
          />
        )}
      </motion.div>

      <div className="hero-media-overlay" aria-hidden />

      {/* SCRIM global subtil */}
      <motion.div style={{ y: yOverlay }} className="hero-scrim-subtle absolute inset-0 z-[1]" />

      {/* CONTENU + nuage local (pas un panneau) */}
      <div className="hero-ink relative z-[2] p-6 sm:p-10 max-w-3xl flex flex-col gap-5 sm:gap-7">
        <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.28em] text-sky-100/80">
          <span className="pill glass-pill">Hong Kong</span>
          <span className="pill glass-pill">New York</span>
          <span className="pill gradient-pill">Finance de marché</span>
        </div>

        <motion.h1
          className="hero-title-readable text-4xl sm:text-6xl font-semibold tracking-tight drop-shadow-xl"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: .45 }}
        >
          La plateforme d'opportunités <span className="neon-title-readable">Finance</span>
        </motion.h1>

        <motion.p
          className="hero-sub-readable text-base sm:text-lg leading-relaxed text-slate-100/90"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: .45, delay: .08 }}
        >
          Offres centralisées, alertes intelligentes, suivi de candidatures. Conçu pour les étudiants et jeunes diplômés.
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: .45, delay: .16 }}
        >
          <Link href="/offers" className="btn btn-hero-enhanced shadow-cta">
            Explorer les offres
          </Link>
          <Link href="/inbox" className="btn-ghost btn-ghost-hero-enhanced glass-btn">
            Créer une alerte
          </Link>
        </motion.div>

        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 text-sm text-slate-200/90"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: .45, delay: .22 }}
        >
          {["Alertes temps réel", "Courbes trading & relances", "Expérience mobile premium"].map((item) => (
            <div key={item} className="feature-chip">
              <span className="dot" aria-hidden />
              <span>{item}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
