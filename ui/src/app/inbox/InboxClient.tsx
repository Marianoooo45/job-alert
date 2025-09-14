// ui/src/app/inbox/InboxClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import * as Alerts from "@/lib/alerts";
import AlertModal from "@/components/AlertModal";
import BankAvatar from "@/components/BankAvatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { Star, FileText, Pencil, Trash2, Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

import {
  setStatus, getAll as trackerGetAll, clearJob, type AppStatus,
} from "@/lib/tracker";
import { BANKS_LIST, BANK_CONFIG } from "@/config/banks";
import { format, formatDistanceToNowStrict, isValid, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

/* ---------------- Types ---------------- */
type Job = {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  link: string;
  posted: string;
  source: string;
};

/* --------------- Helpers --------------- */
function qsFromAlert(a: Alerts.Alert) {
  const p = new URLSearchParams();
  if (a.query.keywords?.length) p.set("keyword", a.query.keywords.join(" "));
  (a.query.banks ?? []).forEach((b) => p.append("bank", b));
  (a.query.categories ?? []).forEach((c) => p.append("category", c));
  (a.query.contractTypes ?? []).forEach((ct) => p.append("contractType", ct));
  p.set("limit", "200");
  p.set("offset", "0");
  return p;
}
function resolveBankId(job: Job): string | undefined {
  if (job.source) {
    const hit = BANKS_LIST.find((b) => b.id.toLowerCase() === job.source.toLowerCase());
    if (hit) return hit.id;
  }
  const norm = (s?: string | null) =>
    (s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const company = norm(job.company);
  if (!company) return undefined;
  for (const b of BANKS_LIST) {
    const bn = norm(b.name);
    if (bn === company || company.includes(bn)) return b.id;
  }
  return undefined;
}
function bankDotStyle(bankId?: string): React.CSSProperties | undefined {
  if (!bankId) return undefined;
  const cfg = (BANK_CONFIG as any)[bankId];
  if (!cfg) return undefined;
  if (cfg.color) return { background: cfg.color };
  if (cfg.gradient)
    return { backgroundImage: `linear-gradient(135deg, ${cfg.gradient[0]}, ${cfg.gradient[1]})` };
  return undefined;
}
function formatPostedFR(value?: string) {
  if (!value) return "-";
  let date: Date | null = null;
  try {
    const d = parseISO(value);
    if (isValid(d)) date = d;
  } catch {}
  if (!date) {
    const d2 = new Date(value);
    if (isValid(d2)) date = d2;
  }
  if (!date) return value;
  const diffDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 7) return `il y a ${formatDistanceToNowStrict(date, { locale: fr })}`;
  return format(date, "dd MMMM yyyy", { locale: fr });
}

/* --------- statusMap helpers --------- */
const STORAGE_KEY = "ja:applications";
function buildStatusMap(): Record<string, AppStatus | undefined> {
  const map: Record<string, AppStatus | undefined> = {};
  for (const it of trackerGetAll()) map[it.id] = it.status;
  return map;
}

/* ======= AURORA — même que sur la Home (light only) ======= */
function AuroraBackdrop() {
  return (
    <>
      <div className="aurora-dyn" aria-hidden="true" />
      <style>{`
        /* ----- Light only ----- */
        html.dark .aurora-dyn { display: none; }

        html:not(.dark) .aurora-dyn {
          position: fixed;
          inset: 0;
          z-index: -1;            /* sous le contenu */
          pointer-events: none;
          overflow: hidden;
          background: transparent;
        }

        /* ===== LAYER 1: base halos (coins + centre) ===== */
        html:not(.dark) .aurora-dyn::before {
          content: "";
          position: absolute; inset: -10% -10% -10% -10%;
          will-change: transform, filter, opacity, background-position;
          background:
            /* halo central rose */
            radial-gradient(1100px 720px at 50% 68%, rgba(244,114,182,.22), transparent 65%),
            /* bleu clair horizontal + coins boostés */
            radial-gradient(1400px 900px at 50% 52%, rgba(59,130,246,.22), transparent 75%),
            radial-gradient(900px 900px at 0% 0%, rgba(59,130,246,.38), transparent 70%),
            radial-gradient(900px 900px at 100% 0%, rgba(59,130,246,.36), transparent 70%),
            radial-gradient(900px 900px at 0% 100%, rgba(34,211,238,.38), transparent 70%),
            radial-gradient(900px 900px at 100% 100%, rgba(34,211,238,.36), transparent 70%),
            /* rose haut + violet bas */
            radial-gradient(1200px 760px at 50% -10%, rgba(236,72,153,.16), transparent 65%),
            radial-gradient(1200px 760px at 50% 110%, rgba(99,102,241,.16), transparent 65%);
          background-repeat: no-repeat;
          background-attachment: fixed;
          background-blend-mode: screen;
          opacity: .95;
          filter: saturate(1.25) brightness(1.05);
          animation: auroraDrift 14s ease-in-out infinite alternate,
                     auroraPulse 6s ease-in-out infinite;
        }

        /* ===== LAYER 2: filets coniques qui glissent ===== */
        html:not(.dark) .aurora-dyn::after {
          content: "";
          position: absolute; inset: -15% -15% -15% -15%;
          will-change: transform, filter, opacity, background-position;
          background:
            conic-gradient(from 210deg at 30% 40%, rgba(56,189,248,.14), rgba(216,180,254,.10), transparent 60%),
            conic-gradient(from 60deg at 70% 60%, rgba(147,197,253,.12), rgba(244,114,182,.10), transparent 62%),
            conic-gradient(from 130deg at 50% 20%, rgba(59,130,246,.12), transparent 55%);
          mix-blend-mode: screen;
          animation: auroraSweep 10s ease-in-out infinite alternate,
                     auroraTilt 16s ease-in-out infinite;
        }

        @supports (backdrop-filter: blur(1px)) {
          html:not(.dark) .aurora-dyn { backdrop-filter: none; }
        }

        /* ---- Animations ---- */
        @keyframes auroraDrift {
          50% {
            background-position:
              52% 70%,
              50% 54%, 0% 2%, 98% 0%, 2% 98%, 98% 98%,
              50% -6%, 50% 106%;
            filter: hue-rotate(12deg) saturate(1.22) brightness(1.08);
            transform: translateY(-1.2%) scale(1.015);
          }
        }
        @keyframes auroraPulse {
          0%, 100% { opacity: .92; transform: scale(1); }
          50%      { opacity: .99; transform: scale(1.02); }
        }
        @keyframes auroraSweep {
          0%   { background-position: 0% 0%, 100% 100%, 50% 0%; opacity:.55; }
          50%  { background-position: 20% 10%, 80% 85%, 46% 8%; opacity:.72; }
          100% { background-position: 0% 0%, 100% 100%, 50% 0%; opacity:.60; }
        }
        @keyframes auroraTilt {
          0%   { transform: rotate(-0.8deg) translateY(0%); }
          50%  { transform: rotate(0.9deg)  translateY(-1.2%); }
          100% { transform: rotate(-0.8deg) translateY(0%); }
        }

        /* Accessibilité */
        @media (prefers-reduced-motion: reduce) {
          html:not(.dark) .aurora-dyn::before,
          html:not(.dark) .aurora-dyn::after {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>
    </>
  );
}

/* ---------------- Page (Client) ---------------- */
export default function InboxClient() {
  const [alerts, setAlerts] = useState<Alerts.Alert[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [statusMap, setStatusMap] = useState<Record<string, AppStatus | undefined>>({});
  const [q, setQ] = useState("");

  // pagination
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);

  const selected = useMemo(
    () => alerts.find((a) => a.id === selectedId) ?? null,
    [alerts, selectedId]
  );

  /* hydrate alertes + états tracker */
  useEffect(() => {
    const all = Alerts.getAll();
    setAlerts(all);
    if (!selectedId && all.length) setSelectedId(all[0].id);
    setStatusMap((prev) => ({ ...prev, ...buildStatusMap() }));
  }, []);

  /* synchro en temps réel des écritures tracker */
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setStatusMap((prev) => ({ ...prev, ...buildStatusMap() }));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /* écouter les changements (cloche/modale) */
  useEffect(() => {
    const off = Alerts.onChange(() => setAlerts(Alerts.getAll()));
    return off;
  }, []);

  /* charger les jobs correspondant à l’alerte sélectionnée */
  useEffect(() => {
    (async () => {
      if (!selected) {
        setJobs([]);
        return;
      }
      const res = await fetch(`/api/jobs?${qsFromAlert(selected).toString()}`, { cache: "no-store" });
      const arr = res.ok ? ((await res.json()) as Job[]) : [];
      setJobs(arr);
      setStatusMap((prev) => ({ ...prev, ...buildStatusMap() }));
    })();
  }, [selectedId, alerts.length]);

  useEffect(() => setPage(1), [selectedId, jobs.length]);

  /* --------- actions alertes --------- */
  const removeAlert = (id: string) => {
    Alerts.remove(id);
    const all = Alerts.getAll();
    setAlerts(all);
    if (selectedId === id) {
      setSelectedId(all[0]?.id ?? null);
      setJobs([]);
    }
  };
  const markAllReadForSelected = () => {
    if (!selected) return;
    Alerts.markJobsSeen(
      selected.id,
      jobs.map((j) => j.id)
    );
    setAlerts(Alerts.getAll());
  };

  /* --------- actions tracker --------- */
  function upsertStatus(job: Job, status: AppStatus) {
    setStatus(
      { id: job.id, title: job.title, company: job.company, location: job.location, link: job.link, posted: job.posted, source: job.source },
      status
    );
    setStatusMap((s) => ({ ...s, [job.id]: status }));
  }
  function toggleFavorite(job: Job) {
    const current = statusMap[job.id];
    if (current === "shortlist") {
      clearJob(job.id);
      setStatusMap((s) => {
        const next = { ...s };
        delete next[job.id];
        return next;
      });
    } else upsertStatus(job, "shortlist");
  }
  function toggleApplied(job: Job) {
    const current = statusMap[job.id];
    if (current === "applied") {
      clearJob(job.id);
      setStatusMap((s) => {
        const next = { ...s };
        delete next[job.id];
        return next;
      });
    } else upsertStatus(job, "applied");
  }

  /* --------- enrichissement pour la table --------- */
  const enriched = useMemo(
    () =>
      jobs.map((job) => {
        const bankId = resolveBankId(job);
        const dotStyle = bankDotStyle(bankId);
        const isSeen = !!selected?.seenJobIds?.includes(job.id);
        const st = statusMap[job.id];
        return { job, bankId, dotStyle, isSeen, st };
      }),
    [jobs, selected?.seenJobIds, statusMap]
  );

  // pagination sur la liste enrichie
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(enriched.length / PAGE_SIZE)),
    [enriched.length]
  );
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return enriched.slice(start, start + PAGE_SIZE);
  }, [enriched, page]);
  const from = useMemo(
    () => (enriched.length ? (page - 1) * PAGE_SIZE + 1 : 0),
    [page, enriched.length]
  );
  const to = useMemo(
    () => Math.min(page * PAGE_SIZE, enriched.length),
    [page, enriched.length]
  );

  const filteredAlerts = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return alerts;
    return alerts.filter((a) => {
      const kws = Alerts.normalizeKeywords(a.query.keywords)?.join(" ") ?? "";
      const hay = `${a.name} ${kws} ${(a.query.banks ?? []).join(" ")} ${(a.query.categories ?? []).join(" ")}`.toLowerCase();
      return hay.includes(term);
    });
  }, [alerts, q]);

  /* ---------------- Render ---------------- */
  const COLW = {
    title: "w-[48%] min-w-[380px]",
    bank: "w-[18%] min-w-[180px]",
    loc: "w-[20%] min-w-[160px]",
    date: "w-[14%] min-w-[140px]",
  };

  return (
    <>
      {/* Fond identique à Home */}
      <AuroraBackdrop />

      <main className="relative z-[1] container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold tracking-tight neon-title mb-6">Inbox</h1>

        <div className="space-y-6">
          {/* ====== Bandeau alertes (top) ====== */}
          <section className="panel panel--gradient">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
              <div className="text-xl font-bold bg-clip-text text-transparent bg-[linear-gradient(90deg,var(--color-accent),var(--color-primary))]">
                Mes alertes
              </div>

              <div className="relative ml-auto">
                <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 opacity-60" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Rechercher…"
                  className="pl-8 pr-2 h-9 w-[200px] rounded-lg bg-card border border-border text-sm"
                />
              </div>

              <button onClick={() => setCreateOpen(true)} className="h-9 px-3 rounded-full btn">
                <Plus className="w-4 h-4" /> Créer
              </button>
            </div>

            {/* pills scrollables */}
            <div className="px-3 py-2 overflow-x-auto no-scrollbar">
              <ul className="flex items-stretch gap-2 min-h-[44px]">
                {filteredAlerts.map((a) => {
                  const active = a.id === selectedId;
                  return (
                    <li key={a.id}>
                      <button
                        onClick={() => setSelectedId(a.id)}
                        className={"alert-bubble " + (active ? "is-active" : "")}
                        title={a.name}
                      >
                        <span className="truncate">{a.name}</span>

                        {/* actions on hover */}
                        <span
                          className="bubble-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(a.id);
                            setEditOpen(true);
                          }}
                          aria-label="Modifier"
                          title="Modifier"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </span>
                        <span
                          className="bubble-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeAlert(a.id);
                          }}
                          aria-label="Supprimer"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </span>
                      </button>
                    </li>
                  );
                })}
                {filteredAlerts.length === 0 && (
                  <li className="px-2 py-3 text-sm text-muted-foreground">Aucune alerte.</li>
                )}
              </ul>
            </div>
          </section>

          {/* ====== Tableau offres (full width) ====== */}
          <section className="panel panel--gradient overflow-hidden">
            <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Résultats</div>
                <div className="text-lg font-semibold">{selected?.name ?? "—"}</div>
                {selected && enriched.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Affichage {from}–{to} sur {enriched.length}
                  </div>
                )}
              </div>
              {selected && (
                <div className="flex items-center gap-3">
                  {enriched.length > PAGE_SIZE && (
                    <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                  )}
                  <button
                    onClick={markAllReadForSelected}
                    className="h-9 px-3 rounded-full border border-border hover:border-primary"
                  >
                    Marquer tout lu
                  </button>
                </div>
              )}
            </div>

            <div className="p-4">
              {!selected ? (
                <div className="text-muted-foreground">Sélectionne une alerte ci-dessus.</div>
              ) : paginated.length === 0 ? (
                <div className="text-muted-foreground">Aucune offre pour le moment.</div>
              ) : (
                <Table className="table-default">
                  {/* Header sticky + tailles fixes */}
                  <TableHeader className="sticky top-0 z-30 backdrop-blur bg-surface/90">
                    <TableRow>
                      <TableHead className={COLW.title}>Poste</TableHead>
                      <TableHead className={COLW.bank}>Banque</TableHead>
                      <TableHead className={COLW.loc}>Lieu</TableHead>
                      <TableHead className={COLW.date}>Date</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {paginated.map(({ job, bankId, dotStyle, isSeen, st }, idx) => {
                      const isFav = st === "shortlist";
                      const isApplied = st === "applied";
                      return (
                        <motion.tr
                          key={job.id}
                          className="group border-t border-border/60
                                     hover:bg-[color-mix(in_oklab,var(--color-primary)_6%,transparent)]
                                     hover:shadow-[var(--glow-weak)] hover:ring-1 hover:ring-primary/20
                                     transition-all duration-100"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(idx * 0.015, 0.25), duration: 0.28, ease: "easeOut" }}
                          whileHover={{ scale: 1.005, x: 2 }}
                          whileTap={{ scale: 1.04 }}
                        >
                          {/* Poste + actions */}
                          <TableCell className={`${COLW.title} align-top`}>
                            <div className="flex items-center gap-2 w-full">
                              <Link
                                href={job.link}
                                target="_blank"
                                className="font-medium text-cyan-400 hover:underline truncate max-w-[520px]"
                                title={job.title}
                                onClick={() => { if (selected) Alerts.markJobSeen(selected.id, job.id); }}
                              >
                                {job.title}
                              </Link>
                              {!isSeen && (
                                <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-primary/10 border border-primary/40">
                                  Nouveau
                                </span>
                              )}
                              <div className="flex items-center gap-1.5 ml-1 shrink-0">
                                <button
                                  title={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
                                  aria-label="Favori"
                                  onClick={() => toggleFavorite(job)}
                                  className={`icon-btn icon-toggle ${isFav ? "is-on" : ""}`}
                                >
                                  <Star className={`w-4 h-4 ${isFav ? "fill-current" : ""}`} />
                                </button>
                                <button
                                  title={isApplied ? "Retirer des candidatures" : "Ajouter aux candidatures"}
                                  aria-label="Postuler"
                                  onClick={() => toggleApplied(job)}
                                  className={`icon-btn icon-toggle ${isApplied ? "is-on" : ""}`}
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </TableCell>

                          {/* Banque */}
                          <TableCell className={`${COLW.bank} align-top`}>
                            <div className="flex items-center gap-2 truncate">
                              <BankAvatar bankId={bankId} name={job.company ?? undefined} size={28} className="shadow-sm shrink-0" />
                              <span className="inline-flex items-center gap-2 truncate">
                                <span className="leading-none truncate max-w-[160px]" title={job.company ?? "-"}>
                                  {job.company ?? "-"}
                                </span>
                                <span className="inline-block h-2 w-2 rounded-full bank-dot shrink-0" style={dotStyle} title={bankId ?? ""} />
                              </span>
                            </div>
                          </TableCell>

                          {/* Lieu */}
                          <TableCell className={`${COLW.loc} align-top`}>
                            <span className="truncate block max-w-[260px]" title={job.location ?? "-"}>{job.location ?? "-"}</span>
                          </TableCell>

                          {/* Date */}
                          <TableCell className={`${COLW.date} align-top text-sm text-muted-foreground`}>
                            {formatPostedFR(job.posted)}
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Pagination bas */}
            {selected && enriched.length > PAGE_SIZE && (
              <div className="px-4 pb-4 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">Page {page} / {totalPages}</div>
                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Modales */}
      <AlertModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          const all = Alerts.getAll();
          setAlerts(all);
          if (!selectedId && all.length) setSelectedId(all[0].id);
        }}
      />
      {selected && (
        <AlertModal
          open={editOpen}
          onClose={() => {
            setEditOpen(false);
            const all = Alerts.getAll();
            setAlerts(all);
          }}
          defaultValues={selected.query}
          // @ts-expect-error: prop custom pour édition
          editAlert={selected}
        />
      )}

      {/* Styles globaux (inchangés) */}
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        .panel {
          border-radius: 18px;
          border: 1px solid transparent;
          background: var(--color-surface);
          box-shadow: 0 30px 120px -40px rgba(187,154,247,.18);
          position: relative;
        }
        .panel--gradient::before{
          content:""; position:absolute; inset:0; border-radius:inherit; padding:1px;
          background: linear-gradient(135deg, var(--color-accent), var(--color-primary), var(--destructive));
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
          pointer-events:none; opacity:.95;
        }

        .alert-bubble{
          height: 40px;
          max-width: 260px;
          padding: 0 8px 0 12px;
          display: inline-flex; align-items: center; gap: 8px;
          border-radius: 9999px;
          border: 1px solid var(--color-border);
          background: color-mix(in oklab, var(--color-primary) 8%, var(--color-surface));
          transition: transform .16s ease, background .16s ease, border-color .16s ease, box-shadow .16s ease;
        }
        .alert-bubble:hover{
          transform: translateY(-1px);
          border-color: color-mix(in oklab, var(--color-primary) 45%, var(--color-border));
          box-shadow: 0 10px 28px -18px color-mix(in oklab, var(--color-primary) 45%, transparent);
          background: color-mix(in oklab, var(--color-primary) 14%, var(--color-surface));
        }
        .alert-bubble.is-active{
          background: linear-gradient(180deg,
            color-mix(in oklab, var(--color-primary) 24%, var(--color-surface)),
            color-mix(in oklab, var(--color-accent) 10%, transparent));
          border-color: color-mix(in oklab, var(--color-primary) 60%, var(--color-border));
          box-shadow: 0 12px 30px -18px color-mix(in oklab, var(--color-primary) 55%, transparent);
        }
        .alert-bubble .bubble-action{
          display:grid; place-items:center; height:24px; width:24px;
          border-radius: 8px; border: 1px solid var(--color-border);
          background: var(--color-card); opacity: 0; margin-left: 2px;
          transition: opacity .15s ease, border-color .15s ease, background .15s;
        }
        .alert-bubble:hover .bubble-action, .alert-bubble.is-active .bubble-action { opacity: 1; }
        .alert-bubble .bubble-action:hover{
          border-color: color-mix(in oklab, var(--color-primary) 45%, var(--color-border));
          background: color-mix(in oklab, var(--color-primary) 10%, var(--color-card));
        }

        .icon-btn{
          display:inline-grid; place-items:center;
          height:28px; width:28px; border-radius:8px;
          border:1px solid var(--color-border); background: var(--color-surface);
          transition: transform .12s ease, background .12s ease, border-color .12s ease, box-shadow .12s ease;
        }
        .icon-btn:hover{ transform: translateY(-1px); border-color: color-mix(in oklab, var(--color-primary) 40%, var(--color-border)); }
        .icon-toggle.is-on{
          border-color: color-mix(in oklab, var(--destructive) 70%, var(--color-border));
          background: color-mix(in oklab, var(--destructive) 82%, transparent);
          color: var(--background);
          box-shadow: 0 12px 30px -18px color-mix(in oklab, var(--destructive) 60%, transparent);
        }

        .pager { display:inline-flex; gap:6px; align-items:center; }
        .pager-btn{
          height:34px; min-width:34px; padding:0 10px;
          border-radius:9999px; border:1px solid var(--color-border);
          background: var(--color-card);
          transition: transform .12s ease, background .12s ease, border-color .12s;
        }
        .pager-btn:hover{
          transform: translateY(-1px);
          background: color-mix(in oklab, var(--color-primary) 10%, var(--color-card));
          border-color: color-mix(in oklab, var(--color-primary) 50%, var(--color-border));
        }
        .pager-btn.is-active{
          color: var(--background);
          background: linear-gradient(90deg, var(--color-accent), var(--color-primary));
          border-color: transparent;
          box-shadow: 0 12px 30px -18px color-mix(in oklab, var(--color-primary) 55%, transparent);
        }
      `}</style>
    </>
  );
}

/* ---------- UI bits ---------- */
function Pagination({
  page, totalPages, onChange,
}: { page: number; totalPages: number; onChange: (p: number) => void }) {
  const canPrev = page > 1;
  const canNext = page < totalPages;
  const go = (p: number) => onChange(Math.max(1, Math.min(totalPages, p)));

  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <nav className="pager">
      <button className="pager-btn" disabled={!canPrev} onClick={() => go(page - 1)} title="Précédent">
        <ChevronLeft className="w-4 h-4" />
      </button>
      {start > 1 && (
        <>
          <button className="pager-btn" onClick={() => go(1)}>1</button>
          {start > 2 && <span className="px-1 text-sm">…</span>}
        </>
      )}
      {pages.map((p) => (
        <button
          key={p}
          className={`pager-btn ${p === page ? "is-active" : ""}`}
          onClick={() => go(p)}
        >
          {p}
        </button>
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="px-1 text-sm">…</span>}
          <button className="pager-btn" onClick={() => go(totalPages)}>{totalPages}</button>
        </>
      )}
      <button className="pager-btn" disabled={!canNext} onClick={() => go(page + 1)} title="Suivant">
        <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  );
}
