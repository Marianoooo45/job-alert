// Fichier: app/page.tsx

import { SearchBar } from "@/components/SearchBar";
import JobTable from "@/components/JobTable";
import Pagination from "@/components/Pagination";

// ✨ LA CORRECTION LA PLUS IMPORTANTE : Forcer la page à être dynamique
export const dynamic = "force-dynamic";

// L'interface Job doit aussi connaître le nouveau champ
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
  contract_type?: string | null; // ✅ Ajout du champ
}

const LIMIT = 25;

// La fonction fetchJobs est parfaite, on ne la touche pas
async function fetchJobs(searchParams: URLSearchParams): Promise<Job[]> {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const url = new URL("/api/jobs", baseUrl);
  url.search = searchParams.toString();

  // 'no-store' est crucial pour éviter le cache
  const response = await fetch(url.toString(), { cache: "no-store" });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(`Failed to fetch jobs: ${errorBody.error || response.statusText}`);
  }

  return response.json();
}

export default async function HomePage({
  searchParams,
}: {
  // On s'attend à ce que les searchParams puissent être des chaînes ou des tableaux de chaînes
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  let jobs: Job[] = [];
  let fetchError: string | null = null;
  
  // ✨ LOGIQUE DE CONSTRUCTION DES PARAMÈTRES SIMPLIFIÉE ET CORRIGÉE
  const queryParams = new URLSearchParams();

  // On traite tous les paramètres de manière générique
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        // Si c'est un tableau (ex: bank, category, contractType), on ajoute chaque valeur
        value.forEach(v => queryParams.append(key, v));
      } else if (value) {
        // Si c'est une chaîne (ex: keyword, page), on l'ajoute
        queryParams.append(key, value);
      }
    });
  }

  // Gestion de la pagination
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

  // La pagination se base sur le fait que l'API renvoie exactement le nombre d'éléments demandés
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