"use client";
import * as React from "react";

type Props = {
  src?: string;
  poster?: string;
  className?: string;
};

export default function HeroVideo({
  src = "/media/hero-city.mp4",
  poster = "/media/hero-city.jpg",
  className = "",
}: Props) {
  const ref = React.useRef<HTMLVideoElement | null>(null);

  // Essaie de relancer la lecture si le navigateur la bloque
  const tryPlay = React.useCallback(() => {
    const v = ref.current;
    if (!v) return;
    v.play().catch(() => {
      // certains navigateurs refusent au 1er tick → retente un peu après
      setTimeout(() => v.play().catch(() => {}), 120);
    });
  }, []);

  React.useEffect(() => {
    tryPlay();
    const v = ref.current;
    if (!v) return;
    const onVisibility = () => {
      if (document.visibilityState === "visible") tryPlay();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [tryPlay]);

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-border ${className}`}>
      <video
        ref={ref}
        className="w-full h-[360px] object-cover opacity-90"
        poster={poster}
        playsInline
        muted
        loop
        // ces 2 attributs + onCanPlay garantissent l’auto-play
        autoPlay
        preload="auto"
        onCanPlay={tryPlay}
        onLoadedData={tryPlay}
      >
        <source src={src} type="video/mp4" />
      </video>

      {/* voile néon discret par-dessus la vidéo */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_120%_at_80%_-20%,rgba(187,154,247,.22),transparent),radial-gradient(60%_120%_at_0%_40%,rgba(247,118,142,.18),transparent)]" />
    </div>
  );
}
