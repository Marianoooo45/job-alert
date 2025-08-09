// ui/src/app/inbox/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import * as Alerts from "@/lib/alerts";
import AlertModal from "@/components/AlertModal";
import BankAvatar from "@/components/BankAvatar";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { Star, FileText } from "lucide-react";

import { setStatus, getAll as trackerGetAll, clearJob, type AppStatus } from "@/lib/tracker";
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

function bankDotStyle(bankId?: string): React.CSSProperties | undefined {
  if (!bankId) return undefined;
  const cfg = (BANK_CONFIG as any)[bankId];
  if (!cfg) return undefined;
  if (cfg.color) return { background: cfg.color };
  if (cfg.gradient) return { backgroundImage: `linear-gradient(135deg, ${cfg.gradient[0]}, ${cfg.gradient[1]})` };
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

/* ---------------- Page ---------------- */

export default function InboxPage() {
  const [alerts, setAlerts] = useState<Alerts.Alert[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [editOpen, setEditOpen] = useState(false);

  // status favoris/candidatures
  const [statusMap, setStatusMap] = useState<Record<string, AppStatus | undefined>>({});

  const selected = useMemo(
    () => alerts.find((a) => a.id === selectedId) ?? null,
    [alerts, selectedId]
  );

  // charger alertes + états tracker
  useEffect(() => {
    const all = Alerts.getAll();
    setAlerts(all);
    if (!selectedId && all.length) setSelectedId(all[0].id);

    const map: Record<string, AppStatus | undefined> = {};
    trackerGetAll().forEach((j) => (map[j.id] = j.status));
    setStatusMap(map);
  }, []);

  // écouter les changements (cloche/modale)
  useEffect(() => {
    const off = Alerts.onChange(() => {
      setAlerts(Alerts.getAll());
    });
    return off;
  }, []);

  // charger les jobs correspondant à l’alerte sélectionnée
  useEffect(() => {
    (async () => {
      if (!selected) {
        setJobs([]);
        return;
      }
      const res = await fetch(`/api/jobs?${qsFromAlert(selected).toString()}`, { cache: "no-store" });
      const arr = res.ok ? ((await res.json()) as Job[]) : [];
      setJobs(arr);
    })();
  }, [selectedId, alerts.length]); // re-fetch si la liste d’alertes évolue

  // actions alertes
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
    Alerts.markJobsSeen(selected.id, jobs.map((j) => j.id));
    // Alerts.onChange pingera la cloche; on refresh local pour l’étiquette "Nouveau"
    setAlerts(Alerts.getAll());
  };

  // actions tracker (favori / candidature)
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
      setStatusMap((s) => ({ ...s, [job.id]: undefined }));
    } else {
      upsertStatus(job, "shortlist");
    }
  }

  function toggleApplied(job: Job) {
    const current = statusMap[job.id];
    if (current === "applied") {
      clearJob(job.id);
      setStatusMap((s) => ({ ...s, [job.id]: undefined }));
    } else {
      upsertStatus(job, "applied");
    }
  }

  // enrichissement pour la table
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

  return (
    <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight neon-title mb-6">Inbox</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
        {/* Colonne : liste des alertes */}
        <aside className="rounded-xl border border-border bg-surface">
          <div className="px-4 py-3 border-b border-border/60 text-sm text-muted-foreground">
            Mes alertes
          </div>
          <ul className="max-h-[70vh] overflow-auto">
            {alerts.map((a) => (
              <li key={a.id} className="border-b border-border/50 last:border-none">
                <button
                  onClick={() => setSelectedId(a.id)}
                  className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-muted/40 transition ${
                    a.id === selectedId ? "bg-muted/50" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{a.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {[
                        Alerts.normalizeKeywords(a.query.keywords)?.length ? `#${Alerts.normalizeKeywords(a.query.keywords)!.join(" #")}` : null,
                        a.query.banks?.length ? `${a.query.banks.length} banque(s)` : null,
                        a.query.categories?.length ? `${a.query.categories.length} métier(s)` : null,
                        a.query.contractTypes?.length ? `${a.query.contractTypes.length} contrat(s)` : null,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </div>
                  </div>
                </button>

                {/* Actions alerte */}
                <div className="px-4 pb-3 pt-1 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedId(a.id);
                      setEditOpen(true);
                    }}
                    className="h-9 px-3 rounded-lg border border-border hover:border-primary"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => removeAlert(a.id)}
                    className="h-9 px-3 rounded-lg border border-border hover:border-danger"
                  >
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
            {alerts.length === 0 && (
              <li className="px-4 py-6 text-sm text-muted-foreground">
                Aucune alerte. Clique la cloche ➜ “Créer une alerte”.
              </li>
            )}
          </ul>
        </aside>

        {/* Colonne : résultats de l’alerte sélectionnée (table comme “Offres”) */}
        <section className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Résultats</div>
              <div className="text-lg font-semibold">{selected?.name ?? "—"}</div>
            </div>
            {selected && (
              <div className="flex items-center gap-2">
                <button
                  onClick={markAllReadForSelected}
                  className="h-9 px-3 rounded-lg border border-border hover:border-primary"
                >
                  Marquer tout lu
                </button>
              </div>
            )}
          </div>

          <div className="p-4">
            {!selected ? (
              <div className="text-muted-foreground">Sélectionne une alerte à gauche.</div>
            ) : enriched.length === 0 ? (
              <div className="text-muted-foreground">Aucune offre pour le moment.</div>
            ) : (
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
                  {enriched.map(({ job, bankId, dotStyle, isSeen, st }) => {
                    const isFav = st === "shortlist";
                    const isApplied = st === "applied";
                    return (
                      <TableRow key={job.id} className="border-t border-border/60 hover:bg-[color-mix(in_oklab,var(--color-primary)_7%,transparent)]">
                        {/* Poste + actions */}
                        <TableCell className="align-top">
                          <div className="flex items-center gap-2">
                            <Link
                              href={job.link}
                              target="_blank"
                              className="font-medium text-cyan-400 hover:underline"
                              onClick={() => {
                                if (selected) Alerts.markJobSeen(selected.id, job.id);
                              }}
                            >
                              {job.title}
                            </Link>
                            {!isSeen && (
                              <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-primary/10 border border-primary/40">
                                Nouveau
                              </span>
                            )}
                            <div className="flex items-center gap-1.5 ml-1">
                              <button
                                title={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
                                aria-label="Favori"
                                onClick={() => toggleFavorite(job)}
                                className={`inline-flex items-center justify-center p-1.5 rounded-md border transition-colors ${
                                  isFav
                                    ? "bg-secondary/85 border-secondary text-background"
                                    : "bg-surface border-border hover:border-secondary"
                                }`}
                              >
                                <Star className={`w-4 h-4 ${isFav ? "fill-current" : ""}`} />
                              </button>
                              <button
                                title={isApplied ? "Retirer des candidatures" : "Ajouter aux candidatures"}
                                aria-label="Postuler"
                                onClick={() => toggleApplied(job)}
                                className={`inline-flex items-center justify-center p-1.5 rounded-md border transition-colors ${
                                  isApplied
                                    ? "bg-primary/85 border-primary text-background"
                                    : "bg-surface border-border hover:border-primary"
                                }`}
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </TableCell>

                        {/* Banque */}
                        <TableCell className="align-top">
                          <div className="flex items-center gap-2">
                            <BankAvatar bankId={bankId} name={job.company ?? undefined} size={28} className="shadow-sm" />
                            <span className="inline-flex items-center gap-2">
                              <span className="leading-none">{job.company ?? "-"}</span>
                              <span className="inline-block h-2 w-2 rounded-full bank-dot" style={dotStyle} title={bankId ?? ""} />
                            </span>
                          </div>
                        </TableCell>

                        {/* Lieu */}
                        <TableCell className="align-top">{job.location ?? "-"}</TableCell>

                        {/* Date */}
                        <TableCell className="align-top text-sm text-muted-foreground">
                          {formatPostedFR(job.posted)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </section>
      </div>

      {/* Modale édition (pré-remplie) */}
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
    </main>
  );
}
