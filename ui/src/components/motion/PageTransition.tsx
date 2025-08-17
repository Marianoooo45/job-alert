// ui/src/components/motion/PageTransition.tsx
// -------------------------------------------------------------
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import * as React from "react";

/**
 * Cross‑fade + slight translateY on route change.
 * Use in app/template.tsx to animate segment transitions.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Key by pathname to re-mount on navigation
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.22, ease: [0.22, 0.9, 0.34, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
