import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import SearchBar from "@/components/SearchBar";
import JobTable from "@/components/JobTable";
import Pagination from "@/components/Pagination";
import RowsSelect from "@/components/RowsSelect";
import type { Job } from "@/lib/data";
import fs from "fs";
import path from "path";
import RevealOnScroll from "./RevealOnScroll";
import { Database, Radio, RefreshCcw, Activity, BarChart } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* Helpers inchangés */
function getLastUpdateTime(): string {
  try {
    const filePath = path.join(process.cwd(), "public", "last-update.txt");
    return fs.readFileSync(filePath, "utf-8").trim();
  } catch {
    return "N/A";
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
async function getBaseUrlFromRequest() {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "http";
    if (host) return `${proto}://${host}`;
  } catch {}
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
async function serializeIncomingCookies(): Promise<string> {
  const jar = await cookies();
  const pairs = jar.getAll().map((c) => `${c.name}=${encodeURIComponent(c.value)}`);
  return pairs.join("; ");
}

export default async function OffersPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await requireSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent("/offers")}`);
  }

  const sp = (await searchParams) ?? {};
  const c = await cookies();
  const cookieRows = Number(c.get("rows_per_page_v1")?.value ?? "");
  const rowsFromUrl = Number(String(sp.rows ?? "")) || undefined;
  const rows = clamp(rowsFromUrl ?? (cookieRows || 25), 10, 200);
  const page = Math.max(parseInt(String(sp.page || "1"), 10), 1);
  const offset = (page - 1) * rows;
  const sortBy = String(sp.sortBy || "posted");
  const sortDir = String(sp.sortDir || "desc");

  const query = buildQuery({
    ...sp,
    sortBy,
    sortDir,
    limit: String(rows),
    offset: String(offset),
  }).toString();
  const base = await getBaseUrlFromRequest();
  const apiUrl = `${base}/api/jobs?${query}`;

  let jobs: Job[] = [];
  let total = 0;
  try {
    const cookieHeader = await serializeIncomingCookies();
    const res = await fetch(apiUrl, {
      cache: "no-store",
      next: { revalidate: 0 },
      headers: { cookie: cookieHeader },
    });
    jobs = res.ok ? ((await res.json()) as Job[]) : [];
    total = Number(res.headers.get("X-Total-Count") ?? jobs.length);
  } catch {
    jobs = [];
    total = 0;
  }

  const lastUpdatedTimestamp = getLastUpdateTime();
  const hasNextPage = offset + jobs.length < total;
  const from = total ? offset + 1 : 0;
  const to = Math.min(offset + jobs.length, total);

  return (
    <main className="offers-bg min-h-screen w-full px-4 sm:px-6 lg:px-8 pt-32 pb-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* === HEADER === */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/80">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              Market Feed
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-primary/10 text-primary border border-primary/20 tracking-wider">
                LIVE
              </span>
            </h1>
            <p className="text-muted-foreground max-w-lg text-sm">
              Flux temps réel des opportunités M&A, PE et Trading.
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="text-[10px] uppercase text-muted-foreground flex items-center justify-end gap-1.5 mb-0.5">
                <RefreshCcw className="w-3 h-3" /> Sync
              </span>
              <span className="text-sm font-mono text-foreground">
                {lastUpdatedTimestamp}
              </span>
            </div>
            <div className="h-8 w-px bg-border hidden sm:block" />
            <div className="text-right">
              <span className="text-[10px] uppercase text-muted-foreground flex items-center justify-end gap-1.5 mb-0.5">
                <Database className="w-3 h-3" /> Volume
              </span>
              <span className="text-sm font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                {total.toLocaleString()}
              </span>
            </div>
            <div className="h-8 w-px bg-border hidden sm:block" />
            <Link href="/stats" className="text-right group">
              <span className="text-[10px] uppercase text-muted-foreground flex items-center justify-end gap-1.5 mb-0.5">
                <BarChart className="w-3 h-3" /> Stats de Nerd
              </span>
              <span className="text-sm font-mono text-foreground group-hover:underline">
                Consulter
              </span>
            </Link>
          </div>
        </header>

        {/* === TOOLBAR === */}
        <div className="flex flex-col gap-4">
          <div className="w-full">
            <SearchBar />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1">
            <div className="text-xs text-muted-foreground font-mono flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-primary" />
              <span>
                Résultats{" "}
                <span className="text-foreground font-bold">
                  {from}-{to}
                </span>{" "}
                sur{" "}
                <span className="text-foreground font-bold">{total}</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted border border-border text-xs text-muted-foreground font-mono">
                <Radio className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500 animate-pulse" />
                <span>CONNECTED</span>
              </div>
              <RowsSelect />
            </div>
          </div>
        </div>

        {/* === DATA GRID === */}
        <div className="relative min-h-[500px]" data-offers-table>
          <JobTable jobs={jobs} />
        </div>

        {/* === FOOTER === */}
        <div className="pt-4 flex justify-center border-t border-border/80">
          <Pagination currentPage={page} hasNextPage={hasNextPage} />
        </div>
      </div>

      <RevealOnScroll selector="[data-offers-table] tbody tr" />
    </main>
  );
}
