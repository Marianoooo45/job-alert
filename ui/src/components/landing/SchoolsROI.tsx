"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";

function formatH(n: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);
}

export default function SchoolsROI() {
  const [students, setStudents] = React.useState(200);

  // Mini ROI simplifié (exemple)
  // Hypothèses douces: 12 min gagnées / étu / mois pour le Career Center
  // et 15€ / h en coût temps (peut être ajusté)
  const hoursSaved = Math.round((students * 12) / 60);
  const costSaved = hoursSaved * 15;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <motion.div
        className="rounded-xl border border-border bg-surface p-6"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35 }}
      >
        <div className="text-sm text-muted-foreground mb-2">Pour les écoles</div>
        <h2 className="text-2xl font-semibold mb-3">
          Accélérez l’accès à l’emploi de vos étudiants
        </h2>
        <ul className="list-disc pl-5 text-sm leading-6">
          <li>Accès des étudiants à un moteur d’offres finance unifié</li>
          <li>Alertes ciblées et suivi des candidatures</li>
          <li>Ateliers “relances & entretien” avec votre Career Center</li>
        </ul>

        {/* Mini calculateur ROI */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <label className="sm:col-span-1">
            <span className="block text-xs text-muted-foreground mb-1">Étudiants</span>
            <input
              type="number"
              min={20}
              step={10}
              value={students}
              onChange={(e) => setStudents(Math.max(20, Number(e.target.value || 0)))}
              className="w-full h-10 px-3 rounded-lg bg-surface border border-border"
            />
          </label>

          <div className="sm:col-span-1 rounded-lg border border-border bg-card/70 p-3">
            <div className="text-xs text-muted-foreground">Temps gagné estimé</div>
            <div className="text-lg font-semibold">{formatH(hoursSaved)} h / mois</div>
          </div>
          <div className="sm:col-span-1 rounded-lg border border-border bg-card/70 p-3">
            <div className="text-xs text-muted-foreground">Coût évité (indicatif)</div>
            <div className="text-lg font-semibold">{costSaved.toLocaleString("fr-FR")} € / mois</div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="https://calendly.com/"
            target="_blank"
            className="btn"
          >
            Demander une démo
          </Link>
          <Link href="/media/one-pager.pdf" target="_blank" className="btn-ghost">
            Télécharger le one-pager
          </Link>
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          *Estimation indicative. Personnalisons les hypothèses en démo.
        </p>
      </motion.div>

      <motion.div
        className="rounded-xl border border-border bg-surface p-6 flex items-center justify-center"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35, delay: 0.08 }}
      >
        {/* Placeholder illustration — tu peux remplacer par une capture animée */}
        <div className="w-full h-[280px] rounded-xl border border-border bg-card/70 grid place-items-center text-sm text-muted-foreground">
          Illustration
        </div>
      </motion.div>
    </div>
  );
}
