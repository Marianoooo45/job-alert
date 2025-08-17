"use client";
import { motion } from "framer-motion";

export default function VideoHero() {
  // On ne dépend que de /public/media/*
  const src = "/media/hero-city.mp4";
  const poster = "/media/hero-city.jpg";

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border panel-xl">
      {/* Vidéo de fond */}
      <div className="absolute inset-0 -z-10">
        <video
          className="h-full w-full object-cover"
          src={src}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          // Fallback : si la vidéo ne peut pas jouer, on masque l’élément (on garde le poster en bg via le style ci-dessous)
          onError={(e) => {
            const el = e.currentTarget;
            el.style.display = "none";
          }}
        />
        {/* Poster si la vidéo est bloquée ou le réseau lent */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${poster})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          aria-hidden
        />
        {/* Voiles & halos */}
        <div className="absolute inset-0 bg-[radial-gradient(60%_120%_at_80%_-20%,rgba(187,154,247,.22),transparent),radial-gradient(60%_120%_at_0%_40%,rgba(247,118,142,.18),transparent)]" />
        <div className="absolute inset-0 bg-black/35" />
      </div>

      {/* Contenu */}
      <div className="relative z-10 p-8 sm:p-12">
        <motion.h1
          className="text-4xl sm:text-5xl font-semibold tracking-tight"
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          La plateforme d’opportunités <span className="neon-title">Finance</span>
        </motion.h1>

        <motion.p
          className="mt-3 text-lg text-muted-foreground/90 max-w-3xl"
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.08, ease: "easeOut" }}
        >
          Offres centralisées, alertes intelligentes, suivi de candidatures. Conçu pour les étudiants et jeunes diplômés.
        </motion.p>

        <motion.div
          className="mt-6 flex gap-3"
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.16, ease: "easeOut" }}
        >
          <a href="/" className="btn">Explorer les offres</a>
          <a href="/inbox" className="btn btn-ghost">Créer une alerte</a>
        </motion.div>
      </div>
    </section>
  );
}
