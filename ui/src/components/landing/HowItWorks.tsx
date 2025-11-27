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
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-300/80">Comment ça marche</p>
          <h2 className="text-2xl sm:text-3xl font-semibold">Workflow pensé pour la salle de marché</h2>
        </div>
        <div className="pill gradient-pill text-xs">Offres, alertes, relances</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {items.map((it, i) => (
          <motion.div
            key={it.title}
            className="neon-card"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ delay: i * 0.08, duration: 0.42 }}
          >
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sky-50">
              <it.icon className="w-5 h-5" />
            </div>
            <div className="text-lg font-semibold mt-3 mb-1">{it.title}</div>
            <div className="text-sm text-muted-foreground leading-relaxed">{it.text}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
