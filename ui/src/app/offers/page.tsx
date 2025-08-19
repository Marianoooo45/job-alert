// ui/src/app/offers/page.tsx
import { headers, cookies } from "next/headers";
import { SearchBar } from "@/components/SearchBar";
import JobTable from "@/components/JobTable";
import Pagination from "@/components/Pagination";
import RowsSelect from "@/components/RowsSelect";
import type { Job } from "@/lib/data";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/** ===== Banner image ===== */
const HERO_IMG =
  "https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=1600&auto=format&fit=crop";
const HERO_IMG_LIGHT = "https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=1600&auto=format&fit=crop";

function getLastUpdateTime(): string {
  try {
    const filePath = path.join(process.cwd(), "public", "last-update.txt");
    return fs.readFileSync(filePath, "utf-8").trim();
  } catch {
    return "Indisponible";
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function buildQuery(params: Record<string, string | string[] | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined) continue;
    if (Array.isArray(v)) v.forEach((x) => p.append(k, String(x)));
    else p.set(k, String(v));
  }
  return p;
}

export default async function OffersPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const cookieRows = Number(cookies().get("rows_per_page_v1")?.value ?? "");
  const rowsFromUrl = Number(String(searchParams?.rows ?? "")) || undefined;
  const rows = clamp(rowsFromUrl ?? (cookieRows || 25), 10, 200);

  const page = Math.max(parseInt(String(searchParams?.page || "1"), 10), 1);
  const offset = (page - 1) * rows;

  const sortBy = String(searchParams?.sortBy || "posted");
  const sortDir = String(searchParams?.sortDir || "desc");

  const hdrs = headers();
  const host = hdrs.get("host");
  const proto = host && host.startsWith("localhost") ? "http" : "https";
  const base = `${proto}://${host}`;

  const query = buildQuery({
    ...searchParams,
    sortBy,
    sortDir,
    limit: String(rows),
    offset: String(offset),
  }).toString();

  const res = await fetch(`${base}/api/jobs?${query}`, { cache: "no-store" });
  const jobs: Job[] = res.ok ? ((await res.json()) as Job[]) : [];
  const total = Number(res.headers.get("X-Total-Count") ?? jobs.length);

  const lastUpdatedTimestamp = getLastUpdateTime();

  const hasNextPage = offset + jobs.length < total;
  const from = total ? offset + 1 : 0;
  const to = Math.min(offset + jobs.length, total);

  return (
    <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* HERO */}
<section className="relative rounded-3xl overflow-hidden border border-border mb-8 panel-xl">
  <div
    className="absolute inset-0 bg-cover bg-center"
    style={{
      backgroundImage: "url('https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=1600&auto=format&fit=crop')",
      filter: "var(--hero-media-filter)", // 👈 assombrit en light
    }}
    aria-hidden
  />
  <div className="hero-scrim" /> {/* 👈 lisibilité */}

  <div className="relative z-10 p-6 sm:p-10 text-white">
    <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,.35)]">
      Job <span className="neon-title">Alert</span>
    </h1>
    <p className="mt-3 text-lg text-white/90 drop-shadow-[0_2px_10px_rgba(0,0,0,.35)]">finito le chômage.</p>
    <p className="mt-2 text-sm text-white/80 drop-shadow-[0_2px_8px_rgba(0,0,0,.35)]">
      Dernière mise à jour : {lastUpdatedTimestamp}
    </p>
  </div>
</section>

      {/* SEARCH */}
      <section className="panel rounded-2xl p-3 sm:p-4 mb-6 relative z-40">
        <SearchBar />
      </section>

      {/* TABLE */}
      <section className="rounded-2xl border border-border bg-surface shadow-[var(--glow-weak)] overflow-hidden">
        <div className="p-2 sm:p-3 overflow-x-auto">
          <div className="flex items-center justify-between px-1 pb-2">
            <div className="text-xs text-muted-foreground">
              {total ? <>Affichage {from}–{to} sur {total}</> : null}
            </div>
            <RowsSelect />
          </div>
          <JobTable jobs={jobs} />
        </div>
      </section>

      {/* Pagination */}
      <div className="mt-6">
        <Pagination currentPage={page} hasNextPage={hasNextPage} />
      </div>
    </main>
  );
}
