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
        className="panel p-6 sm:p-8"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.42 }}
      >
        {/* Bandeau titre compact avec pictogramme */}
        <div className="flex items-start gap-3 mb-4">
          <span
            className="inline-grid place-items-center h-9 w-9 rounded-xl"
            style={{
              background:
                "linear-gradient(135deg, var(--color-secondary), var(--color-primary))",
              boxShadow: "0 6px 18px -8px rgba(187,154,247,.35)",
            }}
            aria-hidden
          >
            {/* icône check stylisé */}
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

          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Pour les écoles
            </p>
            <h3 className="text-2xl sm:text-3xl font-semibold">
              Accélérez l’accès à l’emploi de vos étudiants
            </h3>
          </div>
        </div>

        {/* Contenu + CTA (2 boutons seulement) */}
        <div className="grid md:grid-cols-[1.2fr_.8fr] gap-6">
          <div className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li>• Accès étudiant à un moteur d’offres finance unifié</li>
              <li>• Alertes ciblées et suivi des candidatures</li>
              <li>• Ateliers “relances & entretien” avec votre Career Center</li>
            </ul>

            <div className="flex flex-wrap gap-3">
              {/* Téléchargement direct (PDF) */}
              <a
                href={ONE_PAGER}
                download="Job-Alert-one-pager.pdf"
                className="btn"
              >
                Télécharger le one-pager
              </a>

              {/* Ouverture de la modale de contact */}
              <button
                onClick={() => setOpen(true)}
                className="btn-ghost px-4 py-2 rounded-[12px]"
              >
                Contacter l’équipe
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground">
              *Contenu adaptable en fonction de vos besoins et de votre calendrier.
            </p>
          </div>

          {/* Encadré “Ce que vous obtenez” (sans logos/partenaires) */}
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <p className="text-sm font-medium mb-3">Ce que vous obtenez</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
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
