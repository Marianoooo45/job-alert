"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import * as React from "react";
import { useTheme } from "next-themes";

const HERO_NIGHT = "/media/hero-city.jpg";
const HERO_DAY   = "/media/hero-city-day.jpg";

export default function Hero() {
  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  
  // Parallaxe douce
  const yMedia = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const yText = useTransform(scrollYProgress, [0, 1], [0, -40]);

  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const currentTheme = (theme ?? resolvedTheme) === "light" ? "light" : "dark";
  const heroSrc = currentTheme === "light" ? HERO_DAY : HERO_NIGHT;

  return (
    <section
      ref={ref}
      className="relative w-full min-h-[70vh] flex items-center justify-center overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl bg-black group"
    >
      {/* 1. MEDIA & EFFECTS LAYER */}
      <div className="absolute inset-0 z-0 overflow-hidden rounded-[2rem]">
        {/* Parallaxe Image */}
        <motion.div style={{ y: yMedia }} className="absolute inset-0 h-[120%] -top-[10%] w-full">
          {mounted && (
            <img
              key={currentTheme}
              src={heroSrc}
              alt="Finance Hub"
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out"
            />
          )}
          {/* Vignette sombre pour lisibilité */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20 mix-blend-multiply" />
          
          {/* Effet Scanline (CSS inline pour compatibilité garantie) */}
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay"
            style={{
              backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
              backgroundSize: '100% 2px, 3px 100%'
            }}
          />
        </motion.div>
        
        {/* Grille Déco */}
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      {/* 2. HUD INTERFACE CONTENT */}
      <div className="relative z-10 w-full max-w-6xl px-6 sm:px-12 flex flex-col items-center sm:items-start text-center sm:text-left">
        
        <motion.div 
          style={{ y: yText }}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl p-8 sm:p-12 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] overflow-hidden"
        >
          {/* Liseré lumineux animé en haut du panel */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-50"></div>

          {/* Badge Status */}
          <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4 justify-center sm:justify-start">
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </div>
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-emerald-400/80">System Online</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white mb-6 drop-shadow-2xl">
            Le Hub Finance <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 filter drop-shadow-[0_0_20px_rgba(168,85,247,0.4)]">
              Next-Gen
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 mb-8 max-w-2xl leading-relaxed font-light">
            Centralisation des opportunités M&A, Trading et PE. <br className="hidden sm:block" />
            <span className="text-white font-medium">Algorithmes de veille</span> et tracking temps réel.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link 
              href="/offers" 
              className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-8 font-medium text-white transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_-5px_rgba(79,70,229,0.5)] w-full sm:w-auto"
            >
              <span className="relative z-10 flex items-center gap-2">
                Explorer le Terminal
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </span>
            </Link>
            
            <Link 
              href="/inbox" 
              className="inline-flex h-12 items-center justify-center rounded-lg border border-white/20 bg-white/5 px-8 font-medium text-white backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/30 w-full sm:w-auto"
            >
              Créer une Alerte
            </Link>
          </div>

          {/* Stats Déco (Footer du panel) */}
          <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-center sm:justify-start gap-8 text-xs font-mono text-slate-400">
            <div>LATENCY: <span className="text-emerald-400">14ms</span></div>
            <div>STATUS: <span className="text-blue-400">LIVE</span></div>
            <div className="hidden sm:block">ENCRYPTION: <span className="text-purple-400">AES-256</span></div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}