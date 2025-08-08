// Fichier: ui/src/app/page.tsx (HERO DYNAMIQUE PAR CATÉGORIE)

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

function getArrayParam(v: string | string[] | undefined): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return [v];
}

function pickHero(categoryList: string[]) {
  // Normalisation simple
  const lc = categoryList.map((s) => s.toLowerCase());
  const has = (k: string) => lc.some((x) => x.includes(k));

  // Par défaut
  let image =
    "https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=1600&auto=format&fit=crop";
  let title = (
    <>
      Job <span className="text-primary">Alert</span>
    </>
  );
  let subtitle =
    "Votre hub centralisé pour les dernières offres d’emploi en finance. Scraping multi-banques, base SQLite, API Next.js, UI moderne et notifications Discord.";
  let ctaHref = "/?page=1";
  let ctaLabel = "Voir les dernières offres";

  if (has("market")) {
    image =
      "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?q=80&w=1600&auto=format&fit=crop"; // trading boards
    title = (
      <>
        Offres <span className="text-primary">Markets</span>
      </>
    );
    subtitle =
      "Sales & Trading, Structuring, Strats, Quant… Toutes les offres Markets centralisées en temps réel.";
    ctaHref = "/?category=Markets&page=1";
    ctaLabel = "Filtrer Markets";
  } else if (has("data")) {
    image =
      "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=1600&auto=format&fit=crop";
    title = (
      <>
        Offres <span className="text-primary">Data</span>
      </>
    );
    subtitle =
      "Data Science, Engineering, Analytics, MLOps. Les rôles data des banques, au même endroit.";
    ctaHref = "/?category=Data&page=1";
    ctaLabel = "Filtrer Data";
  } else if (has("risk")) {
    image =
      "https://images.unsplash.com/photo-1543286386-2e659306cd6c?q=80&w=1600&auto=format&fit=crop";
    title = (
      <>
        Offres <span className="text-primary">Risk</span>
      </>
    );
    subtitle =
      "Market/Credit/Operational Risk, Model Validation. Les offres risk en un clin d’œil.";
    ctaHref = "/?category=Risk&page=1";
    ctaLabel = "Filtrer Risk";
  }

  return { image, title, subtitle, ctaHref, ctaLabel };
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

  const selectedCategories = getArrayParam(searchParams?.category);
  const hero = pickHero(selectedCategories);

  return (
    <main className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
      {/* HERO dynamique */}
      <section
        className="relative rounded-2xl overflow-hidden border border-border mb-10"
        style={{
          background:
            "radial-gradient(1200px 800px at 80% -10%, rgba(187,154,247,.12), transparent), radial-gradient(900px 600px at -10% 20%, rgba(122,162,247,.10), transparent)",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.25] bg-cover bg-center"
          style={{ backgroundImage: `url('${hero.image}')` }}
        />
        <div className="relative z-10 px-6 sm:px-10 py-12 sm:py-16">
          <h1 className="neon-title text-4xl sm:text-5xl font-semibold tracking-tight">
            {hero.title}
          </h1>
          <p className="mt-3 text-lg text-muted-foreground max-w-2xl">
            {hero.subtitle}
          </p>
          <p className="mt-2 text-sm text-muted-foreground/80">
            Dernière mise à jour : {lastUpdatedTimestamp}
          </p>

          <div className="mt-6 flex items-center gap-3">
            <a href={hero.ctaHref} className="btn">
              {hero.ctaLabel}
            </a>
            <a href="/?page=1" className="btn btn-ghost">
              Tout voir
            </a>
          </div>
        </div>
      </section>

      {/* SEARCH */}
      <section className="panel rounded-2xl p-3 sm:p-4 mb-8">
        <SearchBar />
      </section>

      {/* TABLE */}
      <section className="panel rounded-2xl p-2 sm:p-3 overflow-x-auto">
        <JobTable jobs={jobs} />
      </section>

      <div className="mt-6">
        <Pagination currentPage={currentPage} hasNextPage={hasNextPage} />
      </div>
    </main>
  );
}
