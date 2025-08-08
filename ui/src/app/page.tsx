// Fichier: app/page.tsx (VERSION FINALE TOKYO NIGHT)

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
  } catch (error) {
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
    <main className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center gap-10">
        {/* --- HERO --- */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl text-foreground">
            Job <span className="text-primary">Alert</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Votre hub centralisé pour les dernières offres d'emploi.
          </p>
          <p className="mt-2 text-sm text-muted-foreground/80">
            Dernière mise à jour : {lastUpdatedTimestamp}
          </p>

          {/* CTA */}
          <div className="mt-6 flex items-center justify-center gap-3">
            <a href="/?page=1" className="btn">
              Voir les dernières offres
            </a>
          </div>
        </div>

        {/* --- SEARCH --- */}
        <div className="w-full max-w-5xl panel rounded-xl p-2">
          <SearchBar />
        </div>

        {/* --- TABLE --- */}
        <div className="w-full max-w-5xl panel rounded-xl overflow-x-auto">
          <JobTable jobs={jobs} />
        </div>

        {/* --- PAGINATION --- */}
        <Pagination currentPage={currentPage} hasNextPage={hasNextPage} />
      </div>
    </main>
  );
}
