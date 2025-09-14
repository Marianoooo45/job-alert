// ui/src/app/offers/page.tsx
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import SearchBar from "@/components/SearchBar";
import JobTable from "@/components/JobTable";
import Pagination from "@/components/Pagination";
import RowsSelect from "@/components/RowsSelect";
import type { Job } from "@/lib/data";
import fs from "fs";
import path from "path";
import RevealOnScroll from "./RevealOnScroll";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** ===== Banner images (light / dark) ===== */
const HERO_IMG =
  "https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=1600&auto=format&fit=crop";
const HERO_IMG_DARK =
  "https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=1600&auto=format&fit=crop";

/** ===== Aurora dynamique (light mode uniquement) ===== */
function AuroraBackdrop() {
  return (
    <>
      <div className="aurora-dyn" aria-hidden="true" />
      <style>{`
        /* caché en dark */
        html.dark .aurora-dyn { display: none; }

        /* conteneur du fond animé */
        html:not(.dark) .aurora-dyn{
          position: fixed;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          background: transparent;
          overflow: hidden;
        }

        /* halos principaux (coins + ceinture horizontale) */
        html:not(.dark) .aurora-dyn::before{
          content:"";
          position:absolute; inset:-12% -12% -12% -12%;
          background:
            radial-gradient(1100px 720px at 50% 68%, rgba(244,114,182,.22), transparent 65%),
            radial-gradient(1400px 900px at 50% 52%, rgba(59,130,246,.28), transparent 75%),
            radial-gradient(900px 900px at 0% 0%,    rgba(59,130,246,.42), transparent 70%),
            radial-gradient(900px 900px at 100% 0%,  rgba(59,130,246,.40), transparent 70%),
            radial-gradient(900px 900px at 0% 100%,  rgba(34,211,238,.42), transparent 70%),
            radial-gradient(900px 900px at 100% 100%,rgba(34,211,238,.40), transparent 70%),
            radial-gradient(1200px 760px at 50% -10%, rgba(236,72,153,.16), transparent 65%),
            radial-gradient(1200px 760px at 50% 110%, rgba(99,102,241,.16), transparent 65%);
          background-repeat:no-repeat;
          background-attachment:fixed;
          background-blend-mode:screen;
          opacity:.96;
          filter:saturate(1.3) brightness(1.05);
          will-change:transform, filter, background-position, opacity;
          animation: auroraDrift 14s ease-in-out infinite alternate,
                     auroraPulse 6s ease-in-out infinite;
        }

        /* voiles coniques subtils (mouvement supplémentaire) */
        html:not(.dark) .aurora-dyn::after{
          content:"";
          position:absolute; inset:-15% -15% -15% -15%;
          background:
            conic-gradient(from 210deg at 30% 40%, rgba(56,189,248,.16), rgba(216,180,254,.12), transparent 60%),
            conic-gradient(from  60deg at 70% 60%, rgba(147,197,253,.14), rgba(244,114,182,.12), transparent 62%),
            conic-gradient(from 130deg at 50% 20%, rgba(59,130,246,.14), transparent 55%);
          mix-blend-mode: screen;
          will-change:transform, opacity, background-position;
          animation: auroraSweep 10s ease-in-out infinite alternate,
                     auroraTilt 16s ease-in-out infinite;
        }

        @keyframes auroraDrift{
          50%{
            background-position:
              52% 70%, 50% 54%, 0% 2%, 98% 0%, 2% 98%, 98% 98%, 50% -6%, 50% 106%;
            filter:hue-rotate(12deg) saturate(1.25) brightness(1.08);
            transform: translateY(-1.2%) scale(1.015);
          }
        }
        @keyframes auroraPulse{
          0%,100%{ opacity:.92; transform:scale(1); }
          50%    { opacity:.99; transform:scale(1.02); }
        }
        @keyframes auroraSweep{
          0%   { background-position: 0% 0%, 100% 100%, 50% 0%; opacity:.55; }
          50%  { background-position: 20% 10%, 80% 85%, 46% 8%;  opacity:.75; }
          100% { background-position: 0% 0%, 100% 100%, 50% 0%; opacity:.60; }
        }
        @keyframes auroraTilt{
          0%  { transform: rotate(-0.8deg) translateY(0%); }
          50% { transform: rotate(0.9deg)  translateY(-1.2%); }
          100%{ transform: rotate(-0.8deg) translateY(0%); }
        }

        @media (prefers-reduced-motion: reduce){
          html:not(.dark) .aurora-dyn::before,
          html:not(.dark) .aurora-dyn::after{ animation:none !important; transform:none !important; }
        }
      `}</style>
    </>
  );
}

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

