// ui/src/components/landing/HomeHero.tsx
"use client";
import { useRef, useEffect } from "react";

export default function HomeHero() {
  const ref = useRef<HTMLVideoElement>(null);

  // Fade-in dès que la vidéo est prête (évite le flash)
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onCanPlay = () => v.classList.remove("opacity-0");
    v.addEventListener("canplay", onCanPlay, { once: true });
    return () => v.removeEventListener("canplay", onCanPlay);
  }, []);

  return (
    <section className="relative rounded-3xl overflow-hidden border border-border panel-xl aspect-[16/7]">
      <video
        ref={ref}
        className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-700"
        src="/media/hero-city.mp4?v=1"
        poster="/media/hero-city.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      />
      {/* voile/halo par-dessus la vidéo */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(60%_120%_at_80%_-20%,rgba(187,154,247,.20),transparent),radial-gradient(60%_120%_at_0%_40%,rgba(247,118,142,.16),transparent)]" />
      {/* ton contenu par-dessus */}
      <div className="relative z-10 p-6 sm:p-10">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
          La plateforme d’opportunités <span className="neon-title">Finance</span>
        </h1>
        <p className="mt-3 text-lg text-muted-foreground/90">
          Offres centralisées, alertes intelligentes, suivi.
        </p>
      </div>
    </section>
  );
}
