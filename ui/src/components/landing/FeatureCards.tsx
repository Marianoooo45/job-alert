"use client";

import { Bell, Search, Rocket } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Search,
    title: "Explore",
    text: "Parcours toutes les offres finance unifiées avec filtres précis.",
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

export default function FeatureCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {features.map((f, i) => (
        <motion.div
          key={f.title}
          className="rounded-xl border border-border bg-surface p-5"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.08, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ y: -2 }}
        >
          <div className="w-9 h-9 rounded-lg border border-border bg-card/70 flex items-center justify-center mb-3">
            <f.icon className="w-5 h-5" />
          </div>
          <div className="text-lg font-medium">{f.title}</div>
          <div className="text-sm text-muted-foreground mt-1">{f.text}</div>
        </motion.div>
      ))}
    </div>
  );
}
