"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Terminal, Search, Bell, TrendingUp, GraduationCap,
  ArrowRight, Download, ChevronDown, Globe,
  Server, Database, Zap, Users, LayoutDashboard, CheckCircle2,
  Sparkles, Eye
} from "lucide-react";
import ContactModal from "@/components/ContactModal";
import BankAvatar from "@/components/BankAvatar";
import { BANKS_LIST } from "@/config/banks";

const HERO_NIGHT = "/media/hero-city.jpg";
const HERO_DAY   = "/media/hero-city-day.jpg";

export default function LandingPage() {
  const [totalOffers, setTotalOffers] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch("/api/jobs?limit=1")
      .then(r => {
        const c = r.headers.get("X-Total-Count");
        if (c) setTotalOffers(parseInt(c, 10));
      })
      .catch(() => setTotalOffers(32450));
  }, []);

  return (
    <div className="relative bg-background font-sans selection:bg-primary/20 min-h-screen overflow-x-hidden">
      {/* HERO SECTION — plein écran, non sticky */}
      <div className="relative h-screen w-full overflow-hidden">
        {mounted && <HeroVisuals />}
        <HeroOverlayContent />
      </div>

      {/* CONTENT LAYER */}
      <div className="relative z-20 bg-background">
        {/* Floating separator */}
        <div className="h-32 relative">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center backdrop-blur-sm"
          >
            <Sparkles className="w-6 h-6 text-primary" />
          </motion.div>
        </div>

        <MarqueeSection />
        <FeatureSection />
        <StatsSection totalOffers={totalOffers} />
        <SchoolsSection />

        {/* Footer */}
        <footer className="py-12 border-t border-border/50 bg-gradient-to-b from-background to-muted/20">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  System Operational
                </p>
              </div>
              <p className="text-sm text-muted-foreground/70">
                Job Alert Terminal © 2024 — Powered by Finance Intelligence
              </p>
            </motion.div>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* ==================================================================================
   HERO SECTION
   ================================================================================== */

function HeroVisuals() {
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = (theme ?? resolvedTheme) === "light" ? "light" : "dark";
  const src = currentTheme === "light" ? HERO_DAY : HERO_NIGHT;

  const { scrollY } = useScroll();
  const scale = useTransform(scrollY, [0, 1000], [1, 1.15]);

  return (
    <>
      {/* L'image couvre exactement tout le héros (qui fait h-screen) */}
      <motion.div
        style={{ scale }}
        className="absolute inset-0 z-0"
      >
        <img
          src={src}
          alt="Finance City"
          className="w-full h-full object-cover"
        />

        {/* Vignette uniquement en dark mode (light = image clean) */}
        <div
          className="
            absolute inset-0 pointer-events-none transition-all duration-500
            opacity-0 dark:opacity-100
            dark:bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.78)_0%,rgba(15,23,42,0.45)_40%,rgba(15,23,42,0)_75%)]
          "
        />
      </motion.div>

      {/* Particules */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary/40 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0, 0.6, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>
    </>
  );
}

