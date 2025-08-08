// Fichier: ui/src/app/page.tsx (VERSION PRO TOKYO NIGHT)

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

  const allSearchParams = {
    ...searchParams,
    limit: String(LIMIT),
    offset: String(offset),
  };

  const jobs = getJobs(allSearchParams);
  const hasNextPage = jobs.length === LIMIT;
  const lastUpdatedTimestamp = getLastUpdateTime();

  return (
    <main className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
      {/* HERO avec image + dégradés */}
      <section
        className="relative rounded-2xl overflow-hidden border border-border mb-10"
        style={{
          background:
            "radial-gradient(1200px 800px at 80% -10%, rgba(187,154,247,.12), transparent), radial-gradient(900px 600px at -10% 20%, rgba(122,162,247,.10), transparent)",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.25] bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=1600&auto=format&fit=crop')",
          }}
        />
        <div className="relative z-10 px-6 sm:px-10 py-12 sm:py-16">
          <h1 className="neon-title text-4xl sm:text-5xl font-semibold tracking-tight">
            Job <span className="text-primary">Alert</span>
          </h1>
          <p className="mt-3 text-lg text-muted-foreground max-w-2xl">
            Votre hub centralisé pour les dernières offres d’emploi en finance. Scraping multi-banques,
            base SQLite, API Next.js, UI moderne et notifications Discord.
          </p>
          <p className="mt-2 text-sm text-muted-foreground/80">
            Dernière mise à jour : {lastUpdatedTimestamp}
          </p>

          <div className="mt-6 flex items-center gap-3">
            <a href="/?page=1" className="btn">Voir les dernières offres</a>
            <a href="/?category=Markets&page=1" className="btn btn-ghost">Marchés</a>
          </div>
        </div>
      </section>

      {/* SEARCH */}
      <section className="panel rounded-2xl p-3 sm:p-4 mb-8">
        <SearchBar />
      </section>

      {/* TABLE élargie */}
      <section className="panel rounded-2xl p-2 sm:p-3 overflow-x-auto">
        <JobTable jobs={jobs} />
      </section>

      <div className="mt-6">
        <Pagination currentPage={currentPage} hasNextPage={hasNextPage} />
      </div>
    </main>
  );
}
