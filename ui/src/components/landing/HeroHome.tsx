// ui/src/components/landing/HeroHome.tsx
// -------------------------------------------------------------
"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import * as React from "react";

/** H1 avec stagger mot par mot */
function StaggerTitle({ children }: { children: string }) {
  const words = children.split(" ");
  return (
    <span aria-label={children} className="inline-block">
      {words.map((w, i) => (
        <motion.span
          key={i}
          className="inline-block mr-2"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ delay: i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          {w}
        </motion.span>
      ))}
    </span>
  );
}

export default function HeroHome() {
  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  // Parallaxe douce + Ken Burns
  const y = useTransform(scrollYProgress, [0, 1], [0, -40]);     // -40px sur scroll
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.04]); // léger zoom

  return (
    <section
      ref={ref}
      className="relative rounded-3xl overflow-hidden border border-border panel-xl"
      aria-label="Hero"
    >
      {/* Vidéo de fond */}
      <motion.div style={{ y, scale }} className="absolute inset-0">
        <video
          className="h-full w-full object-cover opacity-[0.38]"
          autoPlay
          loop
          muted
          playsInline
          poster="/media/hero-city.jpg"
        >
          <source src="/media/hero-city.mp4" type="video/mp4" />
        </video>
      </motion.div>

      {/* Halo + scrim pour lisibilité */}
      <div className="absolute inset-0 bg-[radial-gradient(60%_120%_at_80%_-20%,rgba(187,154,247,.22),transparent),radial-gradient(60%_120%_at_0%_40%,rgba(247,118,142,.18),transparent)] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/35 md:to-black/25" />

      {/* Contenu */}
      <div className="relative z-10 p-6 sm:p-10">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-tight">
          <StaggerTitle>La plateforme d’opportunités</StaggerTitle>{" "}
          <motion.span
            className="text-primary neon-title inline-block"
            initial={{ backgroundPositionX: "0%" }}
            animate={{ backgroundPositionX: ["0%", "100%", "0%"] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            style={{
              backgroundImage:
                "linear-gradient(90deg,var(--color-primary),var(--color-secondary))",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            Finance
          </motion.span>
        </h1>

        <motion.p
          className="mt-3 text-lg text-muted-foreground/90 max-w-2xl"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35 }}
        >
          Offres centralisées, alertes intelligentes, suivi de candidatures. Conçu
          pour les étudiants et jeunes diplômés.
        </motion.p>

        <div className="mt-5 flex gap-3">
          <Link
            href="/"
            className="btn"
          >
            Explorer les offres
          </Link>
          <Link
            href="/?openAlert=1"
            className="btn-ghost"
            title="Ouvrir la modale de création d’alerte"
          >
            Créer une alerte
          </Link>
        </div>
      </div>
    </section>
  );
}