function HeroOverlayContent() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <motion.div
      ref={ref}
      style={{ y, opacity }}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center px-4 md:px-6"
    >
      <div className="max-w-5xl w-full">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="flex justify-center mb-8"
        >
          <div className="relative group">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
            <div className="relative px-6 py-3 rounded-full bg-white/70 dark:bg-white/10 border border-black/10 dark:border-primary/30 backdrop-blur-xl shadow-lg">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                </div>
                <span className="text-xs font-mono font-bold uppercase tracking-[0.3em] text-zinc-900 dark:text-zinc-100">
                  Live System
                </span>
                <div className="w-px h-4 bg-black/20 dark:bg-white/20" />
                <span className="text-xs font-mono text-zinc-700 dark:text-zinc-300">
                  v2.4.1
                </span>

              </div>
            </div>
          </div>
        </motion.div>

        {/* Titre + sous-titre en blanc (les deux thèmes) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="text-center space-y-6 mb-12"
        >
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-[0.9]">
            <span className="block text-white drop-shadow-[0_10px_45px_rgba(0,0,0,0.85)]">
              JOB ALERT
            </span>
            <span
              className="
                block bg-clip-text text-transparent
                bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400
                animate-gradient pb-2
                drop-shadow-[0_12px_40px_rgba(0,0,0,0.9)]
              "
            >
              TERMINAL
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="
              text-lg md:text-2xl
              text-white/90
              max-w-3xl mx-auto
              font-medium
              leading-relaxed
              drop-shadow-[0_8px_35px_rgba(0,0,0,0.9)]
            "
          >
            Le hub centralisé pour l&apos;élite financière.{" "}
            <span className="font-bold text-white">M&A · PE · Trading</span>
            {" "}— agrégés en temps réel.
          </motion.p>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/offers"
            className="group relative w-full sm:w-auto"
          >
            <div className="absolute inset-0 bg-indigo-600/50 blur-lg opacity-40 group-hover:opacity-60 transition-opacity rounded-xl" />
            <div
              className="
                relative h-14 px-8 flex items-center justify-center gap-3
                rounded-xl
                bg-indigo-600 hover:bg-indigo-500
                border border-indigo-400/30 hover:border-indigo-300/50
                text-white font-bold text-lg tracking-wide
                shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]
                transition-all duration-300 transform hover:-translate-y-0.5
              "
            >
              <Terminal className="w-5 h-5" />
              <span>Accéder au Terminal</span>
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-200 animate-pulse ml-1" />
            </div>
          </Link>

          <Link
            href="/inbox"
            className="
              group w-full sm:w-auto h-14 px-8 flex items-center justify-center
              rounded-xl border border-white/40
              bg-white/10 backdrop-blur-md
              text-white font-semibold text-lg
              hover:bg-white/15 hover:border-white/60
              transition-all shadow-sm
            "
          >
            Créer une Alerte
          </Link>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="flex flex-col items-center gap-2"
          >
            <span className="text-xs font-mono text-white/80 uppercase tracking-widest">
              Scroll
            </span>
            <ChevronDown className="w-6 h-6 text-white/80" />
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ==================================================================================
   MARQUEE SECTION
   ================================================================================== */

function MarqueeSection() {
  const items = [...BANKS_LIST, ...BANKS_LIST, ...BANKS_LIST];

  return (
    <section className="relative py-20 bg-gradient-to-b from-background via-muted/30 to-background overflow-hidden">
      {/* Subtle grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-[0.3em] mb-2">
            Trusted Network
          </h3>
          <p className="text-2xl font-bold text-foreground">
            90+ Institutions Connectées
          </p>
        </motion.div>

        {/* Gradient masks */}
        <div className="absolute left-0 top-0 bottom-0 w-40 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-40 bg-gradient-to-l from-background to-transparent z-10" />

        <div className="flex gap-16 w-max animate-marquee hover:[animation-play-state:paused]">
          {items.map((b, i) => (
            <motion.div
              key={`${b.id}-${i}`}
              whileHover={{ scale: 1.1, y: -5 }}
              className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm hover:border-primary/30 hover:bg-card/80 transition-all cursor-pointer group"
            >
              <div className="relative">
                <BankAvatar bankId={b.id} name={b.name} size={48} className="transition-transform group-hover:scale-110" />
                <div className="absolute -inset-1 bg-primary/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="text-lg font-bold font-mono text-foreground/80 group-hover:text-primary transition-colors whitespace-nowrap">
                {b.name.toUpperCase()}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-33.33%); }
        }
        .animate-marquee {
          animation: marquee 90s linear infinite;
        }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 8s ease infinite;
        }
      `}</style>
    </section>
  );
}

/* ==================================================================================
   FEATURES SECTION
   ================================================================================== */

function FeatureSection() {
  const features = [
    {
      icon: Search,
      title: "SOURCING PROTOCOL",
      desc: "Algorithme temps réel connecté à 90+ portails carrières bancaires.",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Bell,
      title: "LIVE INTERCEPT",
      desc: "Alertes instantanées sur critères spécifiques (M&A, Paris, Summer).",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: TrendingUp,
      title: "PROCESS TRACKING",
      desc: "Soyez le premier à postuler. Suivez vos process dans le dashboard.",
      color: "from-emerald-500 to-teal-500"
    },
  ];

  return (
    <section className="py-32 px-6 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.1),transparent_50%)]" />

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Eye className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono font-bold text-primary uppercase tracking-wider">
              Core Modules
            </span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tight text-foreground mb-4">
            Système Intelligent
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Une suite d&apos;outils conçue pour maximiser vos chances
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <FeatureCard key={i} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature, index }: { feature: any, index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.2 }}
      className="group relative"
    >
      {/* Glow effect */}
      <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-20 blur-2xl transition-opacity duration-500 rounded-3xl`} />

      {/* Card */}
      <div className="relative h-full p-8 rounded-3xl bg-card border border-border hover:border-primary/30 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2">
        {/* Icon */}
        <div className="mb-6">
          <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.color} shadow-lg group-hover:scale-110 transition-transform duration-500`}>
            <feature.icon className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <h3 className="text-2xl font-bold font-mono text-foreground group-hover:text-primary transition-colors">
            {feature.title}
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            {feature.desc}
          </p>
        </div>

        {/* Bottom accent */}
        <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-b-3xl`} />
      </div>
    </motion.div>
  );
}

