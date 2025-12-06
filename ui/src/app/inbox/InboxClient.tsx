"use client";

import { useEffect, useMemo, useState } from "react";
import * as Alerts from "@/lib/alerts";
import AlertModal from "@/components/AlertModal";
import BankAvatar from "@/components/BankAvatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { Star, FileText, Pencil, Trash2, Plus, ChevronLeft, ChevronRight, Inbox, CheckCircle2, Bell, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { setStatus, getAll as trackerGetAll, clearJob, type AppStatus } from "@/lib/tracker";
import { BANKS_LIST, BANK_CONFIG } from "@/config/banks";
import { format, formatDistanceToNowStrict, isValid, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

/* ---------------- Types & Helpers (Inchangés) ---------------- */
type Job = { id: string; title: string; company: string | null; location: string | null; link: string; posted: string; source: string; };

function qsFromAlert(a: Alerts.Alert) {
  const p = new URLSearchParams();
  if (a.query.keywords?.length) p.set("keyword", a.query.keywords.join(" "));
  (a.query.banks ?? []).forEach((b) => p.append("bank", b));
  (a.query.categories ?? []).forEach((c) => p.append("category", c));
  (a.query.contractTypes ?? []).forEach((ct) => p.append("contractType", ct));
  p.set("limit", "200"); p.set("offset", "0");
  return p;
}
function resolveBankId(job: Job): string | undefined {
  if (job.source) { const hit = BANKS_LIST.find((b) => b.id.toLowerCase() === job.source.toLowerCase()); if (hit) return hit.id; }
  const norm = (s?: string | null) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
  const company = norm(job.company); if (!company) return undefined;
  for (const b of BANKS_LIST) { const bn = norm(b.name); if (bn === company || company.includes(bn)) return b.id; }
  return undefined;
}
function bankDotStyle(bankId?: string): React.CSSProperties | undefined {
  if (!bankId) return undefined;
  const cfg = (BANK_CONFIG as any)[bankId];
  if (!cfg) return undefined;
  if (cfg.color) return { background: cfg.color, boxShadow: `0 0 8px ${cfg.color}40` };
  return undefined;
}
function formatPostedFR(value?: string) {
  if (!value) return "-";
  let date: Date | null = null;
  try { const d = parseISO(value); if (isValid(d)) date = d; } catch {}
  if (!date) { const d2 = new Date(value); if (isValid(d2)) date = d2; }
  if (!date) return value;
  const diffDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 7) return `${formatDistanceToNowStrict(date, { locale: fr })}`;
  return format(date, "dd MMM", { locale: fr });
}
const STORAGE_KEY = "ja:applications";
function buildStatusMap(): Record<string, AppStatus | undefined> {
  const map: Record<string, AppStatus | undefined> = {};
  for (const it of trackerGetAll()) map[it.id] = it.status;
  return map;
}

