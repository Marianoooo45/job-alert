"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Job } from "@/lib/data";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import BankAvatar from "@/components/BankAvatar";
import { setStatus, getAll, clearJob, type AppStatus } from "@/lib/tracker";
import { BANKS_LIST, BANK_CONFIG } from "@/config/banks";
import {
  format,
  formatDistanceToNowStrict,
  isValid,
  parseISO,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  Star,
  FileText,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  MapPin,
  ExternalLink,
  Clock,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";

/* ---------- Helpers ---------- */
function resolveBankId(job: Job): string | undefined {
  if (job.source) {
    const hit = BANKS_LIST.find(
      (b) => b.id.toLowerCase() === job.source.toLowerCase(),
    );
    if (hit) return hit.id;
  }
  const norm = (s?: string) =>
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
  if (diffDays < 7) {
    return `${formatDistanceToNowStrict(date, { locale: fr })}`;
  }
  return format(date, "d MMM", { locale: fr });
}

function bankDotStyle(bankId?: string): React.CSSProperties | undefined {
  if (!bankId) return undefined;
  const cfg = (BANK_CONFIG as any)[bankId];
  if (!cfg) return undefined;
  // bordure sur la couleur de fond pour que ça se voie bien en light et dark
  if (cfg.color)
    return { background: cfg.color, border: "2px solid var(--background)" };
  if (cfg.gradient)
    return {
      backgroundImage: `linear-gradient(135deg, ${cfg.gradient[0]}, ${cfg.gradient[1]})`,
      border: "2px solid var(--background)",
    };
  return undefined;
}

interface JobTableProps {
  jobs: Job[];
}
type SortKey = "title" | "company" | "location" | "posted";
type SortButtonProps = {
  column: SortKey;
  children: React.ReactNode;
  widthClass: string;
};

export default function JobTable({ jobs }: JobTableProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [statusMap, setStatusMap] = useState<
    Record<string, AppStatus | undefined>
  >({});

  const sortBy = (params.get("sortBy") as SortKey) || "posted";
  const sortDir = (params.get("sortDir") as "asc" | "desc") || "desc";

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
        const postedDate = parsePosted(job.posted);
        const isNew = postedDate
          ? Date.now() - postedDate.getTime() < 24 * 3600 * 1000
          : false;
        const isLive = postedDate
          ? Date.now() - postedDate.getTime() < 2 * 3600 * 1000
          : false;
        return { job, bankId, dotStyle, isNew, isLive, postedDate };
      }),
    [jobs],
  );

  const sorted = useMemo(() => {
    const arr = [...enriched];
    const collator = new Intl.Collator("fr", {
      sensitivity: "base",
      numeric: true,
    });
    arr.sort((a, b) => {
      let res = 0;
      switch (sortBy) {
        case "posted":
          res =
            (a.postedDate?.getTime() ?? 0) - (b.postedDate?.getTime() ?? 0);
          break;
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
      return sortDir === "asc" ? res : -res;
    });
    return arr;
  }, [enriched, sortBy, sortDir]);

  function toggleFavorite(job: Job) {
    statusMap[job.id] === "shortlist"
      ? (clearJob(job.id),
        setStatusMap((s) => ({ ...s, [job.id]: undefined })))
      : (setStatus(
          {
            id: job.id,
            title: job.title,
            company: job.company,
            location: job.location,
            link: job.link,
            posted: job.posted,
            source: job.source,
          } as any,
          "shortlist",
        ),
        setStatusMap((s) => ({ ...s, [job.id]: "shortlist" })));
  }

  function toggleApplied(job: Job) {
    statusMap[job.id] === "applied"
      ? (clearJob(job.id),
        setStatusMap((s) => ({ ...s, [job.id]: undefined })))
      : (setStatus(
          {
            id: job.id,
            title: job.title,
            company: job.company,
            location: job.location,
            link: job.link,
            posted: job.posted,
            source: job.source,
          } as any,
          "applied",
        ),
        setStatusMap((s) => ({ ...s, [job.id]: "applied" })));
  }

  function changeSort(column: SortKey) {
    const nextDir =
      sortBy === column ? (sortDir === "asc" ? "desc" : "asc") : "asc";
    const next = new URLSearchParams(params.toString());
    next.set("sortBy", column);
    next.set("sortDir", nextDir);
    next.set("page", "1");
    router.push(`/offers?${next.toString()}`);
  }

  function SortButton({ column, children, widthClass }: SortButtonProps) {
    const active = sortBy === column;
    return (
      <button
        className={`group inline-flex items-center gap-2 select-none text-xs font-bold font-mono tracking-wider uppercase transition-colors ${
          active
            ? "text-primary"
            : "text-muted-foreground/70 hover:text-foreground"
        } ${widthClass}`}
        onClick={() => changeSort(column)}
      >
        <span>{children}</span>
        {active ? (
          sortDir === "asc" ? (
            <ArrowUp className="w-3 h-3 text-primary" />
          ) : (
            <ArrowDown className="w-3 h-3 text-primary" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
        )}
      </button>
    );
  }

  // colonnes un peu équilibrées, mais on laisse le tableau respirer (table-auto)
  const COLW = {
    title: "w-[46%]",
    bank: "w-[22%]",
    loc: "w-[18%]",
    date: "w-[14%]",
  };

  return (
    <div className="w-full">
      <div className="relative rounded-xl border border-border bg-card overflow-hidden shadow-sm offers-table-shell">
        {/* petites lignes lumineuses dans le panel */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-24 top-0 h-px bg-gradient-to-r from-transparent via-sky-500/70 to-transparent opacity-80"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-[-30%] bottom-0 h-px bg-gradient-to-r from-transparent via-fuchsia-500/45 to-transparent opacity-70 blur-[0.5px]"
        />

        {/* table-auto pour casser l’effet “toutes les colonnes identiques” */}
        <Table className="relative z-10 border-none table-auto w-full">
          <TableHeader className="bg-muted/50 border-b border-border">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className={`${COLW.title} h-12 pl-6`}>
                <SortButton column="title" widthClass="w-full">
                  Poste / Rôle
                </SortButton>
              </TableHead>
              <TableHead className={COLW.bank}>
                <SortButton column="company" widthClass="w-full">
                  Institution
                </SortButton>
              </TableHead>
              <TableHead className={COLW.loc}>
                <SortButton column="location" widthClass="w-full">
                  Lieu
                </SortButton>
              </TableHead>
              <TableHead className={COLW.date}>
                <SortButton column="posted" widthClass="w-full">
                  Date
                </SortButton>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-40 text-center text-muted-foreground font-mono"
                >
                  Aucune donnée détectée dans le flux.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map(({ job, bankId, dotStyle, isNew, isLive }, idx) => {
                const st = statusMap[job.id];
                const isFav = st === "shortlist";
                const isApplied = st === "applied";
                const isRejected = st === "rejected";

                return (
                  <motion.tr
                    key={job.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.02, duration: 0.2 }}
                    className={`
                      group relative border-b border-border last:border-0 cursor-default
                      transition-colors duration-200
                      odd:bg-card even:bg-muted/40 hover:bg-muted/60
                      ${isRejected ? "opacity-50 grayscale" : ""}
                    `}
                  >
                    <TableCell
                      className={`${COLW.title} py-4 pl-6 align-middle truncate`}
                    >
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-3">
                          <Link
                            href={job.link}
                            target="_blank"
                            className="text-[15px] font-semibold text-foreground group-hover:text-primary transition-colors truncate leading-normal tracking-tight hover:underline underline-offset-4 decoration-primary/30"
                            title={job.title}
                          >
                            {job.title}
                          </Link>

                          {/* Badges LIVE / NEW */}
                          {isLive && (
                            <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                              <Zap className="w-2.5 h-2.5" /> LIVE
                            </span>
                          )}
                          {!isLive && isNew && (
                            <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold font-mono uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                              NEW
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-6">
                          <button
                            onClick={() => toggleFavorite(job)}
                            className={`p-1.5 rounded-md hover:bg-muted border border-transparent hover:border-border transition-colors ${
                              isFav
                                ? "text-yellow-500"
                                : "text-muted-foreground hover:text-yellow-500"
                            }`}
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                isFav ? "fill-current" : ""
                              }`}
                            />
                          </button>
                          <button
                            onClick={() => toggleApplied(job)}
                            className={`p-1.5 rounded-md hover:bg-muted border border-transparent hover:border-border transition-colors ${
                              isApplied
                                ? "text-purple-500"
                                : "text-muted-foreground hover:text-purple-500"
                            }`}
                          >
                            <FileText
                              className={`w-3.5 h-3.5 ${
                                isApplied ? "fill-current" : ""
                              }`}
                            />
                          </button>
                          <Link
                            href={job.link}
                            target="_blank"
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-colors ml-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className={`${COLW.bank} py-4 align-middle`}>
                      <div className="flex items-center gap-3">
                        <div className="relative group-hover:scale-105 transition-transform duration-200">
                          <BankAvatar
                            bankId={bankId}
                            name={job.company}
                            size={28}
                            className="rounded-md shadow-sm ring-1 ring-border/50 transition-all"
                          />
                          {dotStyle && (
                            <div
                              className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full"
                              style={dotStyle}
                            />
                          )}
                        </div>
                        <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors truncate max-w-[140px]">
                          {job.company}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className={`${COLW.loc} py-4 align-middle`}>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono group-hover:text-foreground transition-colors">
                        <MapPin className="w-3.5 h-3.5 shrink-0 opacity-50 group-hover:opacity-100" />
                        <span className="truncate max-w-[150px]">
                          {job.location}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className={`${COLW.date} py-4 align-middle`}>
                      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground font-mono">
                        <Clock className="w-3.5 h-3.5 opacity-40" />
                        <span
                          className={
                            isNew
                              ? "text-blue-600 dark:text-blue-400"
                              : "group-hover:text-foreground"
                          }
                        >
                          {formatPostedFR(job.posted)}
                        </span>
                      </div>
                    </TableCell>
                  </motion.tr>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-2 flex justify-end px-2">
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono font-semibold opacity-60">
          Sync • {sorted.length} offers loaded
        </span>
      </div>
    </div>
  );
}
