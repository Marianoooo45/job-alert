// ui/src/components/landing/HowItWorks.tsx
// -------------------------------------------------------------
"use client";

import { motion } from "framer-motion";
import { Bell, FileText, ListTodo, Rocket } from "lucide-react";

const steps = [
  {
    icon: FileText,
    title: "Repère",
    text: "Une veille quotidienne sur les offres finance, triées par niveau et localisation.",
    chip: "Veille consolidée",
  },
  {
    icon: Bell,
    title: "Déclenche",
    text: "Active des alertes ciblées qui ne déclenchent que quand une offre correspond au profil.",
    chip: "Alertes contextuelles",
  },
  {
    icon: ListTodo,
    title: "Organise",
    text: "Ajoute des échéances, des relances et des notes directement depuis la fiche offre.",
    chip: "Todo + relances",
  },
  {
    icon: Rocket,
    title: "Passe à l’action",
    text: "Visualise les candidatures en cours et identifie les prochaines étapes sans ouvrir Excel.",
    chip: "Pipeline clair",
  },
];

export default function HowItWorks() {
  return (
    <section className="rounded-3xl border border-border bg-card/70 p-6 shadow-[0_20px_100px_-70px_rgba(15,23,42,1)] sm:p-8">
      <div className="flex flex-col gap-2 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Parcours simplifié</p>
          <h2 className="text-2xl font-semibold sm:text-3xl">Comment Job Alert vous accompagne</h2>
        </div>
        <p className="max-w-xl text-sm text-muted-foreground">
          Un flux unique qui va de la découverte au suivi, en réduisant les distractions et les tâches répétitives.
        </p>
      </div>

      <div className="relative grid gap-4 sm:gap-5">
        <div className="absolute left-4 top-6 hidden h-[85%] w-[1px] bg-gradient-to-b from-primary/40 via-border to-transparent sm:block" aria-hidden />
        {steps.map((step, idx) => (
          <motion.div
            key={step.title}
            className="group relative flex flex-col gap-3 rounded-2xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-start sm:gap-4 sm:p-5"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.35, delay: idx * 0.06 }}
          >
            <div className="flex-shrink-0">
              <div className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-secondary/20 text-primary">
                <step.icon className="h-5 w-5" />
                <span className="absolute -left-[23px] hidden h-px w-5 bg-border sm:block" aria-hidden />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-semibold">{step.title}</p>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary/90">
                  {step.chip}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.text}</p>
            </div>

            <div className="absolute inset-0 rounded-2xl border border-transparent transition group-hover:border-primary/30 group-hover:shadow-[0_15px_55px_-35px_rgba(14,165,233,0.9)]" aria-hidden />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
