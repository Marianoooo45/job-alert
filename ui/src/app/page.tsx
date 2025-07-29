// Fichier: app/page.tsx (CORRIGÉ)

import { SearchBar } from "@/components/SearchBar";
import JobTable from "@/components/JobTable";
import Pagination from "@/components/Pagination";

// Forcer la page à être dynamique
export const dynamic = "force-dynamic";

interface Job {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  link: string;
  posted: string;
  source: string;
  keyword: string;
  category?: string | null;
  contract_type?: string | null;
}

const LIMIT = 25;

// La fonction fetchJobs est parfaite
async function fetchJobs(searchParams: URLSearchParams): Promise<Job[]> {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const url = new URL("/api/jobs", baseUrl);
  url.search = searchParams.toString();

  const response = await fetch(url.toString(), { cache: "no-store" });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(`Failed to fetch jobs: ${errorBody.error || response.statusText}`);
  }

  return response.json();
}

// --- 👇 DÉBUT DE LA CORRECTION 👇 ---

// On définit un type propre pour les props de la page, c'est la convention standard.
type HomePageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

export default async function HomePage({ searchParams }: HomePageProps) {
  // --- 👆 FIN DE LA CORRECTION 👆 ---
  
  let jobs: Job[] = [];
  let fetchError: string | null = null;
  
  const queryParams = new URLSearchParams();

  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => queryParams.append(key, v));
      } else if (value) {
        queryParams.append(key, value);
      }
    });
  }

  const page = parseInt(queryParams.get("page") || "1", 10);
  const currentPage = Math.max(page, 1);
  const offset = (currentPage - 1) * LIMIT;

  queryParams.set("limit", LIMIT.toString());
  queryParams.set("offset", offset.toString());


  try {
    jobs = await fetchJobs(queryParams);
  } catch (error: any) {
    console.error("Erreur de chargement des offres :", error);
    fetchError = error.message;
  }

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

        {fetchError ? (
          <div className="text-center text-red-500 bg-red-100 p-4 rounded-md">
            <strong>Erreur de chargement :</strong>
            <p>{fetchError}</p>
          </div>
        ) : (
          <>
            <JobTable jobs={jobs} />
            <Pagination currentPage={currentPage} hasNextPage={hasNextPage} />
          </>
        )}
      </div>
    </main>
  );
}