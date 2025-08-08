// ui/src/app/page.tsx
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

  const allSearchParams = { ...searchParams, limit: String(LIMIT), offset: String(offset) };

  const jobs = getJobs(allSearchParams);
  const hasNextPage = jobs.length === LIMIT;
  const lastUpdatedTimestamp = getLastUpdateTime();

  return (
    <main className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
      {/* Hero compact (même section, nouvelle image + overlay) */}
      <section
        className="relative rounded-2xl overflow-hidden border border-border mb-10 group"
        style={{
          background:
            "radial-gradient(1200px 800px at 80% -10%, rgba(187,154,247,.12), transparent), radial-gradient(900px 600px at -10% 20%, rgba(247,118,142,.10), transparent)",
        }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center opacity-[0.25] transition-opacity duration-500 group-hover:opacity-35"
          // 📸 Néon finance haute résolution
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1543083115-638c32cd3d58?q=80&w=2400&auto=format&fit=crop')",
          }}
          aria-hidden
        />
        {/* Overlay violet/rouge subtil */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(187,154,247,.18),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(247,118,142,.16),transparent_40%)]" />
        <div className="relative z-10 px-6 sm:px-10 py-8 sm:py-10">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight neon-title">
            Job <span className="text-primary">Alert</span>
          </h1>
          <p className="mt-3 text-lg text-muted-foreground max-w-2xl">
            finito le chômage.
          </p>
          <p className="mt-2 text-sm text-muted-foreground/80">Dernière mise à jour : {lastUpdatedTimestamp}</p>
        </div>
      </section>

      <section className="panel rounded-2xl p-3 sm:p-4 mb-8">
        <SearchBar />
      </section>

      <section className="panel rounded-2xl p-2 sm:p-3 overflow-x-auto">
        <JobTable jobs={jobs} />
      </section>

      <div className="mt-6">
        <Pagination currentPage={currentPage} hasNextPage={hasNextPage} />
      </div>
    </main>
  );
}
