// Fichier: app/page.tsx (SIMPLIFIÉ ET CORRIGÉ)

import { SearchBar } from "@/components/SearchBar";
import JobTable from "@/components/JobTable";
import Pagination from "@/components/Pagination";
import { getJobs, Job } from "@/lib/data"; // On importe notre nouvelle fonction

export const dynamic = "force-dynamic";

const LIMIT = 25;

export default function HomePage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  // On construit les paramètres pour la pagination
  const page = parseInt(String(searchParams?.page || "1"), 10);
  const currentPage = Math.max(page, 1);
  const offset = (currentPage - 1) * LIMIT;
  
  const allSearchParams = { ...searchParams, limit: String(LIMIT), offset: String(offset) };

  // Plus de fetch ! On appelle directement notre fonction.
  const jobs = getJobs(allSearchParams);

  const hasNextPage = jobs.length === LIMIT;

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
        </div>

        <SearchBar />

        <JobTable jobs={jobs} />
        <Pagination currentPage={currentPage} hasNextPage={hasNextPage} />
      </div>
    </main>
  );
}