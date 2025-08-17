// ui/src/components/landing/StatsStrip.tsx
// -------------------------------------------------------------
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

export default function StatsStrip() {
  // Dummy numbers; you can wire them to a real endpoint if needed.
  const s1 = useCountUp(6500);
  const s2 = useCountUp(40);
  const s3 = useCountUp(55);

  const Item = ({ label, val }: { label: string; val: { ref: any; value: number } }) => (
    <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5 text-center shadow-[var(--glow-weak)]">
      <div ref={val.ref as any} className="text-3xl font-semibold">{val.value.toLocaleString("fr-FR")}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.42 }}
      className="grid grid-cols-3 gap-3 sm:gap-4"
    >
      <Item label="Offres actives" val={s1} />
      <Item label="Banques" val={s2} />
      <Item label="Pays" val={s3} />
    </motion.div>
  );
}
