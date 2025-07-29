// Fichier: app/page.tsx (AVEC DATE DE MISE À JOUR)

import { SearchBar } from "@/components/SearchBar";
import JobTable from "@/components/JobTable";
import Pagination from "@/components/Pagination";
import { getJobs } from "@/lib/data";

// --- AJOUTS POUR LA DATE DE MISE À JOUR ---
import fs from "fs";
import path from "path";
// --- FIN DES AJOUTS ---

export const dynamic = "force-dynamic";

const LIMIT = 25;

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

  // --- AJOUTS POUR LA DATE DE MISE À JOUR ---
  let lastUpdatedTimestamp: string | null = null;
  try {
    const dbPath = path.join(process.cwd(), 'public', 'jobs.db');
    // On lit les métadonnées du fichier de base de données
    const stats = fs.statSync(dbPath);
    // On formate la date de dernière modification pour l'afficher joliment
    lastUpdatedTimestamp = new Date(stats.mtime).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error("Impossible de lire la date de modification de la base de données:", error);
    lastUpdatedTimestamp = "Indisponible";
  }
  // --- FIN DES AJOUTS ---

  return (
    <main className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center space-y-10">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl text-white">
            Job Alert
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Votre hub centralisé pour les dernières offres d'emploi.
          </p>

          {/* --- AJOUTS POUR LA DATE DE MISE À JOUR --- */}
          {lastUpdatedTimestamp && (
            <p className="mt-2 text-sm text-gray-400">
              Dernière mise à jour : {lastUpdatedTimestamp}
            </p>
          )}
          {/* --- FIN DES AJOUTS --- */}

        </div>

        <SearchBar />
        <JobTable jobs={jobs} />
        <Pagination currentPage={currentPage} hasNextPage={hasNextPage} />
      </div>
    </main>
  );
}