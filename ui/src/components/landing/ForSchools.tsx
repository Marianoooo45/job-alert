// ui/src/components/landing/ForSchools.tsx
"use client";

import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import ContactModal from "@/components/ContactModal";

const ForSchools = () => {
  const [open, setOpen] = useState(false);

  // Base path robuste (gère var d'env absente ou vide)
  const base = useMemo(() => {
    const v = process.env.NEXT_PUBLIC_BASE_PATH;
    return typeof v === "string" && v.length > 0 ? v : "";
  }, []);

  const ONE_PAGER = `${base}/media/one-pager.pdf`;

  return (
    <>
      <motion.section
        className="panel p-6 sm:p-8 finance-panel"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.42 }}
      >
        {/* Bandeau titre compact avec pictogramme */}
        <div className="flex items-start gap-4 mb-6">
          <span className="icon-badge" aria-hidden>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              className="text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </span>

          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-300/80">Pour les écoles</p>
            <h3 className="text-2xl sm:text-3xl font-semibold leading-tight">
              Accélérez l’accès à l’emploi de vos étudiants
            </h3>
            <p className="text-sm text-slate-200/80">
              Un accompagnement clé en main, calibré pour les masters finance et les career centers exigeants.
            </p>
          </div>
        </div>

        {/* Contenu + CTA (2 boutons seulement) */}
        <div className="grid md:grid-cols-[1.2fr_.8fr] gap-6 md:gap-8">
          <div className="space-y-5">
            <ul className="space-y-2 text-sm">
              <li className="check-line">Accès étudiant à un moteur d’offres finance unifié</li>
              <li className="check-line">Alertes ciblées et suivi des candidatures</li>
              <li className="check-line">Ateliers “relances & entretien” avec votre Career Center</li>
            </ul>

            <div className="flex flex-wrap gap-3">
              {/* Téléchargement direct (PDF) */}
              <a
                href={ONE_PAGER}
                download="Job-Alert-one-pager.pdf"
                className="btn shadow-cta"
              >
                Télécharger le one-pager
              </a>

              {/* Ouverture de la modale de contact */}
              <button
                onClick={() => setOpen(true)}
                className="btn-ghost glass-btn px-4 py-2 rounded-[12px]"
              >
                Contacter l’équipe
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground">
              *Contenu adaptable en fonction de vos besoins et de votre calendrier.
            </p>
          </div>

          {/* Encadré “Ce que vous obtenez” (sans logos/partenaires) */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5 relative overflow-hidden">
            <div className="panel-radial" aria-hidden />
            <p className="text-sm font-medium mb-3">Ce que vous obtenez</p>
            <ul className="space-y-2 text-sm text-muted-foreground relative z-[1]">
              <li className="flex items-start gap-2">
                <DotOk />
                Tableau de bord école (accès démo)
              </li>
              <li className="flex items-start gap-2">
                <DotOk />
                Onboarding étudiants en 48h
              </li>
              <li className="flex items-start gap-2">
                <DotOk />
                Support dédié & sessions Q/R
              </li>
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
