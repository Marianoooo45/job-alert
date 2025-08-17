// ui/src/components/landing/ForSchools.tsx
// -------------------------------------------------------------
"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function ForSchools() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.42 }}
      className="rounded-2xl border border-border bg-surface p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-center"
    >
      <div>
        <div className="text-sm text-muted-foreground mb-2">Pour les écoles</div>
        <h3 className="text-2xl sm:text-3xl font-semibold">Accélérez l’accès à l’emploi de vos étudiants</h3>
        <ul className="mt-4 text-sm text-muted-foreground list-disc pl-5 space-y-1">
          <li>Accès des étudiants à un moteur d’offres finance unifié</li>
          <li>Alertes ciblées et suivi des candidatures</li>
          <li>Ateliers “relances & entretien” avec votre Career Center</li>
        </ul>
        <div className="mt-5 flex gap-3">
          <Link href="/" className="btn">Voir les offres</Link>
          <Link href="/inbox" className="btn-ghost">Créer une alerte</Link>
        </div>
      </div>
      <div className="relative">
        {/* Optional illustrative image */}
        <div className="rounded-2xl border border-border bg-card w-full h-[200px] sm:h-[260px] flex items-center justify-center text-muted-foreground">
          Illustration
        </div>
      </div>
    </motion.div>
  );
}
