"use client";

import { useEffect, useMemo, useState } from "react";
import * as Alerts from "@/lib/alerts";
import AlertModal from "@/components/AlertModal";
import BankAvatar from "@/components/BankAvatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { Star, FileText, Pencil, Trash2, Plus, ChevronLeft, ChevronRight, Inbox, CheckCircle2, Bell, Zap, Archive } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
    <main className="relative min-h-screen w-full px-4 pt-28 pb-12 overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20 z-0">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/30 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-secondary/30 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="fixed inset-0 pointer-events-none z-0 bg-grid-finance opacity-30" />

      <div className="container mx-auto relative z-10">
        {/* Header */}
        <div className="mb-8 inbox-header-appear">
          <div className="relative">
            <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 via-purple-500/20 to-secondary/20 blur-2xl opacity-50" />
            <div className="relative flex items-center gap-4">
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 backdrop-blur-xl">
                <Inbox className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-purple-400 to-secondary bg-clip-text text-transparent animate-gradient">
                  INBOX SURVEILLANCE
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Système de monitoring • Alertes temps réel
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6 inbox-grid-appear">
          
          {/* SIDEBAR: Alertes */}
          <div className="flex flex-col gap-4 h-[calc(100vh-240px)]">
            <div className="relative backdrop-blur-xl bg-background/40 border border-border/50 rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold text-foreground font-mono tracking-wider">ALERTES</h2>
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold font-mono text-primary">
                    {alerts.length}
                  </span>
                </div>
                <button 
                  onClick={() => setCreateOpen(true)} 
                  className="group p-2 hover:bg-primary/10 rounded-lg text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-110 border border-transparent hover:border-primary/20"
                  title="Nouvelle alerte"
                >
                  <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {alerts.length === 0 ? (
                <div className="relative backdrop-blur-xl bg-background/40 border border-border/50 rounded-xl p-8 text-center">
                  <Archive className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground font-mono">Aucune alerte active</p>
                </div>
              ) : (
                alerts.map((alert, idx) => {
                  const isActive = alert.id === selectedId;
                  const unseenCount = jobs.filter(j => !alert.seenJobIds?.includes(j.id)).length;
                  
                  return (
                    <motion.button
                      key={alert.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05, duration: 0.3 }}
                      onClick={() => setSelectedId(alert.id)}
                      className={`w-full text-left group relative p-4 rounded-xl border backdrop-blur-xl transition-all duration-300 overflow-hidden ${
                        isActive 
                          ? "bg-primary/10 border-primary/50 shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)]" 
                          : "bg-background/40 border-border/50 hover:bg-background/60 hover:border-primary/30 hover:scale-[1.02]"
                      }`}
                    >
                      {/* Scanline effect */}
                      {isActive && (
                        <div className="absolute top-0 left-0 w-full h-[2px] overflow-hidden">
                          <div className="absolute w-full h-full bg-gradient-to-r from-transparent via-primary to-transparent animate-scan opacity-60" />
                        </div>
                      )}

                      <div className="flex justify-between items-start mb-2 relative z-10">
                        <span className={`font-bold truncate pr-2 text-sm ${isActive ? "text-primary" : "text-foreground"}`}>
                          {alert.name}
                        </span>
                        {unseenCount > 0 && isActive && (
                          <div className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-bold font-mono text-emerald-400">
                            {unseenCount}
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground truncate flex items-center gap-2 mb-3 relative z-10">
                        <Zap className="w-3 h-3 text-primary/60" />
                        {alert.query.keywords?.length ? alert.query.keywords[0] : "Toutes les offres"}
                      </div>

                      {/* Actions au survol */}
                      <div className="absolute right-2 bottom-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditOpen(true); }} 
                          className="p-1.5 hover:bg-primary/10 rounded-lg text-muted-foreground hover:text-primary transition-all border border-transparent hover:border-primary/20"
                          title="Modifier"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => removeAlert(alert.id, e)} 
                          className="p-1.5 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-400 transition-all border border-transparent hover:border-red-500/20"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Active indicator */}
                      {isActive && (
                        <div className="absolute top-1/2 -translate-y-1/2 left-0 w-1 h-8 bg-gradient-to-b from-primary to-secondary rounded-r-full shadow-[0_0_10px_rgba(var(--primary-rgb),0.6)]" />
                      )}
                    </motion.button>
                  );
                })
              )}
            </div>
          </div>

          {/* MAIN PANEL: Job Feed */}
          <div className="flex flex-col h-[calc(100vh-240px)] rounded-2xl border border-border/50 bg-background/40 backdrop-blur-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.3)] hover:shadow-[0_0_80px_rgba(var(--primary-rgb),0.2)] transition-all duration-500 group/panel">
            
            {/* Scanline top */}
            <div className="absolute top-0 left-0 w-full h-[2px] overflow-hidden">
              <div className="absolute w-full h-full bg-gradient-to-r from-transparent via-secondary to-transparent animate-scan opacity-50" />
            </div>

            {/* Header Feed */}
            <div className="h-16 border-b border-border/50 flex items-center justify-between px-6 bg-gradient-to-r from-background/80 to-background/60 backdrop-blur-xl">
              <div>
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  {selected ? (
                    <>
                      <Bell className="w-4 h-4 text-primary" />
                      {selected.name}
                    </>
                  ) : (
                    "Sélectionnez une alerte"
                  )}
                </h3>
                {selected && (
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    {enriched.length} résultats • Page {page}/{totalPages}
                  </p>
                )}
              </div>
              {selected && (
                <button 
                  onClick={markAllReadForSelected}
                  className="group/btn flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40 text-emerald-600 dark:text-emerald-400 transition-all duration-300 hover:scale-105"
                >
                  <CheckCircle2 className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" />
                  <span className="text-xs font-bold font-mono">TOUT LU</span>
                </button>
              )}
            </div>

            {/* Job List Table */}
            <div className="flex-1 overflow-auto custom-scrollbar">
              {!selected ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <div className="p-6 rounded-full bg-primary/5 border border-primary/10 mb-4">
                    <Inbox className="w-16 h-16 text-primary/30" />
                  </div>
                  <p className="text-lg font-semibold">Sélectionnez une alerte</p>
                  <p className="text-sm mt-1 font-mono">pour voir les offres surveillées</p>
                </div>
              ) : paginated.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <div className="p-6 rounded-full bg-muted/20 border border-border mb-4">
                    <Archive className="w-16 h-16 text-muted-foreground/30" />
                  </div>
                  <p className="text-lg font-semibold">Aucune offre trouvée</p>
                  <p className="text-sm mt-1 font-mono">Ajustez vos critères de surveillance</p>
                </div>
              ) : (
                <Table className="border-none w-full">
                  <TableHeader className="bg-gradient-to-b from-background/60 to-background/40 sticky top-0 z-10 backdrop-blur-xl border-b border-border/30">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="w-[45%] pl-6 text-[10px] font-bold font-mono tracking-[0.15em] uppercase text-muted-foreground/70">Poste</TableHead>
                      <TableHead className="w-[20%] text-[10px] font-bold font-mono tracking-[0.15em] uppercase text-muted-foreground/70">Institution</TableHead>
                      <TableHead className="w-[20%] text-[10px] font-bold font-mono tracking-[0.15em] uppercase text-muted-foreground/70">Lieu</TableHead>
                      <TableHead className="w-[15%] text-right pr-6 text-[10px] font-bold font-mono tracking-[0.15em] uppercase text-muted-foreground/70">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/20">
                    {paginated.map(({ job, bankId, dotStyle, isSeen, st }, i) => (
                      <motion.tr
                        key={job.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02, duration: 0.2 }}
                        className={`
                          group/row border-b border-border/20 last:border-0 hover:bg-gradient-to-r hover:from-primary/5 hover:via-transparent hover:to-secondary/5 transition-all duration-300
                          ${!isSeen ? "bg-primary/5" : ""}
                        `}
                      >
                        <TableCell className="py-4 pl-6 align-top w-[45%]">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-start gap-2">
                              {!isSeen && (
                                <div className="mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0 shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)]" />
                              )}
                              <Link 
                                href={job.link} 
                                target="_blank" 
                                onClick={() => Alerts.markJobSeen(selected.id, job.id)} 
                                className={`text-sm font-semibold hover:text-primary transition-colors line-clamp-2 hover:underline underline-offset-2 ${!isSeen ? "text-foreground" : "text-muted-foreground"}`}
                              >
                                {job.title}
                              </Link>
                            </div>
                            {/* Actions rapides */}
                            <div className="flex gap-2 pl-4 opacity-0 group-hover/row:opacity-100 transition-all duration-300">
                              <button 
                                onClick={() => toggleFavorite(job)} 
                                className={`p-1.5 rounded-lg hover:bg-background/60 transition-all duration-200 border ${st==="shortlist"?"text-yellow-500 bg-yellow-500/10 border-yellow-500/20":"text-muted-foreground border-transparent hover:border-border"}`}
                                title={st==="shortlist" ? "Retirer des favoris" : "Ajouter aux favoris"}
                              >
                                <Star className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => toggleApplied(job)} 
                                className={`p-1.5 rounded-lg hover:bg-background/60 transition-all duration-200 border ${st==="applied"?"text-purple-500 bg-purple-500/10 border-purple-500/20":"text-muted-foreground border-transparent hover:border-border"}`}
                                title={st==="applied" ? "Candidature envoyée" : "Marquer comme postulé"}
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 align-top w-[20%]">
                          <div className="flex items-center gap-2">
                            <BankAvatar 
                              bankId={bankId} 
                              name={job.company} 
                              size={24} 
                              className="rounded-lg ring-1 ring-border/50 group-hover/row:ring-primary/50 group-hover/row:scale-110 transition-all duration-300" 
                            />
                            <span className="text-xs text-muted-foreground group-hover/row:text-foreground transition-colors truncate max-w-[140px]">
                              {job.company || "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 align-top text-xs text-muted-foreground group-hover/row:text-foreground transition-colors truncate max-w-[160px] w-[20%]">
                          {job.location}
                        </TableCell>
                        <TableCell className="py-4 align-top text-right pr-6 text-xs text-muted-foreground group-hover/row:text-foreground font-mono transition-colors w-[15%]">
                          {formatPostedFR(job.posted)}
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Footer Pagination */}
            {selected && enriched.length > PAGE_SIZE && (
              <div className="h-14 border-t border-border/50 flex items-center justify-between px-6 bg-gradient-to-r from-background/80 to-background/60 backdrop-blur-xl">
                <span className="text-xs text-muted-foreground font-mono">
                  Affichage <span className="text-foreground font-bold">{(page-1)*PAGE_SIZE + 1}-{Math.min(page*PAGE_SIZE, enriched.length)}</span> sur <span className="text-foreground font-bold">{enriched.length}</span>
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    disabled={page<=1} 
                    onClick={()=>setPage(p=>p-1)} 
                    className="p-2 hover:bg-primary/10 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-all duration-200 text-muted-foreground hover:text-primary border border-transparent hover:border-primary/20"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 text-xs font-bold font-mono text-primary min-w-[60px] text-center">
                    {page} / {totalPages}
                  </div>
                  <button 
                    disabled={page>=totalPages} 
                    onClick={()=>setPage(p=>p+1)} 
                    className="p-2 hover:bg-primary/10 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-all duration-200 text-muted-foreground hover:text-primary border border-transparent hover:border-primary/20"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Corner accent */}
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-secondary/10 via-transparent to-transparent rounded-tl-full opacity-0 group-hover/panel:opacity-100 transition-opacity duration-700 pointer-events-none" />
          </div>
        </div>
      </div>
      
      <AlertModal open={createOpen} onClose={() => { setCreateOpen(false); setAlerts(Alerts.getAll()); }} />
      {selected && <AlertModal open={editOpen} onClose={() => { setEditOpen(false); setAlerts(Alerts.getAll()); }} defaultValues={selected.query} editAlert={selected} />}
    </main>
  );
}