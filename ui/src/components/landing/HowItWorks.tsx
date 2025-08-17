// ui/src/components/landing/HowItWorks.tsx
// -------------------------------------------------------------
"use client";

import { motion } from "framer-motion";
import { FileText, Bell, Rocket } from "lucide-react";

const items = [
  {
    icon: FileText,
    title: "Explore",
    text: "Parcours toutes les offres de plus de 40 banques, avec tri et filtres précis.",
  },
  {
    icon: Bell,
    title: "Alerte",
    text: "Reçois des alertes ciblées et marque les offres en favoris ou candidature.",
  },
  {
    icon: Rocket,
    title: "Suis",
    text: "Ton dashboard t’aide à relancer, planifier et optimiser tes chances.",
  },
];

export default function HowItWorks() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
      {items.map((it, i) => (
        <motion.div
          key={it.title}
          className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--glow-weak)]"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ delay: i * 0.08, duration: 0.42 }}
        >
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card mb-3">
            <it.icon className="w-5 h-5" />
          </div>
          <div className="text-lg font-semibold mb-1">{it.title}</div>
          <div className="text-sm text-muted-foreground">{it.text}</div>
        </motion.div>
      ))}
    </div>
  );
}
