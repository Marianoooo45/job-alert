"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

/** Barre fine animée en haut, basée sur le changement d'URL. */
export default function TopProgressBar() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // démarre
    setVisible(true);
    setProgress(0.05);
    const t1 = setTimeout(() => setProgress(0.35), 120);
    const t2 = setTimeout(() => setProgress(0.75), 300);
    const t3 = setTimeout(() => setProgress(0.95), 700);

    // termine
    const t4 = setTimeout(() => {
      setProgress(1);
      setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 200);
    }, 900);

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
    };
  }, [pathname, search?.toString()]);

  if (!visible) return null;

  return (
    <motion.div
      className="fixed left-0 top-0 z-[60] h-[2px] w-screen"
      style={{ background: "var(--progress-gradient)" }}
      initial={{ scaleX: 0 }}
      animate={{ scaleX: progress }}
      transition={{ ease: "easeOut", duration: 0.25 }}
    />
  );
}
