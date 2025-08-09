// ui/src/components/JobTable.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Job } from "@/lib/data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import BankAvatar from "@/components/BankAvatar";
import { setStatus, getAll, clearJob, type AppStatus, incInterviews } from "@/lib/tracker";
import { BANKS_LIST, BANK_CONFIG } from "@/config/banks";
import { format, formatDistanceToNowStrict, isValid, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Star, FileText, Plus, X } from "lucide-react";
import { motion } from "framer-motion";

/* ---------- Helpers ---------- */

function resolveBankId(job: Job): string | undefined {
  if (job.source) {
    const hit = BANKS_LIST.find((b) => b.id.toLowerCase() === job.source.toLowerCase());
    if (hit) return hit.id;
  }
  const norm = (s?: string) =>
    (s || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ").trim();

  const company = norm(job.company);
  if (!company) return undefined;

  for (const b of BANKS_LIST) {
    const bn = norm(b.name);
    if (bn === company || company.includes(bn)) return b.id;
  }
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

function bankDotStyle(bankId?: string): React.CSSProperties | undefined {
  if (!bankId) return undefined;
  const cfg = (BANK_CONFIG as any)[bankId];
  if (!cfg) return undefined;
  if (cfg.color) return { background: cfg.color };
  if (cfg.gradient) return { backgroundImage: `linear-gradient(135deg, ${cfg.gradient[0]}, ${cfg.gradient[1]})` };
  return undefined;
}

const needReminder = (status?: AppStatus, appliedAt?: number | string, respondedAt?: number | string) =>
  status === "applied" && appliedAt && !respondedAt && (Date.now() - Number(appliedAt) > 7 * 24 * 3600 * 1000);

/* ---------- Component ---------- */

interface JobTableProps { jobs: Job[]; }

type AddForm = {
  open: boolean;
  when: string;  // datetime-local
  note: string;
  location: string;
  url: string;
};

export default function JobTable({ jobs }: JobTableProps) {
  const [statusMap, setStatusMap] = useState<Record<string, AppStatus | undefined>>({});
  const [addFor, setAddFor] = useState<Record<string, AddForm>>({});

  useEffect(() => {
    const map: Record<string, AppStatus | undefined> = {};
    getAll().forEach((j) => (map[j.id] = j.status));
    setStatusMap(map);
  }, []);

  const enriched = useMemo(
    () =>
      jobs.map((job) => {
        const bankId = resolveBankId(job);
        const dotStyle = bankDotStyle(bankId);
        return { job, bankId, dotStyle };
      }),
    [jobs]
  );

  function upsert(job: Job, status: AppStatus) {
    setStatus(
      { id: job.id, title: job.title, company: job.company, location: job.location, link: job.link, posted: job.posted, source: job.source } as any,
      status
    );
    setStatusMap((s) => ({ ...s, [job.id]: status }));
  }

  function toggleFavorite(job: Job) {
    const current = statusMap[job.id];
    if (current === "shortlist") {
      clearJob(job.id);
      setStatusMap((s) => ({ ...s, [job.id]: undefined }));
    } else {
      upsert(job, "shortlist");
    }
  }

  function toggleApplied(job: Job) {
    const current = statusMap[job.id];
    if (current === "applied") {
      clearJob(job.id);
      setStatusMap((s) => ({ ...s, [job.id]: undefined }));
    } else {
      upsert(job, "applied");
    }
  }

  // helper pour datetime-local par défaut (demain 10:00)
  function defaultWhen(ts?: number) {
    const d = ts ? new Date(ts) : new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    if (!ts) d.setDate(d.getDate()); // aujourd'hui
    d.setHours(10, 0, 0, 0);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function openAdd(jobId: string) {
    setAddFor((m) => ({
      ...m,
      [jobId]: { open: true, when: defaultWhen(), note: "", location: "", url: "" },
    }));
  }

  function cancelAdd(jobId: string) {
    setAddFor((m) => ({ ...m, [jobId]: { ...(m[jobId] ?? { when: defaultWhen(), note: "", location: "", url: "" }), open: false } }));
  }

  function confirmAdd(job: Job) {
    const form = addFor[job.id];
    if (!form) return;
    const ts = new Date(form.when).getTime();
    incInterviews(job.id, +1, { ts, note: form.note, location: form.location, url: form.url });
    // force refresh du compteur sur la ligne
    setStatusMap((s) => ({ ...s }));
    cancelAdd(job.id);
  }

  return (
    <Table className="table-default">
      <TableHeader>
        <TableRow>
          <TableHead>Poste</TableHead>
          <TableHead>Banque</TableHead>
          <TableHead>Lieu</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {enriched.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground">
              Aucune offre trouvée.
            </TableCell>
          </TableRow>
        ) : (
          enriched.map(({ job, bankId, dotStyle }, idx) => {
            const st = statusMap[job.id];
            const isFav = st === "shortlist";
            const isApplied = st === "applied";
            const showReminder = needReminder(st, (job as any).appliedAt, (job as any).respondedAt);
            const form = addFor[job.id];

            return (
              <motion.tr
                key={job.id}
                className="border-t border-border/60 hover:bg-[color-mix(in_oklab,var(--color-primary)_7%,transparent)]"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.015, 0.25), duration: 0.28, ease: "easeOut" }}
              >
                <TableCell className="align-top">
                  <div className="flex items-center gap-2">
                    <Link href={job.link} target="_blank" className="font-medium text-cyan-400 hover:underline">
                      {job.title}
                    </Link>
                    <div className="flex items-center gap-1.5 ml-1">
                      <button
                        title={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
                        aria-label="Favori"
                        onClick={() => toggleFavorite(job)}
                        className={`inline-flex items-center justify-center p-1.5 rounded-md border transition-colors ${isFav ? "bg-secondary/85 border-secondary text-background" : "bg-surface border-border hover:border-secondary"}`}
                      >
                        <Star className={`w-4 h-4 ${isFav ? "fill-current" : ""}`} />
                      </button>
                      <button
                        title={isApplied ? "Retirer des candidatures" : "Ajouter aux candidatures"}
                        aria-label="Postuler"
                        onClick={() => toggleApplied(job)}
                        className={`inline-flex items-center justify-center p-1.5 rounded-md border transition-colors ${isApplied ? "bg-primary/85 border-primary text-background" : "bg-surface border-border hover:border-primary"}`}
                      >
                        <FileText className="w-4 h-4" />
                      </button>

                      {/* Planifier entretien -> ajoute aussi au calendrier */}
                      <button
                        title="Planifier un entretien"
                        onClick={() => openAdd(job.id)}
                        className="inline-flex items-center justify-center p-1.5 rounded-md border bg-surface border-border hover:border-primary"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    {showReminder && (
                      <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-destructive text-destructive-foreground">
                        ⚠️ Relancer
                      </span>
                    )}
                  </div>

                  {/* Formulaire inline */}
                  {form?.open && (
                    <div className="mt-3 rounded-lg border border-border bg-card p-3 flex flex-col lg:flex-row gap-2">
                      <input
                        type="datetime-local"
                        className="bg-surface border border-border rounded px-2 h-10"
                        value={form.when}
                        onChange={(e) => setAddFor((m) => ({ ...m, [job.id]: { ...(m[job.id] as AddForm), when: e.target.value } }))}
                      />
                      <input
                        type="text"
                        placeholder="Note"
                        className="flex-1 bg-surface border border-border rounded px-2 h-10"
                        value={form.note}
                        onChange={(e) => setAddFor((m) => ({ ...m, [job.id]: { ...(m[job.id] as AddForm), note: e.target.value } }))}
                      />
                      <input
                        type="text"
                        placeholder="Lieu / Outil"
                        className="bg-surface border border-border rounded px-2 h-10"
                        value={form.location}
                        onChange={(e) => setAddFor((m) => ({ ...m, [job.id]: { ...(m[job.id] as AddForm), location: e.target.value } }))}
                      />
                      <input
                        type="url"
                        placeholder="Lien visio"
                        className="bg-surface border border-border rounded px-2 h-10"
                        value={form.url}
                        onChange={(e) => setAddFor((m) => ({ ...m, [job.id]: { ...(m[job.id] as AddForm), url: e.target.value } }))}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          className="h-10 px-3 rounded-lg border border-border hover:border-primary"
                          onClick={() => confirmAdd(job)}
                        >
                          Confirmer
                        </button>
                        <button
                          className="h-10 px-3 rounded-lg border border-border hover:border-danger inline-flex items-center gap-1"
                          onClick={() => cancelAdd(job.id)}
                        >
                          <X className="w-4 h-4" /> Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </TableCell>

                <TableCell className="align-top">
                  <div className="flex items-center gap-2">
                    <BankAvatar bankId={bankId} name={job.company} size={28} className="shadow-sm" />
                    <span className="inline-flex items-center gap-2">
                      <span className="leading-none">{job.company ?? "-"}</span>
                      <span className="inline-block h-2 w-2 rounded-full bank-dot" style={dotStyle} title={bankId ?? ""} />
                    </span>
                  </div>
                </TableCell>

                <TableCell className="align-top">{job.location ?? "-"}</TableCell>

                <TableCell className="align-top text-sm text-muted-foreground">
                  {formatPostedFR(job.posted)}
                </TableCell>
              </motion.tr>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
