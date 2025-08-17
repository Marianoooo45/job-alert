// ui/src/app/home/page.tsx
"use client";

import Link from "next/link";
import HeroVideo from "@/components/landing/HeroVideo";
import LogoMarquee from "@/components/landing/LogoMarquee";

const BANKS = [
  { id: "bpce", label: "Groupe BPCE" },
  { id: "rothschild", label: "Edmond de Rothschild" },
  { id: "hsbc", label: "HSBC" },
  { id: "ubs", label: "UBS" },
  { id: "rbc", label: "RBC" },
  { id: "cic", label: "CIC" },
  { id: "bbva", label: "BBVA" },
  { id: "mufg", label: "MUFG" },
  { id: "socgen", label: "Société Générale" },
  { id: "db", label: "Deutsche Bank" },
  { id: "bnp", label: "BNP Paribas" },
];

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 text-center">
      <div className="text-3xl font-semibold">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero avec vidéo */}
      <section className="panel-xl relative overflow-hidden mb-8">
        <HeroVideo className="h-[360px]" />
        <div className="absolute inset-0 flex items-center">
          <div className="px-6 sm:px-10">
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
              La plateforme d’opportunités <span className="neon-title">Finance</span>
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground/90">
              Offres centralisées, alertes intelligentes, suivi de candidatures. Conçu pour les étudiants et jeunes diplômés.
            </p>
            <div className="mt-5 flex gap-3">
              <Link href="/" className="btn">Explorer les offres</Link>
              <Link href="/inbox" className="btn btn-ghost">Créer une alerte</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee banques */}
      <div className="mb-6">
        <LogoMarquee items={BANKS} />
      </div>

      {/* Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Stat value="6500" label="Offres actives" />
        <Stat value="40" label="Banques" />
        <Stat value="55" label="Pays" />
      </section>

      {/* Trois cartes “Explore / Alerte / Suis” (ta version peut rester, je laisse court ici) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="panel p-5">
          <div className="text-sm text-muted-foreground mb-1">Explore</div>
          <div className="text-lg font-medium">Parcours toutes les offres finance unifiées avec filtres précis.</div>
        </div>
        <div className="panel p-5">
          <div className="text-sm text-muted-foreground mb-1">Alerte</div>
          <div className="text-lg font-medium">Reçois des alertes ciblées et marque les offres en favoris.</div>
        </div>
        <div className="panel p-5">
          <div className="text-sm text-muted-foreground mb-1">Suis</div>
          <div className="text-lg font-medium">Ton dashboard t’aide à relancer, planifier et optimiser tes chances.</div>
        </div>
      </section>

      {/* Section écoles – garde ta version, c’est top. */}
    </main>
  );
}
