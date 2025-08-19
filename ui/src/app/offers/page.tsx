// ui/src/app/offers/page.tsx
import { cookies } from "next/headers";
import Link from "next/link";

type SearchParams = { [key: string]: string | string[] | undefined };

const DEFAULT_ROWS = 25;
const ROW_CHOICES = [10, 25, 50, 100] as const;

function pickOne(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
function toInt(v: string | undefined, fallback: number): number {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export default async function OffersPage({
  searchParams = {},
}: {
  searchParams?: SearchParams;
}) {
  const store = cookies();

  // rows: priorité à l’URL, sinon cookie, sinon défaut
  const cookieRows = Number(store.get("rows_per_page_v1")?.value ?? "");
  const rows = toInt(pickOne(searchParams.rows), cookieRows || DEFAULT_ROWS);
  const page = Math.max(1, toInt(pickOne(searchParams.page), 1));
  const q = pickOne(searchParams.q) ?? "";

  // persiste le choix "rows" si différent du cookie
  try {
    if (!Number.isNaN(rows) && rows !== cookieRows) {
      store.set("rows_per_page_v1", String(rows), { path: "/" });
    }
  } catch {
    /* ignore (ex: mode edge read-only) */
  }

  // -----------------------------------------------------------------------
  // ICI tu peux brancher ton fetch réel (DB/API) avec page/rows/q...
  // const { items, total } = await getOffers({ page, rows, q, ... });
  // Pour la démo on génère des lignes factices :
  const total = 7253;
  const items = Array.from({ length: rows }, (_, i) => ({
    id: `fake-${(page - 1) * rows + i + 1}`,
    title: `Titre de poste #${(page - 1) * rows + i + 1}`,
    bank: "—",
    location: "—",
    date: "il y a 1 heure",
    isNew: i < 3,
  }));
  // -----------------------------------------------------------------------

  return (
    <main className="px-4 sm:px-6 lg:px-8 py-4 space-y-6">
      {/* Bandeau haut (sobre, sans media) */}
      <section className="panel-xl relative overflow-hidden rounded-3xl border border-border p-6 sm:p-8">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
          Offres d’emploi
        </h1>
        <p className="text-muted-foreground mt-2">
          {q ? (
            <>
              Résultats pour <span className="font-medium">“{q}”</span>
            </>
          ) : (
            <>Parcourez toutes les offres disponibles.</>
          )}
        </p>
      </section>

      {/* Barre de recherche ultra simple (tu peux remplacer par ton composant) */}
      <form className="panel p-3 sm:p-4 rounded-2xl flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <input
            name="q"
            defaultValue={q}
            placeholder="Rechercher un intitulé, une compétence…"
            className="w-full bg-transparent border border-border rounded-xl px-3 py-2 outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <input type="hidden" name="rows" value={rows} />
          <button className="btn" type="submit">
            Rechercher
          </button>
          {q && (
            <Link
              href="/offers"
              className="btn-ghost"
              prefetch={false}
              aria-label="Réinitialiser la recherche"
            >
              Effacer
            </Link>
          )}
        </div>
      </form>

      {/* En-tête de liste : compteur + choix du nombre de lignes */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Affichage {(page - 1) * rows + 1}–{(page - 1) * rows + items.length} sur{" "}
          {total}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Lignes :</span>
          <form action="/offers" className="segmented flex items-center gap-1" data-segmented>
            {/* On renvoie q/page quand on change rows */}
            <input type="hidden" name="q" value={q} />
            <input type="hidden" name="page" value={page} />
            {ROW_CHOICES.map((n) => (
              <button
                key={n}
                type="submit"
                name="rows"
                value={n}
                className={`seg-item pill-btn px-3 py-1 rounded-xl border ${
                  rows === n ? "is-active" : ""
                }`}
                aria-pressed={rows === n}
              >
                {n}
              </button>
            ))}
          </form>
        </div>
      </div>

      {/* Tableau */}
      <div className="panel overflow-hidden">
        <table className="table-default w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left px-4 py-3">Poste</th>
              <th className="text-left px-4 py-3">Banque</th>
              <th className="text-left px-4 py-3">Lieu</th>
              <th className="text-left px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <Link
                    href={`/offers/${item.id}`}
                    className="hover:underline"
                    prefetch={false}
                  >
                    {item.title}
                  </Link>{" "}
                  {item.isNew && <span className="badge-new ml-2">Nouveau</span>}
                </td>
                <td className="px-4 py-3">{item.bank}</td>
                <td className="px-4 py-3">{item.location}</td>
                <td className="px-4 py-3">{item.date}</td>
              </tr>
            ))}
            {/* Assure un trait sous la dernière ligne */}
            <tr>
              <td colSpan={4} className="p-0">
                <div className="border-b border-border" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <nav aria-label="Pagination" className="flex items-center gap-2">
        <form action="/offers" className="flex items-center gap-2">
          <input type="hidden" name="q" value={q} />
          <input type="hidden" name="rows" value={rows} />
          <button
            className="pager-btn pill-btn px-3 py-2 rounded-xl border"
            name="page"
            value={Math.max(1, page - 1)}
            disabled={page <= 1}
          >
            Précédent
          </button>
          <span className="pager-current pill-btn px-3 py-2 rounded-xl border">
            Page {page}
          </span>
          <button
            className="pager-btn pill-btn px-3 py-2 rounded-xl border"
            name="page"
            value={page + 1}
          >
            Suivant
          </button>
        </form>
      </nav>
    </main>
  );
}
