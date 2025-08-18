// ui/src/components/landing/ForSchools.tsx
import Link from "next/link";

export default function ForSchools() {
  return (
    <section className="grid gap-6 sm:grid-cols-2">
      <div className="rounded-2xl border border-border bg-surface p-6">
        <p className="text-sm text-muted-foreground mb-2">Pour les écoles</p>
        <h3 className="text-2xl font-semibold mb-4">
          Accélérez l’accès à l’emploi de vos étudiants
        </h3>

        <ul className="list-disc pl-5 space-y-2 text-sm">
          <li>Accès des étudiants à un moteur d’offres finance unifié</li>
          <li>Alertes ciblées et suivi des candidatures</li>
          <li>Ateliers “relances & entretien” avec votre Career Center</li>
        </ul>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/offers" className="btn">Voir les offres</Link>
          <Link href="/media/one-pager.pdf" target="_blank" prefetch={false} className="btn-ghost">
            Télécharger le one-pager
          </Link>
          <Link href="/contact" className="btn-ghost">Contact</Link>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          *Estimation indicative — personnalisable en démo.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6 grid place-items-center text-muted-foreground">
        Illustration
      </div>
    </section>
  );
}
