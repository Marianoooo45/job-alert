// ui/src/components/landing/StatsStrip.tsx
"use client";

import * as React from "react";
import { motion, useInView } from "framer-motion";

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

export default function StatsStrip({ total, banks = 95, countries = 70 }: Props) {
  const s1 = useCountUp(total);
  const s2 = useCountUp(banks);
  const s3 = useCountUp(countries);

  const Item = ({ label, val }: { label: string; val: { ref: any; value: number } }) => (
    <div className="stat-card">
      <div className="stat-glow" aria-hidden />
      <div className="flex items-center gap-3">
        <div className="stat-dot" />
        <div>
          <div ref={val.ref as any} className="text-3xl font-semibold">
            {val.value.toLocaleString("fr-FR")}
          </div>
          <div className="text-xs text-muted-foreground mt-1">{label}</div>
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.42 }}
      className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4"
    >
      <Item label="Offres actives" val={s1} />
      <Item label="Banques" val={s2} />
      <Item label="Pays" val={s3} />
    </motion.div>
  );
}
