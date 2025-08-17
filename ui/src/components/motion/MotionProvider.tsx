// ui/src/components/motion/MotionProvider.tsx
// -------------------------------------------------------------
"use client";

import { MotionConfig } from "framer-motion";
import * as React from "react";

/**
 * Wrap once at the root to define default transitions & reduced‑motion.
 */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  // Respect OS-level reduced motion
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  return (
    <MotionConfig
      reducedMotion={reduced ? "always" : "never"}
      transition={{ duration: 0.22, ease: [0.22, 0.9, 0.34, 1] }}
    >
      {children}
    </MotionConfig>
  );
}
