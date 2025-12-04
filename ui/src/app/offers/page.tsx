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
import { Database, Radio, RefreshCcw, Activity, BarChart, Zap, TrendingUp } from "lucide-react";

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
    <main className="relative min-h-screen w-full px-4 sm:px-6 lg:px-8 pt-28 pb-12 overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20 z-0">
        <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-primary/30 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-secondary/30 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      {/* Grid pattern subtil */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-grid-finance opacity-30" />

      <div className="max-w-[1600px] mx-auto space-y-8 relative z-10">
        {/* === HEADER HÉRO === */}
        <header className="relative">
          {/* Glow effect */}
          <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-purple-500/20 to-secondary/20 blur-3xl opacity-50 animate-pulse" />
          
          <div className="relative backdrop-blur-xl bg-background/40 border border-border/50 rounded-2xl p-8 shadow-[0_0_50px_rgba(var(--primary-rgb),0.15)] hover:shadow-[0_0_80px_rgba(var(--primary-rgb),0.25)] transition-all duration-500 group overflow-hidden">
            {/* Scanline effect */}
            <div className="absolute top-0 left-0 w-full h-[2px] overflow-hidden">
              <div className="absolute w-full h-full bg-gradient-to-r from-transparent via-primary to-transparent animate-scan opacity-60" />
            </div>

            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              {/* Left side */}
              <div className="space-y-4 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary via-purple-400 to-secondary bg-clip-text text-transparent animate-gradient">
                    MARKET FEED
                  </h1>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                    </span>
                    <span className="text-[11px] font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-wider">
                      LIVE STREAM
                    </span>
                  </div>
                </div>
                
                <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
                  Flux temps réel des opportunités M&A, Private Equity et Trading • 
                  <span className="text-primary font-semibold"> Intelligence algorithmique</span>
                </p>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/20">
                    <Zap className="w-3.5 h-3.5 text-primary" />
                    <span className="text-muted-foreground">Auto-refresh: <span className="text-foreground font-bold">30s</span></span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/5 border border-secondary/20">
                    <TrendingUp className="w-3.5 h-3.5 text-secondary" />
                    <span className="text-muted-foreground">Quality: <span className="text-foreground font-bold">Premium</span></span>
                  </div>
                </div>
              </div>

              {/* Right side - Stats cards */}
              <div className="flex flex-wrap lg:flex-nowrap items-center gap-4">
                {/* Sync time */}
                <div className="group/stat flex-1 lg:flex-none backdrop-blur-xl bg-background/60 border border-border/50 rounded-xl p-4 hover:border-primary/50 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)] min-w-[140px]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 group-hover/stat:scale-110 group-hover/stat:rotate-6 transition-transform duration-300">
                      <RefreshCcw className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-[9px] uppercase text-muted-foreground tracking-widest font-mono mb-1">
                        LAST SYNC
                      </div>
                      <div className="text-sm font-bold font-mono text-foreground">
                        {lastUpdatedTimestamp}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Volume */}
                <div className="group/stat flex-1 lg:flex-none backdrop-blur-xl bg-background/60 border border-border/50 rounded-xl p-4 hover:border-emerald-500/50 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(34,197,94,0.2)] min-w-[140px]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 group-hover/stat:scale-110 group-hover/stat:rotate-6 transition-transform duration-300">
                      <Database className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <div className="text-[9px] uppercase text-muted-foreground tracking-widest font-mono mb-1">
                        VOLUME
                      </div>
                      <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {total.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats link */}
                <Link 
                  href="/stats"
                  className="group/stat flex-1 lg:flex-none backdrop-blur-xl bg-background/60 border border-border/50 rounded-xl p-4 hover:border-secondary/50 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(247,118,142,0.2)] min-w-[140px]"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-secondary/10 border border-secondary/20 group-hover/stat:scale-110 group-hover/stat:rotate-6 transition-transform duration-300">
                      <BarChart className="w-4 h-4 text-secondary" />
                    </div>
                    <div>
                      <div className="text-[9px] uppercase text-muted-foreground tracking-widest font-mono mb-1">
                        Stats de Nerd
                      </div>
                      <div className="text-sm font-bold font-mono text-foreground group-hover/stat:text-secondary transition-colors">
                        Voir →
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            {/* Corner accent */}
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-primary/10 via-transparent to-transparent rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          </div>
        </header>

        {/* === SEARCH BAR === */}
        <div className="backdrop-blur-xl bg-background/30 border border-border/50 rounded-2xl p-6 shadow-lg hover:shadow-[0_0_40px_rgba(var(--primary-rgb),0.1)] transition-all duration-500">
          <SearchBar />
        </div>

        {/* === TOOLBAR === */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
          {/* Results count */}
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-background/40 backdrop-blur-xl border border-border/50">
            <Activity className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-sm font-mono">
              <span className="text-muted-foreground">Résultats</span>
              {" "}
              <span className="text-foreground font-bold">
                {from}-{to}
              </span>
              {" "}
              <span className="text-muted-foreground">sur</span>
              {" "}
              <span className="text-primary font-bold">{total}</span>
            </span>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-xl">
              <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-wider">
                CONNECTED
              </span>
            </div>
            <RowsSelect />
          </div>
        </div>

        {/* === DATA GRID === */}
        <div className="relative min-h-[600px] offer-grid-appear" data-offers-table>
          <JobTable jobs={jobs} />
        </div>

        {/* === FOOTER === */}
        <div className="pt-6 flex justify-center">
          <Pagination currentPage={page} hasNextPage={hasNextPage} />
        </div>
      </div>

      <RevealOnScroll selector="[data-offers-table] tbody tr" />
    </main>
  );
}