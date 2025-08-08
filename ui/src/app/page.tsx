// ui/src/app/page.tsx
import { SearchBar } from "@/components/SearchBar";
import JobTable from "@/components/JobTable";
import Pagination from "@/components/Pagination";
import { getJobs } from "@/lib/data";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
const LIMIT = 25;

/** ===== Banner image =====
 * Change juste cette constante si tu veux une autre image.
 * (3 alternatives proposées ci-dessous)
 */
const HERO_IMG =
  "https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=1600&auto=format&fit=crop"; // trading floor / tickers, dark

// Alternatives (copie-colle l’une d’elles si tu préfères)
// const HERO_IMG = "https://images.unsplash.com/photo-1551281044-8d8d1ae5d8d2?q=80&w=1600&auto=format&fit=crop"; // market board
// const HERO_IMG = "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=1600&auto=format&fit=crop"; // candlesticks close-up
// const HERO_IMG = "https://images.unsplash.com/photo-1559526324-593bc073d938?q=80&w=1600&auto=format&fit=crop"; // charts & laptop

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
    <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* HERO */}
      <section className="relative rounded-3xl overflow-hidden border border-border mb-8 panel-xl">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-[0.22]"
          style={{ backgroundImage: `url('${HERO_IMG}')` }}
          aria-hidden
        />
        {/* overlay pour lisibilité + vibe néon */}
        <div className="absolute inset-0 bg-[radial-gradient(60%_120%_at_80%_-20%,rgba(187,154,247,.22),transparent),radial-gradient(60%_120%_at_0%_40%,rgba(247,118,142,.18),transparent)]" />
        <div className="relative z-10 p-6 sm:p-10">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
            Job <span className="text-primary neon-title">Alert</span>
          </h1>
          <p className="mt-3 text-lg text-muted-foreground/90">finito le chômage.</p>
          <p className="mt-2 text-sm text-muted-foreground/80">Dernière mise à jour : {lastUpdatedTimestamp}</p>
        </div>
      </section>

      {/* SEARCH */}
      <section className="panel rounded-2xl p-3 sm:p-4 mb-6">
        <SearchBar />
      </section>

      {/* TABLE */}
      <section className="rounded-2xl border border-border bg-surface shadow-[var(--glow-weak)] overflow-hidden">
        <div className="p-2 sm:p-3 overflow-x-auto">
          <JobTable jobs={jobs} />
        </div>
      </section>

      <div className="mt-6">
        <Pagination currentPage={currentPage} hasNextPage={hasNextPage} />
      </div>
    </main>
  );
}
