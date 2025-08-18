// ui/src/app/contact/page.tsx
import Link from "next/link";

const EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact@example.com";

export default function ContactPage() {
  return (
    <main className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <h1 className="text-3xl font-semibold mb-2">Contact</h1>
        <p className="text-muted-foreground mb-6">
          Partenariats écoles, programmes d’accompagnement, démos… Parlons-en.
        </p>

        <div className="flex flex-wrap gap-3">
          <a className="btn" href={`mailto:${EMAIL}?subject=Job%20Alert%20—%20Contact`}>
            Écrire un mail
          </a>
          <Link className="btn-ghost" href="/media/one-pager.pdf" target="_blank" prefetch={false}>
            Télécharger le one-pager
          </Link>
        </div>
      </section>
    </main>
  );
}
