// ui/src/app/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BankAvatar from "@/components/BankAvatar";
import JobTimeline from "@/components/JobTimeline";
import CalendarModal from "@/components/CalendarModal";
import {
  getAll,
  setStage,
  incInterviews,
  clearJob,
  setStatus,
  type SavedJob,
} from "@/lib/tracker";
import { BANKS_LIST, BANK_CONFIG } from "@/config/banks";
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, Legend,
} from "recharts";
import { motion } from "framer-motion";
import { Calendar as CalendarIcon } from "lucide-react";

/* ---------- Helpers ---------- */

function timeAgo(ts?: number | string) {
  if (!ts) return "-";
  const d = new Date(Number(ts));
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 48) return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  return `il y a ${j} j`;
}

const CSS = (v: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const palette = () => ({
  primary: CSS("--color-primary") || "hsl(var(--primary))",
  secondary: CSS("--color-secondary") || "hsl(var(--secondary))",
  text: CSS("--color-foreground") || "hsl(var(--foreground))",
  grid: "rgba(255,255,255,.12)",
});

type Prefs = {
  showKPIs: boolean;
  showTopByBank: boolean;
  showTimeSeries: boolean;
  showReminders: boolean;
};
const DEFAULT_PREFS: Prefs = {
  showKPIs: true,
  showTopByBank: true,
  showTimeSeries: true,
  showReminders: true,
};
const PREFS_KEY = "dashboard_prefs_v2";
const loadPrefs = () => {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_PREFS;
};
const savePrefs = (p: Prefs) => {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {}
};

type View = "favs" | "applied";
type StatusFilter = "all" | "active" | "rejected";

/** Normalisation & mapping pour retrouver l'id banque à partir du nom/source */
function resolveBankId(company?: string | null, source?: string | null): string | undefined {
  if (source) {
    const hit = BANKS_LIST.find(
      (b) => b.id.toLowerCase() === source.toLowerCase()
    );
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

  const companyN = norm(company);
  if (!companyN) return undefined;

  for (const b of BANKS_LIST) {
    const bn = norm(b.name);
    if (bn === companyN || companyN.includes(bn)) return b.id;
  }
  return undefined;
}

/* ---------- Component ---------- */

export default function DashboardPage() {
  const [items, setItems] = useState<SavedJob[]>([]);
  const [view, setView] = useState<View>("favs");
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [openTimeline, setOpenTimeline] = useState<Record<string, boolean>>({});
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Nouveaux états pour filtres/pagination (vue Candidatures)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [hideRejected, setHideRejected] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    setItems(getAll());
    setPrefs(loadPrefs());
  }, []);
  useEffect(() => savePrefs(prefs), [prefs]);

  // Reset pagination quand vue/filtre changent
  useEffect(() => {
    setPage(1);
  }, [view, statusFilter, hideRejected, items.length]);

  const colors =
    typeof window !== "undefined"
      ? palette()
      : {
          primary: "#bb9af7",
          secondary: "#f7768e",
          text: "#c0caf5",
          grid: "rgba(255,255,255,.12)",
        };

  const favs = useMemo(() => items.filter((i) => i.status === "shortlist"), [items]);

  // Toutes les candidatures (global)
  const appliedAll = useMemo(() => items.filter((i) => i.status === "applied"), [items]);

  // Filtrage fin pour la vue Candidatures
  const appliedActive = useMemo(
    () => appliedAll.filter((j) => (j.stage ?? "applied") !== "rejected"),
    [appliedAll]
  );
  const appliedRejected = useMemo(
    () => appliedAll.filter((j) => (j.stage ?? "applied") === "rejected"),
    [appliedAll]
  );

  const appliedFiltered = useMemo(() => {
    let base =
      statusFilter === "all"
        ? appliedAll
        : statusFilter === "active"
        ? appliedActive
        : appliedRejected;
    if (hideRejected) base = base.filter((j) => (j.stage ?? "applied") !== "rejected");
    return base;
  }, [appliedAll, appliedActive, appliedRejected, statusFilter, hideRejected]);

  // Pagination (uniquement pour la vue Candidatures)
  const paginatedApplied = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return appliedFiltered.slice(start, end);
  }, [appliedFiltered, page]);

  const totalAppliedPages = useMemo(
    () => Math.max(1, Math.ceil(appliedFiltered.length / PAGE_SIZE)),
    [appliedFiltered.length]
  );

  // Source “courante” pour KPIs/Charts (respecte les filtres quand on est sur Candidatures)
  const rowsForView = useMemo(() => {
    if (view === "favs") return favs;
    return appliedFiltered;
  }, [view, favs, appliedFiltered]);

  const kpis = useMemo(() => {
    const rows = rowsForView;
    const banks = new Set<string>();
    let interviews = 0;
    let last: number | undefined;
    rows.forEach((r) => {
      if (r.company) banks.add(r.company);
      if (r.interviews) interviews += r.interviews;
      if (!last || (r.appliedAt && +r.appliedAt > last))
        last = r.appliedAt ? +r.appliedAt : last;
    });
    return {
      total: rows.length,
      distinctBanks: banks.size,
      interviews,
      lastAdded: last ? timeAgo(last) : "-",
    };
  }, [rowsForView]);

  const topByBank = useMemo(() => {
    const src = rowsForView;
    const map = new Map<string, number>();
    src.forEach((f) => {
      const key = f.company ?? f.source ?? "Autre";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([bank, count]) => ({ bank, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [rowsForView]);

  const weekly = useMemo(() => {
    const src = rowsForView;
    const buckets = new Map<string, number>();
    const weekKey = (d: Date) => {
      const date = new Date(d);
      const dayNum = (date.getUTCDay() + 6) % 7;
      date.setUTCDate(date.getUTCDate() - dayNum + 3);
      const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
      const week =
        1 +
        Math.round(
          ((date.getTime() - firstThursday.getTime()) / 86400000 - 3) / 7
        );
      const year = date.getUTCFullYear();
      return `${year}-W${String(week).padStart(2, "0")}`;
    };
    src.forEach((f) => {
      const d = f.appliedAt ? new Date(f.appliedAt) : undefined;
      if (!d) return;
      const key = weekKey(d);
      buckets.set(key, (buckets.get(key) || 0) + 1);
    });
    return Array.from(buckets.entries())
      .map(([week, value]) => ({ week, value }))
      .sort((a, b) => (a.week > b.week ? 1 : -1));
  }, [rowsForView]);

  const reminders = useMemo(() => {
    const seven = 7 * 24 * 3600 * 1000;
    return appliedAll
      .filter(
        (a) =>
          !a.respondedAt &&
          a.appliedAt &&
          Date.now() - Number(a.appliedAt) > seven
      )
      .sort((a, b) => Number(a.appliedAt) - Number(b.appliedAt))
      .slice(0, 15);
  }, [appliedAll]);

  function exportCSV() {
    const rows = [
      ["id", "title", "company", "location", "link", "appliedAt", "stage", "interviews"],
      ...appliedAll.map((j) => [
        j.id,
        j.title,
        j.company ?? "",
        j.location ?? "",
        j.link ?? "",
        j.appliedAt ? new Date(Number(j.appliedAt)).toISOString() : "",
        j.stage ?? "",
        String(j.interviews ?? 0),
      ]),
    ];
    const csv = rows
      .map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "candidatures_applied.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function applyFromFav(j: SavedJob) {
    setStatus(
      {
        id: j.id,
        title: j.title,
        company: j.company,
        location: j.location,
        link: j.link,
        posted: j.posted,
        source: j.source,
      } as any,
      "applied" as any
    );
    setItems(getAll());
  }

  const isReminder = (j: SavedJob) =>
    j.status === "applied" &&
    j.appliedAt &&
    !j.respondedAt &&
    Date.now() - Number(j.appliedAt) > 7 * 24 * 3600 * 1000;

  /* ---------- Render ---------- */

  // Lignes affichées dans le tableau (pagination appliquée si "applied")
  const tableRows = view === "favs" ? favs : paginatedApplied;
  const totalRowsForApplied = appliedFiltered.length;

  return (
    <main className="container mx-auto px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <motion.h1
          className="text-3xl sm:text-4xl font-semibold tracking-tight neon-title"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          Dashboard{" "}
          {view === "favs" ? (
            <>
              <span className="text-primary">Favoris</span> ⭐
            </>
          ) : (
            <>
              <span className="text-primary">Candidatures</span> 📄
            </>
          )}
        </motion.h1>

        <div className="flex items-center gap-2">
          <SegmentedControl
            options={[
              { key: "favs", label: "Favoris ⭐" },
              { key: "applied", label: "Candidatures 📄" },
            ]}
            value={view}
            onChange={(v) => setView(v as View)}
          />

          <button
            onClick={() => setCalendarOpen(true)}
            className="px-3 h-9 rounded-lg border border-border bg-surface hover:border-primary inline-flex items-center gap-2"
            title="Calendrier"
          >
            <CalendarIcon className="w-4 h-4" />
            Calendrier
          </button>

          <PrefsToggle prefs={prefs} setPrefs={setPrefs} />

          {view === "applied" && (
            <button
              onClick={exportCSV}
              className="px-3 h-9 rounded-lg border border-border bg-surface hover:border-primary"
              title="Exporter les candidatures (CSV)"
            >
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      {prefs.showKPIs && (
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Compteur global toujours affiché */}
          <CardStat label="Candidatures (global)" value={appliedAll.length} />
          <CardStat
            label={view === "favs" ? "Favoris (filtrés)" : "Candidatures (filtrées)"}
            value={kpis.total}
          />
          <CardStat label="Banques différentes" value={kpis.distinctBanks} />
          <CardStat label="Entretiens (cumul)" value={kpis.interviews} />
          <CardStat label="Dernier ajout" value={kpis.lastAdded} />
        </section>
      )}

      {/* Filtres spécifiques à la vue Candidatures */}
      {view === "applied" && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <FilterPill
              active={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
            >
              Toutes <span className="opacity-70">({appliedAll.length})</span>
            </FilterPill>
            <FilterPill
              active={statusFilter === "active"}
              onClick={() => setStatusFilter("active")}
            >
              En cours <span className="opacity-70">({appliedActive.length})</span>
            </FilterPill>
            <FilterPill
              active={statusFilter === "rejected"}
              onClick={() => setStatusFilter("rejected")}
            >
              Refusées <span className="opacity-70">({appliedRejected.length})</span>
            </FilterPill>

            <label className="ml-2 inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hideRejected}
                onChange={(e) => setHideRejected(e.target.checked)}
              />
              Masquer refusées
            </label>
          </div>
          {/* Petite ligne d'info pagination (si applied) */}
          <div className="text-xs text-muted-foreground">
            {appliedFiltered.length === 0
              ? "Aucune candidature avec ce filtre."
              : `Affichage ${Math.min((page - 1) * PAGE_SIZE + 1, totalRowsForApplied)}–${Math.min(
                  page * PAGE_SIZE,
                  totalRowsForApplied
                )} sur ${totalRowsForApplied}`}
          </div>
        </section>
      )}

      <section
        className={`grid grid-cols-1 ${
          prefs.showTopByBank && prefs.showTimeSeries
            ? "lg:grid-cols-3"
            : "lg:grid-cols-2"
        } gap-6`}
      >
        {prefs.showTopByBank && (
          <Card title={`Top banques (${view === "favs" ? "favoris" : "applied"})`}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topByBank} margin={{ left: -20 }}>
                <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
                <XAxis dataKey="bank" tick={{ fontSize: 12, fill: colors.text }} />
                <YAxis tick={{ fill: colors.text }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                  }}
                />
                <Bar
                  dataKey="count"
                  name="Volume"
                  fill={colors.primary}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {prefs.showTimeSeries && (
          <Card title={`${view === "favs" ? "Favoris" : "Candidatures"} par semaine`}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={weekly}>
                <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: colors.text }} />
                <YAxis allowDecimals={false} tick={{ fill: colors.text }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={view === "favs" ? "Favoris" : "Candidatures"}
                  stroke={colors.secondary}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {prefs.showReminders && view === "applied" && (
          <Card title="À relancer (7j sans réponse)">
            <div className="max-h[260px] max-h-[260px] overflow-auto pr-2">
              {reminders.length === 0 ? (
                <div className="h-[220px] grid place-items-center text-sm text-muted-foreground">
                  Rien à relancer pour l’instant.
                </div>
              ) : (
                <ul className="space-y-2">
                  {reminders.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-3 rounded border border-border px-3 py-2 hover:border-primary transition"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <BankAvatar
                          bankId={resolveBankId(r.company, r.source)}
                          name={r.company ?? r.source}
                          size={22}
                        />
                        <span className="truncate">
                          {r.title} —{" "}
                          <span className="text-muted-foreground">
                            {r.company ?? r.source ?? "-"}
                          </span>
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {r.appliedAt ? timeAgo(r.appliedAt) : "-"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        )}
      </section>

      <Card title={view === "favs" ? "Favoris (liste)" : "Candidatures (liste)"}>
        <div className="overflow-x-auto">
          <table className="w-full table-default">
            <thead className="text-left text-sm text-muted-foreground">
              <tr>
                <th className="p-3">Poste</th>
                <th className="p-3">Banque</th>
                <th className="p-3">Étape</th>
                <th className="p-3">Entretiens</th>
                <th className="p-3">Ajout</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.length === 0 ? (
                <tr>
                  <td className="p-4 text-muted-foreground" colSpan={6}>
                    {view === "favs"
                      ? "Aucun favori pour l’instant. ⭐ Ajoute depuis la liste d’offres."
                      : "Aucune candidature pour ce filtre."}
                  </td>
                </tr>
              ) : (
                tableRows.map((j, i) => {
                  const remind = isReminder(j);
                  const isFavView = view === "favs";
                  const bankId = resolveBankId(j.company, j.source);
                  const isRejected = (j.stage ?? "applied") === "rejected";

                  return (
                    <motion.tr
                      key={j.id}
                      className={
                        "border-t border-border/60 " +
                        (isRejected
                          ? "bg-[color-mix(in_oklab,var(--color-destructive)_14%,transparent)]"
                          : "hover:bg-[color-mix(in_oklab,var(--color-primary)_7%,transparent)]")
                      }
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: Math.min(i * 0.02, 0.25),
                        duration: 0.25,
                      }}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={j.link}
                            target="_blank"
                            className="text-cyan-400 hover:underline"
                          >
                            {j.title}
                          </Link>
                          {remind && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-destructive text-destructive-foreground">
                              ⚠️ Relancer
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border border-destructive text-destructive">
                              Refusé
                            </span>
                          )}
                          <button
                            className="ml-1 text-xs text-muted-foreground hover:text-primary underline decoration-dotted underline-offset-4"
                            onClick={() =>
                              setOpenTimeline((m) => ({ ...m, [j.id]: !m[j.id] }))
                            }
                          >
                            Timeline
                          </button>
                        </div>
                        {openTimeline[j.id] && (
                          <div className="mt-3 border-t border-border pt-3">
                            <JobTimeline job={j} />
                          </div>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <BankAvatar
                            bankId={bankId}
                            name={j.company ?? j.source}
                            size={26}
                          />
                          <span>{j.company ?? j.source ?? "-"}</span>
                        </div>
                      </td>

                      <td className="p-3 capitalize">
                        <select
                          value={j.stage ?? "applied"}
                          onChange={(e) => {
                            setStage(j.id, e.target.value as any);
                            setItems(getAll());
                          }}
                          className="bg-surface border border-border rounded px-2 py-1 text-sm"
                        >
                          {["applied", "phone", "interview", "final", "offer", "rejected"].map(
                            (s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            )
                          )}
                        </select>
                      </td>

                      <td className="p-3">
                        <div className="inline-flex items-center gap-2">
                          <button
                            className="px-2 py-1 text-xs rounded border border-border hover:border-primary"
                            onClick={() => {
                              incInterviews(j.id, +1);
                              setItems(getAll());
                            }}
                          >
                            +1
                          </button>
                          <button
                            className="px-2 py-1 text-xs rounded border border-border hover:border-danger"
                            onClick={() => {
                              if ((j.interviews ?? 0) <= 0) return;
                              incInterviews(j.id, -1);
                              setItems(getAll());
                            }}
                          >
                            −1
                          </button>
                          <span>{j.interviews ?? 0}</span>
                        </div>
                      </td>

                      <td className="p-3 text-sm text-muted-foreground">
                        {j.appliedAt ? timeAgo(j.appliedAt) : "-"}
                      </td>

                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          {isFavView && (
                            <button
                              className="px-2 py-1 text-xs rounded border border-border hover:border-primary"
                              onClick={() => applyFromFav(j)}
                              title="Ajouter aux candidatures"
                            >
                              Candidater
                            </button>
                          )}
                          <button
                            className="px-2 py-1 text-xs rounded border border-border hover:border-danger"
                            onClick={() => {
                              clearJob(j.id);
                              setItems(getAll());
                            }}
                          >
                            Retirer
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination (uniquement si vue applied et il y a > PAGE_SIZE éléments) */}
        {view === "applied" && totalRowsForApplied > PAGE_SIZE && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Page {page} / {totalAppliedPages}
            </div>
            <Pagination
              page={page}
              totalPages={totalAppliedPages}
              onChange={setPage}
            />
          </div>
        )}
      </Card>

      {/* Modal calendrier compact */}
      <CalendarModal
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        compact
      />
    </main>
  );
}

/* ==== UI helpers ==== */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-[var(--glow-weak)]">
      <div className="mb-3 text-sm text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}
function CardStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 hover:shadow-[var(--glow-strong)] transition-shadow">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-border bg-card p-1">
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            className={`px-3 h-9 rounded-lg transition ${
              active
                ? "bg-primary text-background shadow-[var(--glow-weak)]"
                : "text-foreground hover:bg-[color-mix(in_oklab,var(--color-primary)_12%,transparent)]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
function PrefsToggle({
  prefs,
  setPrefs,
}: {
  prefs: Prefs;
  setPrefs: (p: Prefs) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        className="px-3 h-9 rounded-lg border border-border bg-surface hover:border-primary"
        onClick={() => setOpen((o) => !o)}
      >
        Widgets
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-card p-3 z-10 shadow-[var(--glow-weak)]">
          {[
            ["showKPIs", "KPIs"],
            ["showTopByBank", "Top banques"],
            ["showTimeSeries", "Time series"],
            ["showReminders", "Rappels (7j)"],
          ].map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                checked={(prefs as any)[k]}
                onChange={(e) =>
                  setPrefs({ ...prefs, [k]: e.target.checked } as any)
                }
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "px-3 py-1 rounded-full border text-sm " +
        (active
          ? "border-primary bg-[color-mix(in_oklab,var(--color-primary)_18%,transparent)]"
          : "border-border hover:border-primary")
      }
    >
      {children}
    </button>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const go = (p: number) => onChange(Math.max(1, Math.min(totalPages, p)));

  // pages autour de la page courante (simple & clean)
  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="inline-flex items-center gap-1">
      <button
        className="px-2 h-8 rounded border border-border disabled:opacity-50"
        disabled={!canPrev}
        onClick={() => go(page - 1)}
      >
        ←
      </button>
      {start > 1 && (
        <>
          <button className="px-2 h-8 rounded border border-border" onClick={() => go(1)}>
            1
          </button>
          {start > 2 && <span className="px-1 text-sm">…</span>}
        </>
      )}
      {pages.map((p) => (
        <button
          key={p}
          className={
            "px-2 h-8 rounded border " +
            (p === page
              ? "border-primary bg-[color-mix(in_oklab,var(--color-primary)_18%,transparent)]"
              : "border-border hover:border-primary")
          }
          onClick={() => go(p)}
        >
          {p}
        </button>
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="px-1 text-sm">…</span>}
          <button
            className="px-2 h-8 rounded border border-border"
            onClick={() => go(totalPages)}
          >
            {totalPages}
          </button>
        </>
      )}
      <button
        className="px-2 h-8 rounded border border-border disabled:opacity-50"
        disabled={!canNext}
        onClick={() => go(page + 1)}
      >
        →
      </button>
    </div>
  );
}
