"use client";
import * as React from "react";
import { useInView } from "framer-motion";

type Props = {
  to: number;
  duration?: number; // ms
  className?: string;
  suffix?: string;
};

export default function CountUp({ to, duration = 900, className, suffix = "" }: Props) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const [val, setVal] = React.useState(0);

  React.useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const from = 0;
    const delta = to - from;

    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(from + delta * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  return (
    <span ref={ref} className={className}>
      {val.toLocaleString("fr-FR")}
      {suffix}
    </span>
  );
}
