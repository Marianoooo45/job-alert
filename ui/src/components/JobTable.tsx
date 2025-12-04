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
  Sparkles,
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
        className={`group inline-flex items-center gap-2 select-none text-[10px] font-bold font-mono tracking-[0.15em] uppercase transition-all duration-300 ${
          active
            ? "text-primary"
            : "text-muted-foreground/60 hover:text-foreground"
        } ${widthClass}`}
        onClick={() => changeSort(column)}
      >
        <span>{children}</span>
        {active ? (
          sortDir === "asc" ? (
            <ArrowUp className="w-3.5 h-3.5 text-primary animate-pulse" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5 text-primary animate-pulse" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />
        )}
      </button>
    );
  }

  const COLW = {
    title: "w-[46%]",
    bank: "w-[22%]",
    loc: "w-[18%]",
    date: "w-[14%]",
  };

  return (
    <div className="w-full">
      <div className="relative rounded-2xl border border-border/50 bg-background/40 backdrop-blur-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.3)] hover:shadow-[0_0_80px_rgba(var(--primary-rgb),0.2)] transition-all duration-500 group">
        {/* Top scanline */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px] overflow-hidden"
        >
          <div className="absolute w-full h-full bg-gradient-to-r from-transparent via-primary to-transparent animate-scan opacity-50" />
        </div>

        {/* Bottom glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-secondary to-transparent opacity-30 blur-sm"
        />

        <Table className="relative z-10 border-none w-full">
          <TableHeader className="bg-gradient-to-b from-background/80 to-background/60 backdrop-blur-xl border-b border-border/50 sticky top-0 z-20">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className={`h-14 pl-6 ${COLW.title}`}>
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
                  Localisation
                </SortButton>
              </TableHead>
              <TableHead className={COLW.date}>
                <SortButton column="posted" widthClass="w-full">
                  Timestamp
                </SortButton>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-border/30">
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-96 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-primary/50" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-muted-foreground">
                        Aucune offre détectée
                      </p>
                      <p className="text-sm text-muted-foreground/60 mt-1 font-mono">
                        Ajustez vos filtres pour explorer plus d&apos;opportunités
                      </p>
                    </div>
                  </div>
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
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03, duration: 0.3 }}
                    className={`
                      group/row relative border-b border-border/30 last:border-0 cursor-default
                      transition-all duration-300
                      hover:bg-gradient-to-r hover:from-primary/5 hover:via-transparent hover:to-secondary/5
                      ${isRejected ? "opacity-40 grayscale" : ""}
                    `}
                  >
                    <TableCell
                      className={`${COLW.title} py-5 pl-6 align-middle relative z-10`}
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                          <Link
                            href={job.link}
                            target="_blank"
                            className="text-[15px] font-semibold text-foreground group-hover/row:text-primary transition-colors truncate leading-normal tracking-tight hover:underline underline-offset-4 decoration-primary/50 decoration-2"
                            title={job.title}
                          >
                            {job.title}
                          </Link>

                          {isLive && (
                            <span className="shrink-0 inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-bold font-mono uppercase tracking-wider bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border border-emerald-400/30 shadow-[0_0_15px_rgba(34,197,94,0.4)] animate-pulse">
                              <Zap className="w-2.5 h-2.5 fill-current" /> LIVE
                            </span>
                          )}
                          {!isLive && isNew && (
                            <span className="shrink-0 inline-flex items-center px-2 py-1 rounded-full text-[9px] font-bold font-mono uppercase tracking-wider bg-gradient-to-r from-blue-500 to-blue-600 text-white border border-blue-400/30 shadow-[0_0_12px_rgba(59,130,246,0.3)]">
                              NEW
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 opacity-0 group-hover/row:opacity-100 transition-all duration-300 h-7">
                          <button
                            onClick={() => toggleFavorite(job)}
                            className={`p-2 rounded-lg hover:bg-background/80 border transition-all duration-300 ${
                              isFav
                                ? "text-yellow-500 border-yellow-500/30 bg-yellow-500/10 shadow-[0_0_12px_rgba(234,179,8,0.3)]"
                                : "text-muted-foreground hover:text-yellow-500 border-transparent hover:border-yellow-500/30"
                            }`}
                            title={
                              isFav ? "Retirer des favoris" : "Ajouter aux favoris"
                            }
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                isFav ? "fill-current" : ""
                              }`}
                            />
                          </button>
                          <button
                            onClick={() => toggleApplied(job)}
                            className={`p-2 rounded-lg hover:bg-background/80 border transition-all duration-300 ${
                              isApplied
                                ? "text-purple-500 border-purple-500/30 bg-purple-500/10 shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                                : "text-muted-foreground hover:text-purple-500 border-transparent hover:border-purple-500/30"
                            }`}
                            title={
                              isApplied
                                ? "Candidature envoyée"
                                : "Marquer comme postulé"
                            }
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
                            className="p-2 rounded-lg hover:bg-background/80 text-muted-foreground hover:text-primary transition-all duration-300 border border-transparent hover:border-primary/30 ml-1"
                            title="Ouvrir l'offre"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell
                      className={`${COLW.bank} py-5 align-middle relative z-10`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative group-hover/row:scale-110 transition-transform duration-300">
                          <BankAvatar
                            bankId={bankId}
                            name={job.company}
                            size={32}
                            className="rounded-lg shadow-md ring-1 ring-border/50 group-hover/row:ring-primary/50 transition-all duration-300"
                          />
                          {dotStyle && (
                            <div
                              className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full shadow-lg"
                              style={dotStyle}
                            />
                          )}
                        </div>
                        <span className="text-sm font-medium text-muted-foreground group-hover/row:text-foreground transition-colors truncate max-w-[160px]">
                          {job.company}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell
                      className={`${COLW.loc} py-5 align-middle relative z-10`}
                    >
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono group-hover/row:text-foreground transition-colors">
                        <MapPin className="w-3.5 h-3.5 shrink-0 opacity-40 group-hover/row:opacity-100 group-hover/row:text-primary transition-all" />
                        <span className="truncate max-w-[170px]">
                          {job.location}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell
                      className={`${COLW.date} py-5 align-middle relative z-10`}
                    >
                      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground font-mono group-hover/row:text-foreground transition-colors">
                        <Clock className="w-3.5 h-3.5 opacity-30 group-hover/row:opacity-60 transition-opacity" />
                        <span
                          className={
                            isNew ? "text-blue-600 dark:text-blue-400" : ""
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

        <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-tl from-primary/10 via-transparent to-transparent rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      </div>

      <div className="mt-3 flex justify-end px-2">
        <span className="text-[10px] text-muted-foreground/60 uppercase tracking-[0.2em] font-mono font-semibold flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
          SYNC • {sorted.length} OFFERS LOADED
        </span>
      </div>

      <style jsx>{`
        @keyframes scan {
          0% {
            transform: translateX(-100%);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateX(100%);
            opacity: 0;
          }
        }

        .animate-scan {
          animation: scan 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
