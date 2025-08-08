// Fichier: ui/src/app/page.tsx
import { SearchBar } from "@/components/SearchBar";
import JobTable from "@/components/JobTable";
import Pagination from "@/components/Pagination";
import { getJobs } from "@/lib/data";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const LIMIT = 25;

function getLastUpdateTime(): string {
  try {
    const filePath = path.join(process.cwd(), "public", "last-update.txt");
    return fs.readFileSync(filePath, "utf-8").trim();
  } catch {
    return "Indisponible";
  }
}

export default function HomePage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const page = parseInt(String(searchParams?.page || "1"), 10);
  const currentPage = Math.max(page, 1);
  const offset = (currentPage - 1) * LIMIT;

  const allSearchParams = { ...searchParams, limit: String(LIMIT), offset: String(offset) };

  const jobs = getJobs(allSearchParams);
  const hasNextPage = jobs.length === LIMIT;
  const lastUpdatedTimestamp = getLastUpdateTime();

  return (
    <main className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
      {/* Hero compact avec image de trading en fond discret */}
      <section
        className="relative rounded-2xl overflow-hidden border border-border mb-10"
        style={{
          background:
            "radial-gradient(1200px 800px at 80% -10%, rgba(187,154,247,.12), transparent), radial-gradient(900px 600px at -10% 20%, rgba(122,162,247,.10), transparent)",
        }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center opacity-[0.18]"
          style={{ backgroundImage: "url('/hero-trading.jpg')" }}
          aria-hidden
        />
        <div className="relative z-10 px-6 sm:px-10 py-8 sm:py-10">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
            Job <span className="text-primary">Alert</span>
          </h1>
          <p className="mt-3 text-lg text-muted-foreground max-w-2xl">
            Votre hub centralisé pour les dernières offres d’emploi en finance. Scraping multi-banques, base SQLite,
            API Next.js, UI moderne et notifications Discord.
          </p>
          <p className="mt-2 text-sm text-muted-foreground/80">Dernière mise à jour : {lastUpdatedTimestamp}</p>

          <div className="mt-6 flex items-center gap-3">
            <a
              href="/?page=1&recent=24"
              className="btn active:scale-[0.98] transition-transform"
              title="N’afficher que les offres < 24h"
            >
              Offres récentes (&lt; 24h)
            </a>
          </div>
        </div>
      </section>

      {/* Search */}
      <section className="panel rounded-2xl p-3 sm:p-4 mb-8">
        <SearchBar />
      </section>

      {/* Table */}
      <section className="panel rounded-2xl p-2 sm:p-3 overflow-x-auto">
        <JobTable jobs={jobs} />
      </section>

      <div className="mt-6">
        <Pagination currentPage={currentPage} hasNextPage={hasNextPage} />
      </div>
    </main>
  );
}
