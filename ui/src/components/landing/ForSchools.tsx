// ui/src/components/landing/ForSchools.tsx
"use client";

import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { CheckCircle2, Download, MessagesSquare } from "lucide-react";
import ContactModal from "@/components/ContactModal";

const ForSchools = () => {
  const [open, setOpen] = useState(false);

  // Base path robuste (gère var d'env absente ou vide)
  const base = useMemo(() => {
    const v = process.env.NEXT_PUBLIC_BASE_PATH;
    return typeof v === "string" && v.length > 0 ? v : "";
  }, []);

  const ONE_PAGER = `${base}/media/one-pager.pdf`;

  const gains = [
    "Accès étudiant à un moteur d’offres finance unifié",
    "Alertes ciblées et suivi des candidatures",
    "Ateliers “relances & entretien” avec votre Career Center",
  ];

  const valueProps = [
    "Tableau de bord école (accès démo)",
    "Onboarding étudiants en 48h",
    "Support dédié & sessions Q/R",
  ];

  return (
    <>
      <motion.section
        className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-secondary/10 via-card to-muted/60 p-6 shadow-[0_20px_100px_-70px_rgba(15,23,42,1)] sm:p-8"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.42 }}
      >
        <div className="absolute -left-10 top-0 h-48 w-48 rounded-full bg-primary/20 blur-3xl" aria-hidden />
        <div className="absolute -right-6 -bottom-6 h-52 w-52 rounded-full bg-secondary/20 blur-3xl" aria-hidden />

        {/* Bandeau titre compact avec pictogramme */}
        <div className="flex flex-col gap-3 pb-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <span
              className="inline-grid place-items-center h-10 w-10 rounded-2xl bg-gradient-to-br from-primary/80 to-secondary/70 text-white shadow-[0_18px_60px_-40px_rgba(14,165,233,0.9)]"
              aria-hidden
            >
              <CheckCircle2 className="h-5 w-5" />
            </span>

            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Pour les écoles</p>
              <h3 className="text-2xl sm:text-3xl font-semibold leading-tight">
                Accélérez l’accès à l’emploi de vos étudiants
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Téléchargement direct (PDF) */}
            <a
              href={ONE_PAGER}
              download="Job-Alert-one-pager.pdf"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_20px_60px_-40px_rgba(14,165,233,0.9)] transition hover:translate-y-[-1px]"
            >
              <Download className="h-4 w-4" />
              Télécharger le one-pager
            </a>

            {/* Ouverture de la modale de contact */}
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/80 px-4 py-2 text-sm font-semibold shadow-[0_12px_40px_-30px_rgba(15,23,42,0.8)] transition hover:bg-card"
            >
              <MessagesSquare className="h-4 w-4" />
              Contacter l’équipe
            </button>
          </div>
        </div>

        {/* Contenu + CTA (2 boutons seulement) */}
        <div className="grid gap-5 md:grid-cols-[1.2fr_.9fr]">
          <div className="space-y-4 rounded-2xl border border-border bg-card/70 p-4 sm:p-5 shadow-[0_18px_60px_-45px_rgba(15,23,42,0.8)]">
            <p className="text-sm font-semibold">Ce que vos étudiants obtiennent</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {gains.map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <DotOk />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-muted-foreground/80">
              *Contenu adaptable en fonction de vos besoins et de votre calendrier.
            </p>
          </div>

          {/* Encadré “Ce que vous obtenez” (sans logos/partenaires) */}
          <div className="rounded-2xl border border-border bg-gradient-to-br from-white/5 via-card/90 to-muted/50 p-4 sm:p-5 shadow-[0_18px_60px_-45px_rgba(15,23,42,0.8)]">
            <p className="text-sm font-semibold mb-3">Ce que votre équipe gagne</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {valueProps.map((val) => (
                <li key={val} className="flex items-start gap-2">
                  <DotOk />
                  <span>{val}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.section>

      {/* Modale de contact */}
      <ContactModal
        open={open}
        onClose={() => setOpen(false)}
        presetSubject="Partenariat école"
      />
    </>
  );
};

export default ForSchools;

/** Petit point validé (même style que l’icône principale, discret) */
function DotOk() {
  return (
    <span
      className="mt-[2px] inline-grid place-items-center h-5 w-5 rounded-full"
      style={{
        background:
          "linear-gradient(135deg, var(--color-secondary), var(--color-primary))",
      }}
      aria-hidden
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        className="text-white"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </span>
  );
}
