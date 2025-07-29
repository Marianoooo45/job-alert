// Fichier: app/page.tsx (VERSION FINALE AVEC LECTURE DE TIMESTAMP)

import { SearchBar } from "@/components/SearchBar";
import JobTable from "@/components/JobTable";
import Pagination from "@/components/Pagination";
import { getJobs } from "@/lib/data";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const LIMIT = 25;

// --- 👇 NOUVELLE FONCTION POUR LIRE LE FICHIER DE DATE 👇 ---
function getLastUpdateTime(): string {
  try {
    const filePath = path.join(process.cwd(), 'public', 'last-update.txt');
    // On lit le contenu du fichier et on supprime les espaces superflus
    return fs.readFileSync(filePath, 'utf-8').trim();
  } catch (error) {
    console.error("Impossible de lire le fichier last-update.txt:", error);
    return "Indisponible";
  }
}

export default function HomePage() {
  const jobs = fakeJobs;
  const currentPage = 1;
  const hasNextPage = false;

  return (
    <main className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center space-y-10">
        <div className="text-center">
          {/* ... Titre et description ... */}
        </div>

        {/* Déjà en commentaire, c'est parfait */}
        {/* <SearchBar /> */}

        <JobTable jobs={jobs} />

        {/* 👇 METTEZ CETTE LIGNE EN COMMENTAIRE AUSSI 👇 */}
        {/* <Pagination currentPage={currentPage} hasNextPage={hasNextPage} /> */}
      </div>
    </main>
  );
}