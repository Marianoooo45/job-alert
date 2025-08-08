// ui/src/components/JobTable.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
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
import { setStatus, getAll, type AppStatus } from "@/lib/tracker";
import { BANKS_LIST, BANK_CONFIG } from "@/config/banks";
import { format, formatDistanceToNowStrict, isValid, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

// ---------- Helpers ----------

// on tente de retrouver un bankId fiable à partir de job.source (id court) ou job.company (nom marketing)
function resolveBankId(job: Job): string | undefined {
  // 1) si le source est déjà un id connu (SG, BNPP, etc.)
  if (job.source) {
    const hit = BANKS_LIST.find((b) => b.id.toLowerCase() === job.source.toLowerCase());
    if (hit) return hit.id;
  }

  // 2) sinon on essaye par le nom marketing (insensible aux accents/majuscules)
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

  // on compare avec BANKS_LIST.name
  for (const b of BANKS_LIST) {
    if (norm(b.name) === company) return b.id;

    // tolérance: inclusion (ex: "bnp paribas sa" contient "bnp paribas")
    if (company.includes(norm(b.name))) return b.id;
  }
  return undefined;
}

// format FR “il y a …” < 7 jours, sinon date longue
function formatPostedFR(value?: string) {
  if (!value) return "-";
  // cas ISO timestamp
  let date: Date | null = null;
  // parse ISO si possible
  try {
    const d = parseISO(value);
    if (isValid(d)) date = d;
  } catch {
    // ignore
  }
  // fallback: new Date(value) (si déjà Date-like)
  if (!date) {
    const d2 = new Date(value);
    if (isValid(d2)) date = d2;
  }
  if (!date) return value; // on affiche brut si vraiment inconnu

  const nowish = Date.now();
  const diffMs = nowish - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 7) {
    // ex: "il y a 3 h", "il y a 2 j"
    return `il y a ${formatDistanceToNowStrict(date, { locale: fr })}`;
  }
  // ex: "06 juin 2025"
  return format(date, "dd MMMM yyyy", { locale: fr });
}

// style utilitaire pour le petit “dot” couleur banque
function bankDotStyle(bankId?: string): React.CSSProperties | undefined {
  if (!bankId) return undefined;
  const cfg = (BANK_CONFIG as any)[bankId];
  if (!cfg) return undefined;

  if (cfg.color) {
    return { background: cfg.color };
  }
  if (cfg.gradient && Array.isArray(cfg.gradient)) {
    return {
      backgroundImage: `linear-gradient(135deg, ${cfg.gradient[0]}, ${cfg.gradient[1]})`,
    };
  }
  return undefined;
}

// ---------- Component ----------

interface JobTableProps {
  jobs: Job[];
}

export default function JobTable({ jobs }: JobTableProps) {
  const [statusMap, setStatusMap] = useState<Record<string, AppStatus | undefined>>({});

  // Charger les statuts depuis localStorage au montage
  useEffect(() => {
    const map: Record<string, AppStatus | undefined> = {};
    getAll().forEach((j) => (map[j.id] = j.status));
    setStatusMap(map);
  }, []);

  // cache bankId + style couleur
  const enriched = useMemo(
    () =>
      jobs.map((job) => {
        const bankId = resolveBankId(job);
        const dotStyle = bankDotStyle(bankId);
        return { job, bankId, dotStyle };
      }),
    [jobs]
  );

  // Marquer un job avec un statut
  function mark(job: Job, status: AppStatus) {
    setStatus(
      {
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        link: job.link,
        posted: job.posted,
        source: job.source,
      },
      status
    );
    setStatusMap((s) => ({ ...s, [job.id]: status }));
  }

  // Style des boutons selon statut
  function btn(kind: AppStatus, active?: AppStatus) {
    const base = "px-2 py-1 rounded border text-xs transition-colors";
    const is = active === kind;
    if (kind === "applied")
      return `${base} ${
        is
          ? "bg-primary text-background border-primary"
          : "bg-surface border-border hover:border-primary"
      }`;
    if (kind === "shortlist")
      return `${base} ${
        is
          ? "bg-secondary text-background border-secondary"
          : "bg-surface border-border hover:border-secondary"
      }`;
    return `${base} ${
      is
        ? "bg-destructive text-background border-destructive"
        : "bg-surface border-border hover:border-destructive/70"
    }`;
  }

  return (
    <Table className="table-default">
      <TableHeader>
        <TableRow>
          <TableHead>Poste</TableHead>
          <TableHead>Banque</TableHead>
          <TableHead>Lieu</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right w-[24%]">Suivi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {enriched.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">
              Aucune offre trouvée.
            </TableCell>
          </TableRow>
        ) : (
          enriched.map(({ job, bankId, dotStyle }) => (
            <TableRow
              key={job.id}
              className="border-t border-border/60 hover:bg-[color-mix(in_oklab,var(--color-primary)_7%,transparent)] transition-colors"
            >
              {/* Poste */}
              <TableCell className="align-top font-medium">
                <Link href={job.link} target="_blank" className="text-cyan-400 hover:underline">
                  {job.title}
                </Link>
              </TableCell>

              {/* Banque avec logo + dot couleur + glow anneau */}
              <TableCell className="align-top">
                <div className="flex items-center gap-2">
                  <BankAvatar bankId={bankId} name={job.company} size={28} className="shadow-sm" />
                  <span className="inline-flex items-center gap-2">
                    <span className="leading-none">{job.company ?? "-"}</span>
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={dotStyle}
                      title={bankId ?? ""}
                    />
                  </span>
                </div>
              </TableCell>

              {/* Lieu */}
              <TableCell className="align-top">{job.location ?? "-"}</TableCell>

              {/* Date lisible FR */}
              <TableCell className="align-top text-sm text-muted-foreground">
                {formatPostedFR(job.posted)}
              </TableCell>

              {/* Actions de suivi */}
              <TableCell className="text-right align-top">
                <div className="inline-flex gap-2">
                  <button
                    className={btn("applied", statusMap[job.id])}
                    onClick={() => mark(job, "applied")}
                    title="Marquer comme postulé"
                  >
                    Postulé
                  </button>
                  <button
                    className={btn("shortlist", statusMap[job.id])}
                    onClick={() => mark(job, "shortlist")}
                    title="Shortlist"
                  >
                    ⭐
                  </button>
                  <button
                    className={btn("rejected", statusMap[job.id])}
                    onClick={() => mark(job, "rejected")}
                    title="Refusé"
                  >
                    Refus
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
