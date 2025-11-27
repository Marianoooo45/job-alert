// ui/src/components/landing/Hero.tsx
"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import * as React from "react";
import { ArrowUpRight, Bell, ShieldCheck, Sparkles } from "lucide-react";

export default function Hero() {
  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const yMedia = useTransform(scrollYProgress, [0, 1], [0, -26]);
  const yOverlay = useTransform(scrollYProgress, [0, 1], [0, -12]);

  const highlights = [
    { icon: Sparkles, label: "Alertes intelligentes", text: "Déclenchées selon les critères et la séniorité" },
    { icon: Bell, label: "Suivi guidé", text: "Relances, TODO et rappels synchronisés" },
    { icon: ShieldCheck, label: "Sources vérifiées", text: "Banques et cabinets filtrés chaque jour" },
  ];

  return (
    <section
      ref={ref}
      className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-[color(display-p3_0.1_0.1_0.16)] via-[color(display-p3_0.07_0.11_0.2)] to-[color(display-p3_0.08_0.09_0.16)] px-6 py-8 sm:px-10 sm:py-12 shadow-[0_30px_120px_-60px_rgba(12,16,32,.7)]"
    >
      {/* Arrière-plan graphique */}
      <motion.div
        style={{ y: yMedia }}
        aria-hidden
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute inset-0 opacity-50" style={{
          background:
            "radial-gradient(120%_80% at 20% 10%, rgba(92,225,230,0.18), transparent 60%)," +
            "radial-gradient(90%_80% at 85% 20%, rgba(130,106,255,0.24), transparent 45%)," +
            "radial-gradient(120%_100% at 50% 75%, rgba(255,152,216,0.12), transparent 55%)",
        }} />
        <div className="hero-gridlines" />
      </motion.div>

      {/* Scrim doux pour le texte */}
      <motion.div style={{ y: yOverlay }} className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.06),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.04),transparent_38%)]" aria-hidden />

      <div className="relative z-[1] grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 shadow-[0_10px_40px_-22px_rgba(0,0,0,0.6)]">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-sky-400/80 to-fuchsia-400/80 text-white">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            Nouvelle expérience Job Alert
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Votre copilote pour décrocher une opportunité en finance
            </h1>
            <p className="text-base text-white/80 sm:text-lg">
              Recherchez, centralisez et relancez sans friction. La plateforme Job Alert simplifie la veille, l’alerte et le suivi pour que vous restiez concentré·e sur les entretiens.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {highlights.map(({ icon: Icon, label, text }) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_20px_60px_-40px_rgba(10,10,30,0.8)]">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  {label}
                </div>
                <p className="text-xs text-white/70">{text}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Link href="/offers" className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_18px_50px_-28px_rgba(255,255,255,0.8)] transition hover:translate-y-[-1px] hover:shadow-[0_25px_80px_-40px_rgba(255,255,255,0.95)]">
              Explorer les offres <ArrowUpRight className="ml-2 h-4 w-4" />
            </Link>
            <Link href="/inbox" className="inline-flex items-center justify-center rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white/90 backdrop-blur-sm transition hover:bg-white/5">
              Créer une alerte
            </Link>
          </div>
        </motion.div>

        {/* Carte récapitulatif produit */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="relative"
        >
          <div className="absolute inset-x-6 top-8 -z-[1] h-80 rounded-full bg-gradient-to-br from-sky-400/15 via-fuchsia-500/10 to-indigo-400/15 blur-3xl" aria-hidden />
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl shadow-[0_30px_80px_-50px_rgba(6,10,30,.9)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-white/60">Tableau de bord</p>
                <p className="text-lg font-semibold text-white">Flux concentré & tâches claires</p>
              </div>
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-[11px] font-semibold text-emerald-100">
                Temps réel
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-white/10 to-white/5 p-4">
                <div className="flex items-center justify-between text-sm text-white">
                  <span>Veille multi-sources</span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px]">40+ banques</span>
                </div>
                <p className="mt-2 text-xs text-white/70">Les nouvelles offres sont consolidées, dé-dupliquées puis triées par pertinence.</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between text-sm text-white">
                  <span>Pipeline de candidatures</span>
                  <span className="rounded-full bg-indigo-400/20 px-2 py-0.5 text-[11px] text-indigo-50">Relances</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-white/80">
                  <span>Entretiens programmés</span>
                  <span className="font-semibold text-white">+3 cette semaine</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-white/10">
                  <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300" />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-sm text-white">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-400 to-sky-400">
                    <Bell className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">Alertes personnalisées</p>
                    <p className="text-[11px] text-white/75">Recevez uniquement les rôles alignés sur vos critères.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
