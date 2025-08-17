// ui/src/components/landing/LogosMarquee.tsx
"use client";

import * as React from "react";
import BankAvatar from "@/components/BankAvatar";
import { BANKS_LIST } from "@/config/banks";
import { motion } from "framer-motion";

export default function LogoMarquee() {
  // on garde un set de 12-16 banques max pour la ligne
  const banks = React.useMemo(() => BANKS_LIST.slice(0, 16), []);
  const row = [...banks, ...banks]; // duplication pour boucle

  const [paused, setPaused] = React.useState(false);

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-border bg-surface p-3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="text-sm text-muted-foreground mb-2 flex items-center justify-between">
        <span>Banques couvertes</span>
        <span className="opacity-60">20+</span>
      </div>

      <div className="relative">
        <motion.div
          className="flex gap-3"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 28, ease: "linear", repeat: Infinity, repeatType: "loop", pause: paused }}
          style={{ willChange: "transform" }}
        >
          {row.map((b, i) => (
            <div
              key={`${b.id}-${i}`}
              className="shrink-0 px-3 py-2 rounded-full bg-card/40 border border-border inline-flex items-center gap-2"
            >
              <BankAvatar bankId={b.id} name={b.name} size={18} />
              <span className="text-sm">{b.name}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
