// ui/src/components/landing/StatsStrip.tsx
"use client";

import * as React from "react";
import { motion, useInView } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

function useCountUp(target: number, start = 0, durationMs = 900) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [value, setValue] = React.useState(start);
  React.useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / durationMs);
      setValue(Math.round(start + (target - start) * p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, start, durationMs]);
  return { ref, value } as const;
}

type Props = {
  total: number;     // ← nombre d’offres actives (depuis l’API)
  banks?: number;    // fallback: 40
  countries?: number; // fallback: 55
};

const StatCard = ({ label, value, accent }: { label: string; value: { ref: any; value: number }; accent?: string }) => (
  <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card/90 to-muted/60 p-4 sm:p-5">
    <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
    <div ref={value.ref as any} className="mt-2 text-3xl font-semibold">
      {value.value.toLocaleString("fr-FR")}
      {accent ? <span className="ml-2 text-sm font-semibold text-primary">{accent}</span> : null}
    </div>
    <div className="absolute inset-0 pointer-events-none [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.35),rgba(0,0,0,0.9))]">
      <div className="absolute right-[-20%] top-[-20%] h-32 w-32 rounded-full bg-primary/10 blur-3xl" aria-hidden />
    </div>
  </div>
);

export default function StatsStrip({ total, banks = 95, countries = 70 }: Props) {
  const s1 = useCountUp(total);
  const s2 = useCountUp(banks);
  const s3 = useCountUp(countries);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.42 }}
      className="rounded-3xl border border-border bg-card/70 p-6 shadow-[0_20px_100px_-70px_rgba(15,23,42,1)] sm:p-8"
    >
      <div className="flex flex-col gap-2 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Impact</p>
          <h2 className="text-2xl font-semibold sm:text-3xl">Des chiffres qui bougent en direct</h2>
        </div>
        <a href="/offers" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          Voir les dernières offres
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Offres actives" value={s1} />
        <StatCard label="Banques" value={s2} accent="vérifiées" />
        <StatCard label="Pays" value={s3} accent="couverts" />
      </div>
    </motion.section>
  );
}
