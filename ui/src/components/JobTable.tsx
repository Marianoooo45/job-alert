// ui/src/components/JobTable.tsx
"use client";

import React from "react"; // ✅ helps SWC parsing in some setups
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Job } from "@/lib/data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import BankAvatar from "@/components/BankAvatar";
import { setStatus, getAll, clearJob, type AppStatus } from "@/lib/tracker";
import { BANKS_LIST, BANK_CONFIG } from "@/config/banks";
import { format, formatDistanceToNowStrict, isValid, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Star, FileText, ArrowUpDown, ArrowDown, ArrowUp } from "lucide-react";
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

function parsePosted(value?: string): Date | null {
  if (!value) return null;
  try {
    const d = parseISO(value);
    if (isValid(d)) return d;
  } catch {}
  const d2 = new Date(value);
  return isValid(d2 as any) ? d2 : null;
}

function formatPostedFR(value?: string) {
  const date = parsePosted(value);
  if (!date) return value ?? "-";
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
  status === "applied" && appliedAt && !respondedAt && Date.now() - Number(appliedAt) > 7 * 24 * 3600 * 1000;

/* ---------- Component ---------- */

interface JobTableProps { jobs: Job[]; }
type SortKey = "title" | "company" | "location" | "posted";

// ✅ pull the param type out (fixes SWC parse edge-case)
type SortButtonProps = {
  column: SortKey;
  children: React.ReactNode;
  widthClass: string;
};

export default function JobTable({ jobs }: JobTableProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [statusMap, setStatusMap] = useState<Record<string, AppStatus | undefined>>({});

  const sortBy = (params.get("sortBy") as SortKey) || "posted";
  const sortDir = (params.get("sortDir") as "asc" | "desc") || "desc";

  useEffect(() => {
    const map: Record<string, AppStatus | undefined> = {};
    getAll().forEach((j) => (map[j.id] = j.status));
    setStatusMap(map);
  }, []);

  // Enrichissement (on garde postedDate pour trier correctement)
  const enriched = useMemo(
    () =>
      jobs.map((job) => {
        const bankId = resolveBankId(job);
        const dotStyle = bankDotStyle(bankId);
        const postedDate = parsePosted(job.posted);
        const isNew = postedDate ? Date.now() - postedDate.getTime() < 24 * 3600 * 1000 : false;
        const isLive = postedDate ? Date.now() - postedDate.getTime() < 2 * 3600 * 1000 : false;
        return { job, bankId, dotStyle, isNew, isLive, postedDate };
      }),
    [jobs]
  );

  // ✅ Tri appliqué selon sortBy/sortDir (collator FR, stable tiebreaker)
  const sorted = useMemo(() => {
    const arr = [...enriched];
    const collator = new Intl.Collator("fr", { sensitivity: "base", numeric: true });
    arr.sort((a, b) => {
      let res = 0;
      switch (sortBy) {
        case "posted": {
          const ad = a.postedDate?.getTime() ?? 0;
          const bd = b.postedDate?.getTime() ?? 0;
          res = ad - bd; // asc: plus ancien → plus récent
          break;
        }
        case "title":
          res = collator.compare(a.job.title || "", b.job.title || "");
          break;
        case "company":
          res = collator.compare(a.job.company || "", b.job.company || "");
          break;
        case "location":
          res = collator.compare(a.job.location || "", b.job.location || "");
          break;
      }
      if (res === 0) {
        // tiebreaker stable sur titre + id
        res = collator.compare(a.job.title || "", b.job.title || "");
        if (res === 0) res = (a.job.id || "").localeCompare(b.job.id || "");
      }
      return sortDir === "asc" ? res : -res;
    });
    return arr;
  }, [enriched, sortBy, sortDir]);

  function upsert(job: Job, status: AppStatus) {
    setStatus(
      { id: job.id, title: job.title, company: job.company, location: job.location, link: job.link, posted: job.posted, source: job.source } as any,
      status
    );
    setStatusMap((s) => ({ ...s, [job.id]: status })); // instant UI update
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

  function changeSort(column: SortKey) {
    const nextDir: "asc" | "desc" = sortBy === column ? (sortDir === "asc" ? "desc" : "asc") : "asc";
    const next = new URLSearchParams(params.toString());
    next.set("sortBy", column);
    next.set("sortDir", nextDir);
    next.set("page", "1");
    router.push(`/?${next.toString()}`);
  }

  function SortButton({ column, children, widthClass }: SortButtonProps) {
    const active = sortBy === column;
    return (
      <button className={`group inline-flex items-center gap-1 select-none ${widthClass}`} onClick={() => changeSort(column)} title="Trier">
        <span className="truncate">{children}</span>
        {!active ? (
          <ArrowUpDown className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
        ) : sortDir === "asc" ? (
          <ArrowUp className="w-3.5 h-3.5" />
        ) : (
          <ArrowDown className="w-3.5 h-3.5" />
        )}
      </button>
    );
  }

  // tailles fixes
  const COLW = {
    title: "w-[48%] min-w-[380px]",
    bank: "w-[18%] min-w-[180px]",
    loc: "w-[18%] min-w-[160px]",
    date: "w-[16%] min-w-[140px]",
  };

  return (
    <Table className="table-default">
      {/* Header sticky */}
      <TableHeader className="sticky top-0 z-30 backdrop-blur bg-surface/90">
        <TableRow>
          <TableHead className={COLW.title}>
            <SortButton column="title" widthClass="w-full">Poste</SortButton>
          </TableHead>
          <TableHead className={COLW.bank}>
            <SortButton column="company" widthClass="w-full">Banque</SortButton>
          </TableHead>
          <TableHead className={COLW.loc}>
            <SortButton column="location" widthClass="w-full">Lieu</SortButton>
          </TableHead>
          <TableHead className={COLW.date}>
            <SortButton column="posted" widthClass="w-full">Date</SortButton>
          </TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {sorted.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground">Aucune offre trouvée.</TableCell>
          </TableRow>
        ) : (
          sorted.map(({ job, bankId, dotStyle, isNew, isLive }, idx) => {
            const st = statusMap[job.id];
            const isFav = st === "shortlist";
            const isApplied = st === "applied";
            const showReminder = needReminder(st, (job as any).appliedAt, (job as any).respondedAt);

            return (
              <motion.tr
                key={job.id}
                className="border-t border-border/60 hover:bg-[color-mix(in_oklab,var(--color-primary)_7%,transparent)]"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.015, 0.25), duration: 0.28, ease: "easeOut" }}
              >
                <TableCell className={`${COLW.title} align-top`}>
                  <div className="flex items-center gap-2 w-full">
                    <Link href={job.link} target="_blank" className="font-medium text-cyan-400 hover:underline truncate max-w-[520px]" title={job.title}>
                      {job.title}
                    </Link>
                    {isLive && <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--color-secondary)" }} title="Nouvelle offre (il y a < 2h)" />}
                    {isNew && <span className="text-[11px] px-2 py-0.5 rounded-full border border-border bg-card/70">Nouveau</span>}
                    <div className="flex items-center gap-1.5 ml-1 shrink-0">
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
                    </div>
                    {showReminder && (
                      <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-destructive text-destructive-foreground">
                        ⚠️ Relancer
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell className={`${COLW.bank} align-top`}>
                  <div className="flex items-center gap-2 truncate">
                    <BankAvatar bankId={bankId} name={job.company} size={28} className="shadow-sm shrink-0" />
                    <span className="inline-flex items-center gap-2 truncate">
                      <span className="leading-none truncate max-w-[160px]" title={job.company ?? "-"}>{job.company ?? "-"}</span>
                      <span className="inline-block h-2 w-2 rounded-full bank-dot shrink-0" style={dotStyle} title={bankId ?? ""} />
                    </span>
                  </div>
                </TableCell>

                <TableCell className={`${COLW.loc} align-top`}>
                  <span className="truncate block max-w-[240px]" title={job.location ?? "-"}>{job.location ?? "-"}</span>
                </TableCell>

                <TableCell className={`${COLW.date} align-top text-sm text-muted-foreground`}>
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