/* ==================================================================================
   STATS SECTION
   ================================================================================== */

function StatsSection({ totalOffers }: { totalOffers: number }) {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-muted/50 to-background" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <StatItem label="Offres Actives" value={totalOffers} icon={Database} delay={0} />
          <StatItem label="Institutions" value={90} icon={Server} delay={0.15} />
          <StatItem label="Pays Couverts" value={65} icon={Globe} delay={0.3} />
        </div>
      </div>
    </section>
  );
}

function StatItem({ label, value, icon: Icon, delay }: { label: string, value: number, icon: any, delay: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const duration = 2000;
    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(value * ease));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isInView, value]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ delay, duration: 0.8 }}
      className="group text-center space-y-4"
    >
      <div className="relative inline-flex">
        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative text-6xl md:text-8xl font-black font-mono text-foreground group-hover:text-primary transition-colors tabular-nums">
          {display.toLocaleString()}
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <Icon className="w-5 h-5 text-primary" />
        <span className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground group-hover:text-foreground transition-colors">
          {label}
        </span>
      </div>
    </motion.div>
  );
}

/* ==================================================================================
   SCHOOLS SECTION
   ================================================================================== */

function SchoolsSection() {
  const [open, setOpen] = useState(false);

  const base = useMemo(() => {
    return process.env.NEXT_PUBLIC_BASE_PATH || "";
  }, []);

  const ONE_PAGER = `${base}/media/one-pager.pdf`;

  const features = [
    { icon: LayoutDashboard, title: "Dashboard École", desc: "Suivi des placements & analytics." },
    { icon: Zap, title: "Onboarding 48h", desc: "Déploiement technique instantané." },
    { icon: Users, title: "Support Dédié", desc: "Ateliers & Q/R pour vos étudiants." }
  ];

  return (
    <section className="py-32 px-4 sm:px-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(139,92,246,0.1),transparent_50%)]" />

      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-[3rem] bg-gradient-to-br from-card to-muted/30 border border-border/50 p-12 md:p-16 shadow-2xl backdrop-blur-sm"
        >
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                <GraduationCap className="w-5 h-5 text-indigo-500" />
                <span className="text-sm font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Pour les Écoles
                </span>
              </div>

              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground leading-tight">
                Accélérez l&apos;accès à l&apos;emploi de{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600">
                  vos étudiants
                </span>
              </h2>

              <ul className="space-y-4">
                {[
                  "Accès étudiant à un moteur d'offres finance unifié",
                  "Alertes ciblées et suivi des candidatures",
                  "Ateliers avec votre Career Center"
                ].map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div className="mt-1 p-1 rounded-full bg-emerald-500/10">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    </div>
                    <span className="text-muted-foreground font-medium">{item}</span>
                  </motion.li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-4 pt-4">
                <a
                  href={ONE_PAGER}
                  download="Job-Alert-Brochure.pdf"
                  className="inline-flex items-center gap-2 h-12 px-6 rounded-xl border border-border bg-background hover:bg-muted text-foreground font-semibold transition-all hover:scale-105 hover:shadow-lg"
                >
                  <Download className="w-4 h-4" />
                  Télécharger la brochure
                </a>

                <button
                  onClick={() => setOpen(true)}
                  className="inline-flex items-center gap-2 h-12 px-8 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold hover:shadow-xl hover:scale-105 transition-all"
                >
                  Contacter l&apos;équipe
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right: Features */}
            <div className="space-y-4">
              {features.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="flex items-center gap-4 p-6 rounded-2xl bg-background/50 border border-border/50 hover:border-primary/30 hover:bg-background transition-all"
                >
                  <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    <f.icon className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground mb-1">{f.title}</h4>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      <ContactModal open={open} onClose={() => setOpen(false)} presetSubject="Partenariat École" />
    </section>
  );
}
