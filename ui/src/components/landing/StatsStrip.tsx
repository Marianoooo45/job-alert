// ui/src/components/landing/StatsStrip.tsx
// -------------------------------------------------------------
"use client";
import * as React from "react";

function useInView(ref: React.RefObject<Element>, rootMargin = "-20% 0px") {
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), { rootMargin });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return visible;
}

function useCountUp(to: number, ms = 1200, start = 0) {
  const [val, setVal] = React.useState(start);
  React.useEffect(() => {
    let raf = 0, t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      setVal(Math.round(start + (to - start) * (1 - Math.pow(1 - p, 3)))); // easeOutCubic
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms, start]);
  return val;
}

export default function StatsStrip() {
  const ref = React.useRef<HTMLDivElement>(null);
  const visible = useInView(ref);
  const offers = useCountUp(visible ? 6500 : 0);
  const banks  = useCountUp(visible ? 40   : 0);
  const countries = useCountUp(visible ? 55 : 0);

  return (
    <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card k="Offres actives" v={offers} />
      <Card k="Banques" v={banks} />
      <Card k="Pays" v={countries} />
    </div>
  );
}
function Card({k, v}:{k:string; v:number}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 text-center">
      <div className="text-4xl font-semibold">{v.toLocaleString("fr-FR")}</div>
      <div className="mt-1 text-sm text-muted-foreground">{k}</div>
    </div>
  );
}
