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
      className="hero-section relative rounded-3xl overflow-hidden border border-border panel-xl min-h-[56vh] sm:min-h-[62vh]"
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

      {/* SCRIM géré par le thème */}
      <motion.div style={{ y: yOverlay }} className="hero-scrim absolute inset-0 z-[1]" />

      {/* CONTENU */}
      <div className="relative z-[2] p-6 sm:p-10 max-w-3xl flex flex-col gap-4 sm:gap-6">
        <motion.h1
          className="hero-title text-4xl sm:text-6xl font-semibold tracking-tight"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: .45 }}
        >
          La plateforme d’opportunités <span className="neon-title">Finance</span>
        </motion.h1>

        <motion.p
          className="hero-sub text-lg sm:text-xl"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: .45, delay: .08 }}
        >
          Offres centralisées, alertes intelligentes, suivi de candidatures. Conçu pour les étudiants et jeunes diplômés.
        </motion.p>

        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: .45, delay: .16 }}
        >
          <Link href="/offers" className="btn">Explorer les offres</Link>
          <Link href="/inbox" className="btn-ghost">Créer une alerte</Link>
        </motion.div>
      </div>
    </section>
  );
}
