// Fichier: app/page.tsx (VERSION DE TEST GARANTIE SANS ERREUR)

import { SearchBar } from "@/components/SearchBar";
import JobTable from "@/components/JobTable";
import Pagination from "@/components/Pagination";

// On définit l'interface Job directement ici
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

// --- 👇 ON UTILISE DES DONNÉES DE TEST FIXES 👇 ---
const fakeJobs: Job[] = [
  {
    id: 'test-1',
    title: 'Offre de Test 1 (le site fonctionne !)',
    company: 'Vercel',
    location: 'En Ligne',
    link: 'https://vercel.com',
    posted: new Date().toISOString(),
    source: 'TEST',
    keyword: ''
  },
  {
    id: 'test-2',
    title: 'Développeur Frontend',
    company: 'GitHub',
    location: 'Remote',
    link: 'https://github.com',
    posted: new Date().toISOString(),
    source: 'TEST',
    keyword: ''
  }
];

export default function HomePage() {
  // On utilise directement nos données de test
  const jobs = fakeJobs;
  const currentPage = 1;
  const hasNextPage = false;

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

        {/* La barre de recherche sera visuelle mais pas fonctionnelle avec les données de test */}
        {/* <SearchBar /> */}

        <JobTable jobs={jobs} />
        <Pagination currentPage={currentPage} hasNextPage={hasNextPage} />
      </div>
    </main>
  );
}