/* ---------------- Main Component ---------------- */
export default function InboxClient() {
  const [alerts, setAlerts] = useState<Alerts.Alert[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [statusMap, setStatusMap] = useState<Record<string, AppStatus | undefined>>({});
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const selected = useMemo(() => alerts.find((a) => a.id === selectedId) ?? null, [alerts, selectedId]);

  /* Init & Sync Logic */
  useEffect(() => {
    const all = Alerts.getAll(); setAlerts(all);
    if (!selectedId && all.length) setSelectedId(all[0].id);
    setStatusMap((prev) => ({ ...prev, ...buildStatusMap() }));
  }, []);
  
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) setStatusMap((prev) => ({ ...prev, ...buildStatusMap() })); };
    window.addEventListener("storage", onStorage); return () => window.removeEventListener("storage", onStorage);
  }, []);
  
  useEffect(() => { const off = Alerts.onChange(() => setAlerts(Alerts.getAll())); return off; }, []);

  useEffect(() => {
    (async () => {
      if (!selected) { setJobs([]); return; }
      const res = await fetch(`/api/jobs?${qsFromAlert(selected).toString()}`, { cache: "no-store" });
      const arr = res.ok ? ((await res.json()) as Job[]) : [];
      setJobs(arr);
      setStatusMap((prev) => ({ ...prev, ...buildStatusMap() }));
    })();
  }, [selectedId, alerts.length]);

  useEffect(() => setPage(1), [selectedId, jobs.length]);

  /* Actions */
  const removeAlert = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); Alerts.remove(id); setAlerts(Alerts.getAll());
    if (selectedId === id) { setSelectedId(null); setJobs([]); }
  };
  const markAllReadForSelected = () => {
    if (!selected) return;
    Alerts.markJobsSeen(selected.id, jobs.map((j) => j.id));
    setAlerts(Alerts.getAll());
  };
  function toggleFavorite(job: Job) {
    statusMap[job.id] === "shortlist" ? (clearJob(job.id), setStatusMap(s => ({ ...s, [job.id]: undefined }))) : (setStatus({ id: job.id, title: job.title, company: job.company, location: job.location, link: job.link, posted: job.posted, source: job.source } as any, "shortlist"), setStatusMap(s => ({ ...s, [job.id]: "shortlist" })));
  }
  function toggleApplied(job: Job) {
    statusMap[job.id] === "applied" ? (clearJob(job.id), setStatusMap(s => ({ ...s, [job.id]: undefined }))) : (setStatus({ id: job.id, title: job.title, company: job.company, location: job.location, link: job.link, posted: job.posted, source: job.source } as any, "applied"), setStatusMap(s => ({ ...s, [job.id]: "applied" })));
  }

  /* Data Processing */
  const enriched = useMemo(() => jobs.map((job) => {
    const bankId = resolveBankId(job);
    const isSeen = !!selected?.seenJobIds?.includes(job.id);
    return { job, bankId, dotStyle: bankDotStyle(bankId), isSeen, st: statusMap[job.id] };
  }), [jobs, selected?.seenJobIds, statusMap]);

  const totalPages = Math.max(1, Math.ceil(enriched.length / PAGE_SIZE));
  const paginated = enriched.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <main className="relative min-h-[calc(100vh-4rem)] container mx-auto px-4 pt-32 pb-8 sm:px-6 lg:px-8">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20 z-0">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/30 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-secondary/30 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>
      <div className="fixed inset-0 pointer-events-none z-0 bg-grid-finance opacity-30" />

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 h-[80vh] relative z-10">
        
        {/* SIDEBAR: Alertes */}
        <div className="flex flex-col gap-4 h-full">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Inbox className="w-5 h-5 text-primary" />
              Inbox
            </h2>
            <button onClick={() => setCreateOpen(true)} className="p-2 hover:bg-primary/10 rounded-lg text-muted-foreground hover:text-primary transition-all duration-300 border border-transparent hover:border-primary/20">
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
            {alerts.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">Aucune alerte active.</div>
            ) : (
              alerts.map((alert, idx) => {
                const isActive = alert.id === selectedId;
                return (
                  <motion.button
                    key={alert.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.3 }}
                    onClick={() => setSelectedId(alert.id)}
                    className={`w-full text-left group relative px-4 py-3 rounded-xl border transition-all duration-300 backdrop-blur-xl ${
                      isActive 
                        ? "bg-primary/10 border-primary/50 shadow-[0_0_20px_rgba(var(--primary-rgb),0.15)]" 
                        : "bg-background/40 border-border hover:bg-background/60 hover:border-primary/30"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`font-medium truncate pr-2 ${isActive ? "text-primary" : "text-foreground"}`}>
                        {alert.name}
                      </span>
                      {isActive && <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)]" />}
                    </div>
                    <div className="text-xs text-muted-foreground truncate flex items-center gap-2">
                      <Bell className="w-3 h-3" />
                      {alert.query.keywords?.length ? alert.query.keywords[0] : "Tout"}
                    </div>

                    {/* Actions au survol */}
                    <div className="absolute right-2 bottom-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); setEditOpen(true); }} className="p-1.5 hover:bg-primary/10 rounded text-muted-foreground hover:text-primary"><Pencil className="w-3 h-3" /></button>
                      <button onClick={(e) => removeAlert(alert.id, e)} className="p-1.5 hover:bg-red-500/20 rounded text-muted-foreground hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </motion.button>
                )
              })
            )}
          </div>
        </div>

        {/* MAIN PANEL: Job Feed */}
        <div className="flex flex-col h-full rounded-2xl border border-border/50 bg-background/40 backdrop-blur-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.3)] hover:shadow-[0_0_80px_rgba(var(--primary-rgb),0.2)] transition-all duration-500 relative group">
          
          {/* Scanline top */}
          <div className="absolute top-0 left-0 w-full h-[2px] overflow-hidden">
            <div className="absolute w-full h-full bg-gradient-to-r from-transparent via-primary to-transparent animate-scan opacity-50" />
          </div>

          {/* Header Feed */}
          <div className="h-16 border-b border-border/50 flex items-center justify-between px-6 bg-gradient-to-r from-background/80 to-background/60">
            <div>
              <h3 className="font-semibold text-foreground">{selected?.name ?? "Sélectionnez une alerte"}</h3>
              {selected && <p className="text-xs text-muted-foreground">{enriched.length} résultats</p>}
            </div>
            {selected && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={markAllReadForSelected}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-all duration-300 flex items-center gap-2 hover:scale-105"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Tout lu
                </button>
              </div>
            )}
          </div>

          {/* Job List Table */}
          <div className="flex-1 overflow-auto custom-scrollbar">
            {!selected ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <Inbox className="w-12 h-12 mb-4 opacity-20" />
                <p>Sélectionnez une alerte pour voir les offres.</p>
              </div>
            ) : paginated.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">Aucune offre trouvée.</div>
            ) : (
              <Table className="table-default border-none">
                <TableHeader className="bg-gradient-to-b from-background/60 to-background/40 sticky top-0 z-10 backdrop-blur-xl">
                  <TableRow className="border-b border-border/30 hover:bg-transparent">
                    <TableHead className="w-[45%] pl-6 text-[10px] font-bold font-mono tracking-[0.15em] uppercase text-muted-foreground/70">Poste</TableHead>
                    <TableHead className="w-[20%] text-[10px] font-bold font-mono tracking-[0.15em] uppercase text-muted-foreground/70">Banque</TableHead>
                    <TableHead className="w-[20%] text-[10px] font-bold font-mono tracking-[0.15em] uppercase text-muted-foreground/70">Lieu</TableHead>
                    <TableHead className="w-[15%] text-right pr-6 text-[10px] font-bold font-mono tracking-[0.15em] uppercase text-muted-foreground/70">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map(({ job, bankId, dotStyle, isSeen, st }, i) => (
                    <motion.tr
                      key={job.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className={`
                        group/row border-b border-border/20 last:border-0 hover:bg-gradient-to-r hover:from-primary/5 hover:via-transparent hover:to-secondary/5 transition-all duration-300
                        ${!isSeen ? "bg-primary/5" : ""}
                      `}
                    >
                      <TableCell className="py-3 pl-6 align-top">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-start gap-3">
                            {!isSeen && (
                              <div className="mt-1.5 shrink-0">
                                <div className="relative w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.9)]">
                                  <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-75" />
                                </div>
                              </div>
                            )}
                            <Link href={job.link} target="_blank" onClick={() => Alerts.markJobSeen(selected.id, job.id)} className={`text-sm font-medium hover:underline hover:text-primary line-clamp-2 transition-colors ${!isSeen ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                              {job.title}
                            </Link>
                          </div>
                          {/* Actions rapides */}
                          <div className="flex gap-2 pl-3.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
                            <button onClick={() => toggleFavorite(job)} className={`p-1 rounded hover:bg-background/60 transition-all ${st==="shortlist"?"text-yellow-400":"text-muted-foreground"}`}><Star className="w-3.5 h-3.5" /></button>
                            <button onClick={() => toggleApplied(job)} className={`p-1 rounded hover:bg-background/60 transition-all ${st==="applied"?"text-purple-400":"text-muted-foreground"}`}><FileText className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 align-top">
                        <div className="flex items-center gap-2">
                          <BankAvatar bankId={bankId} name={job.company} size={20} className="opacity-80 group-hover/row:opacity-100 transition-opacity" />
                          <span className="text-xs text-muted-foreground group-hover/row:text-foreground transition-colors truncate max-w-[120px]">{job.company || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 align-top text-xs text-muted-foreground group-hover/row:text-foreground transition-colors truncate max-w-[140px]">{job.location}</TableCell>
                      <TableCell className="py-3 align-top text-right pr-6 text-xs text-muted-foreground group-hover/row:text-foreground font-mono transition-colors">{formatPostedFR(job.posted)}</TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Footer Pagination */}
          {selected && enriched.length > PAGE_SIZE && (
            <div className="h-14 border-t border-border/50 flex items-center justify-between px-6 bg-gradient-to-r from-background/80 to-background/60">
              <span className="text-xs text-muted-foreground font-mono">Page {page} / {totalPages}</span>
              <div className="flex gap-1">
                <button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="p-2 hover:bg-primary/10 rounded disabled:opacity-30 text-muted-foreground hover:text-primary transition-all border border-transparent hover:border-primary/20"><ChevronLeft className="w-4 h-4" /></button>
                <button disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)} className="p-2 hover:bg-primary/10 rounded disabled:opacity-30 text-muted-foreground hover:text-primary transition-all border border-transparent hover:border-primary/20"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}

          {/* Corner accent */}
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-secondary/10 via-transparent to-transparent rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
        </div>
      </div>

      <AlertModal open={createOpen} onClose={() => { setCreateOpen(false); setAlerts(Alerts.getAll()); }} />
      {selected && <AlertModal open={editOpen} onClose={() => { setEditOpen(false); setAlerts(Alerts.getAll()); }} defaultValues={selected.query} editAlert={selected} />}
    </main>
  );
}