/** URL absolue robuste */
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
  /** ======== AUTH (SSR) ======== */
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
    <main className="page-shell container mx-auto px-4 py-8 sm:px-6 lg:px-8 relative">
      {/* Fond aurora (light) */}
      <AuroraBackdrop />

      {/* ---------- Page-level CSS (pas de styled-jsx) ---------- */}
      <style>{`
        /* BORDURES DÉGRADÉES réutilisables (SearchBar + Table) */
        .ja-gradient-border{ position:relative; border:1px solid transparent; border-radius:16px; background:var(--color-surface); }
        .ja-gradient-border::before{
          content:""; position:absolute; inset:0; padding:1px; border-radius:inherit;
          background:linear-gradient(135deg, var(--color-accent), var(--color-primary), var(--destructive));
          -webkit-mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite:xor; mask-composite:exclude; pointer-events:none; opacity:.95;
        }
        /* surbrillance au survol */
        .ja-hover-glow{ transition:box-shadow .18s ease, background .18s ease, transform .18s ease; }
        .ja-hover-glow:hover{
          box-shadow:0 18px 48px -28px color-mix(in oklab, var(--color-primary) 65%, transparent),
                     0 0 0 1px color-mix(in oklab, var(--color-primary) 18%, transparent) inset;
        }
        /* table wrapper */
        .table-wrap{ background:var(--color-surface); border-radius:16px; }
      `}</style>

      {/* ---------- HERO (SANS contour dégradé, pas d’overlay sombre) ---------- */}
      <section className="relative rounded-2xl overflow-hidden border border-border mb-6 shadow-sm">
        {/* Images light/dark */}
        <img
          src={HERO_IMG}
          alt=""
          className="block dark:hidden w-full h-[180px] sm:h-[200px] object-cover"
        />
        <img
          src={HERO_IMG_DARK}
          alt=""
          className="hidden dark:block w-full h-[180px] sm:h-[200px] object-cover"
        />

        {/* Texte (même échelle que ton screenshot) */}
        <div className="absolute left-5 top-5 sm:left-9 sm:top-6">
          <h1 className="text-[44px] sm:text-[48px] font-semibold tracking-tight drop-shadow">
            <span className="text-sky-500">Job</span>{" "}
            <span className="bg-gradient-to-r from-violet-500 to-rose-400 bg-clip-text text-transparent">
              Alert
            </span>
          </h1>
          <p className="mt-1 text-[18px] text-white/95 font-semibold drop-shadow">finito le chomage</p>
          <p className="mt-1 text-[16px] text-white/95 font-semibold drop-shadow">
            Dernière mise à jour : {lastUpdatedTimestamp}
          </p>
        </div>
      </section>

      {/* ---------- SEARCH (contour dégradé + glow au hover) ---------- */}
      <section className="ja-gradient-border ja-hover-glow p-3 sm:p-4 mb-6">
        <SearchBar />
      </section>

      {/* ---------- TABLE (contour dégradé + hover sur les lignes via JobTable) ---------- */}
      <section className="ja-gradient-border ja-hover-glow mb-6">
        <div className="p-2 sm:p-3 overflow-x-auto">
          <div className="flex items-center justify-between px-1 pb-2">
            <div className="text-xs text-muted-foreground">
              {total ? <>Affichage {from}–{to} sur {total}</> : null}
            </div>
            <RowsSelect />
          </div>
          <div data-offers-table>
            <JobTable jobs={jobs} />
          </div>
        </div>
      </section>

      {/* ---------- Pagination (effets dans le fichier Pagination.tsx) ---------- */}
      <div className="mt-6 flex justify-center">
        <Pagination currentPage={page} hasNextPage={hasNextPage} />
      </div>

      {/* Révélation progressive (client) */}
      <RevealOnScroll selector="[data-offers-table] tbody tr" />
    </main>
  );
}
