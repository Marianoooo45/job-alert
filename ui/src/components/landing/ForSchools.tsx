// ui/src/components/landing/ForSchools.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

const PARTNERS = [
  { name: "EDHEC",    src: "/partners/edhec.svg" },
  { name: "HEC",      src: "/partners/hec.svg" },
  { name: "ESCP",     src: "/partners/escp.svg" },
  { name: "AlumnEye", src: "/partners/alumneye.svg" },
  // ajoute librement d’autres logos ici
];

export default function ForSchools() {
  return (
    <motion.section
      className="panel p-6 sm:p-8"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.42 }}
    >
      <div className="grid md:grid-cols-2 gap-6">
        {/* Texte + CTAs */}
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
            Pour les écoles
          </p>
          <h3 className="text-2xl sm:text-3xl font-semibold mb-4">
            Accélérez l’accès à l’emploi de vos étudiants
          </h3>

          <ul className="space-y-2 text-sm mb-5">
            <li>• Accès des étudiants à un moteur d’offres finance unifié</li>
            <li>• Alertes ciblées et suivi des candidatures</li>
            <li>• Ateliers “relances & entretien” avec votre Career Center</li>
          </ul>

          {/* CTAs alignés et propres */}
          <div className="flex flex-wrap gap-3">
            {/* mets ton vrai PDF/Notion plus tard */}
            <Link
              href="/media/one-pager-ja.pdf"
              target="_blank"
              className="btn"
            >
              Télécharger le one-pager
            </Link>

            {/* adapte l’adresse si tu préfères une page /contact */}
            <Link
              href="mailto:contact@jobalert.app?subject=Partenariat%20école&body=Bonjour%2C%20je%20souhaite%20en%20savoir%20plus%20sur%20vos%20partenariats."
              className="btn-ghost"
            >
              Contact
            </Link>
          </div>

          <p className="text-[11px] text-muted-foreground mt-3">
            *Estimation indicative — personnalisable en démo.
          </p>
        </div>

        {/* Logos partenaires (illustration + preuve sociale) */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <p className="text-center text-sm text-muted-foreground mb-3">
            Quelques établissements & partenaires (exemples)
          </p>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 sm:gap-5 items-center justify-items-center">
            {PARTNERS.map((p) => (
              <div
                key={p.name}
                className="w-full max-w-[140px] aspect-[5/2] grid place-items-center rounded-lg border border-border bg-surface/40 logo-tile"
                title={p.name}
              >
                {/* Image locale : place les fichiers dans /ui/public/partners/ */}
                <Image
                  src={p.src}
                  alt={p.name}
                  width={140}
                  height={56}
                  className="opacity-85 hover:opacity-100 transition"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
