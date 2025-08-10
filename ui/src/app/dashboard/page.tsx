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
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, Legend,
} from "recharts";
import { motion } from "framer-motion";
import { Calendar as CalendarIcon } from "lucide-react";

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

const CSS = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const palette = () => ({
  primary: CSS("--color-primary") || "hsl(var(--primary))",
  secondary: CSS("--color-secondary") || "hsl(var(--secondary))",
  text: CSS("--color-foreground") || "hsl(var(--foreground))",
  grid: "rgba(255,255,255,.12)",
});

type Prefs = { showKPIs: boolean; showTopByBank: boolean; showTimeSeries: boolean; showReminders: boolean; };
const DEFAULT_PREFS: Prefs = { showKPIs: true, showTopByBank: true, showTimeSeries: true, showReminders: true };
const PREFS_KEY = "dashboard_prefs_v2";
const loadPrefs = () => { try { const raw = localStorage.getItem(PREFS_KEY); if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) }; } catch {} return DEFAULT_PREFS; };
const savePrefs = (p: Prefs) => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch {} };

type View = "favs" | "applied";

export default function DashboardPage() {
  const [items, setItems] = useState<SavedJob[]>([]);
  const [view, setView] = useState<View>("favs");
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [openTimeline, setOpenTimeline] = useState<Record<string, boolean>>({});

  // ⬇️ état pour le modal calendrier
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => { setItems(getAll()); setPrefs(loadPrefs()); }, []);
  useEffect(() => savePrefs(prefs), [prefs]);

  const colors = typeof window !== "undefined" ? palette() : { primary: "#bb9af7", secondary: "#f7768e", text: "#c0caf5", grid: "rgba(255,255,255,.12)" };

  const favs = useMemo(() => items.filter(i => i.status === "shortlist"), [items]);
  const applied = useMemo(() => items.filter(i => i.status === "applied"), [items]);

  const kpis = useMemo(() => {
    const rows = view === "favs" ? favs : applied;
    const banks = new Set<string>();
    let interviews = 0; let last: number | undefined;
    rows.forEach((r) => { if (r.company) banks.add(r.company); if (r.interviews) interviews += r.interviews; if (!last || (r.appliedAt && +r.appliedAt > last)) last = r.appliedAt ? +r.appliedAt : last; });
    return { total: rows.length, distinctBanks: banks.size, interviews, lastAdded: last ? timeAgo(last) : "-" };
  }, [view, favs, applied]);

  const topByBank = useMemo(() => {
    const src = view === "favs" ? favs : applied;
    const map = new Map<string, number>();
    src.forEach((f) => { const key = f.company ?? f.source ?? "Autre"; map.set(key, (map.get(key) || 0) + 1); });
    return Array.from(map.entries()).map(([bank, count]) => ({ bank, count })).sort((a, b) => b.count - a.count).slice(0, 12);
  }, [view, favs, applied]);

  const weekly = useMemo(() => {
    const src = view === "favs" ? favs : applied;
    const buckets = new Map<string, number>();
    const weekKey = (d: Date) => {
      const date = new Date(d);
      const dayNum = (date.getUTCDay() + 6) % 7;
      date.setUTCDate(date.getUTCDate() - dayNum + 3);
      const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
      const week = 1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86400000 - 3) / 7);
      const year = date.getUTCFullYear();
      return `${year}-W${String(week).padStart(2, "0")}`;
    };
    src.forEach((f) => { const d = f.appliedAt ? new Date(f.appliedAt) : undefined; if (!d) return; const key = weekKey(d); buckets.set(key, (buckets.get(key) || 0) + 1); });
    return Array.from(buckets.entries()).map(([week, value]) => ({ week, value })).sort((a, b) => (a.week > b.week ? 1 : -1));
  }, [view, favs, applied]);

  const reminders = useMemo(() => {
    const seven = 7 * 24 * 3600 * 1000;
    return applied
      .filter((a) => !a.respondedAt && a.appliedAt && Date.now() - Number(a.appliedAt) > seven)
      .sort((a, b) => Number(a.appliedAt) - Number(b.appliedAt))
      .slice(0, 15);
  }, [applied]);

  function exportCSV() {
    const rows = [
      ["id","title","company","location","link","appliedAt","stage","interviews"],
      ...applied.map((j) => [j.id, j.title, j.company ?? "", j.location ?? "", j.link ?? "", j.appliedAt ? new Date(Number(j.appliedAt)).toISOString() : "", j.stage ?? "", String(j.interviews ?? 0)]),
    ];
    const csv = rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "candidatures_applied.csv"; a.click(); URL.revokeObjectURL(url);
  }

  function applyFromFav(j: SavedJob) {
    setStatus({ id: j.id, title: j.title, company: j.company, location: j.location, link: j.link, posted: j.posted, source: j.source } as any, "applied" as any);
    setItems(getAll());
  }

  const isReminder = (j: SavedJob) =>
    j.status === "applied" && j.appliedAt && !j.respondedAt && (Date.now() - Number(j.appliedAt) > 7 * 24 * 3600 * 1000);

  return (
    <main className="container mx-auto px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <motion.h1 className="text-3xl sm:text-4xl font-semibold tracking-tight neon-title" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          Dashboard {view === "favs" ? (<><span className="text-primary">Favoris</span> ⭐</>) : (<><span className="text-primary">Candidatures</span> 📄</>)}
        </motion.h1>

        <div className="flex items-center gap-2">
          <SegmentedControl
            options={[{ key: "favs", label: "Favoris ⭐" }, { key: "applied", label: "Candidatures 📄" }]}
            value={view}
            onChange={(v) => setView(v as View)}
          />

          {/* ✅ bouton calendrier rétabli */}
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
            <button onClick={exportCSV} className="px-3 h-9 rounded-lg border border-border bg-surface hover:border-primary" title="Exporter les candidatures (CSV)">
              Export CSV
            </button>
          )}
        </div>
      </div>

      {prefs.showKPIs && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <CardStat label={view === "favs" ? "Favoris" : "Candidatures"} value={kpis.total} />
          <CardStat label="Banques différentes" value={kpis.distinctBanks} />
          <CardStat label="Entretiens (cumul)" value={kpis.interviews} />
          <CardStat label="Dernier ajout" value={kpis.lastAdded} />
        </section>
      )}

      <section className={`grid grid-cols-1 ${prefs.showTopByBank && prefs.showTimeSeries ? "lg:grid-cols-3" : "lg:grid-cols-2"} gap-6`}>
        {prefs.showTopByBank && (
          <Card title={`Top banques (${view === "favs" ? "favoris" : "applied"})`}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topByBank} margin={{ left: -20 }}>
                <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
                <XAxis dataKey="bank" tick={{ fontSize: 12, fill: colors.text }} />
                <YAxis tick={{ fill: colors.text }} />
                <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }} />
                <Bar dataKey="count" name="Volume" fill={colors.primary} radius={[6, 6, 0, 0]} />
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
                <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }} />
                <Legend />
                <Line type="monotone" dataKey="value" name={view === "favs" ? "Favoris" : "Candidatures"} stroke={colors.secondary} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {prefs.showReminders && view === "applied" && (
          <Card title="À relancer (7j sans réponse)">
            <div className="max-h-[260px] overflow-auto pr-2">
              {reminders.length === 0 ? (
                <div className="h-[220px] grid place-items-center text-sm text-muted-foreground">Rien à relancer pour l’instant.</div>
              ) : (
                <ul className="space-y-2">
                  {reminders.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 rounded border border-border px-3 py-2 hover:border-primary transition">
                      <div className="flex items-center gap-2 min-w-0">
                        <BankAvatar bankId={undefined} name={r.company ?? r.source} size={22} />
                        <span className="truncate">
                          {r.title} — <span className="text-muted-foreground">{r.company ?? r.source ?? "-"}</span>
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{r.appliedAt ? timeAgo(r.appliedAt) : "-"}</span>
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
              {(view === "favs" ? favs : applied).length === 0 ? (
                <tr><td className="p-4 text-muted-foreground" colSpan={6}>{view === "favs" ? "Aucun favori pour l’instant. ⭐ Ajoute depuis la liste d’offres." : "Aucune candidature enregistrée pour l’instant."}</td></tr>
              ) : (
                (view === "favs" ? favs : applied).map((j, i) => {
                  const remind = isReminder(j);
                  const isFavView = view === "favs";
                  return (
                    <motion.tr
                      key={j.id}
                      className="border-t border-border/60 hover:bg-[color-mix(in_oklab,var(--color-primary)_7%,transparent)]"
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.25), duration: .25 }}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Link href={j.link} target="_blank" className="text-cyan-400 hover:underline">{j.title}</Link>
                          {remind && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-destructive text-destructive-foreground">
                              ⚠️ Relancer
                            </span>
                          )}
                          <button
                            className="ml-1 text-xs text-muted-foreground hover:text-primary underline decoration-dotted underline-offset-4"
                            onClick={() => setOpenTimeline((m) => ({ ...m, [j.id]: !m[j.id] }))}
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
                          <BankAvatar bankId={undefined} name={j.company ?? j.source} size={26} />
                          <span>{j.company ?? j.source ?? "-"}</span>
                        </div>
                      </td>

                      <td className="p-3 capitalize">
                        <select
                          value={j.stage ?? "applied"}
                          onChange={(e) => { setStage(j.id, e.target.value as any); setItems(getAll()); }}
                          className="bg-surface border border-border rounded px-2 py-1 text-sm"
                        >
                          {["applied","phone","interview","final","offer","rejected"].map(s => (<option key={s} value={s}>{s}</option>))}
                        </select>
                      </td>

                      <td className="p-3">
                        <div className="inline-flex items-center gap-2">
                          <button className="px-2 py-1 text-xs rounded border border-border hover:border-primary" onClick={() => { incInterviews(j.id, +1); setItems(getAll()); }}>+1</button>
                          <span>{j.interviews ?? 0}</span>
                        </div>
                      </td>

                      <td className="p-3 text-sm text-muted-foreground">{j.appliedAt ? timeAgo(j.appliedAt) : "-"}</td>

                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          {isFavView && (
                            <button className="px-2 py-1 text-xs rounded border border-border hover:border-primary" onClick={() => applyFromFav(j)} title="Ajouter aux candidatures">
                              Candidater
                            </button>
                          )}
                          <button className="px-2 py-1 text-xs rounded border border-border hover:border-danger" onClick={() => { clearJob(j.id); setItems(getAll()); }}>
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
      </Card>

      {/* ✅ modal calendrier (compact) */}
      <CalendarModal open={calendarOpen} onClose={() => setCalendarOpen(false)} compact />
    </main>
  );
}

/* ==== UI helpers ==== */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-2xl border border-border bg-surface p-4 shadow-[var(--glow-weak)]">
    <div className="mb-3 text-sm text-muted-foreground">{title}</div>{children}
  </div>;
}
function CardStat({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-2xl border border-border bg-card p-4 hover:shadow-[var(--glow-strong)] transition-shadow">
    <div className="text-sm text-muted-foreground">{label}</div><div className="text-2xl font-semibold mt-1">{value}</div>
  </div>;
}
function SegmentedControl({ options, value, onChange }: { options: { key: string; label: string }[]; value: string; onChange: (v: string) => void; }) {
  return (
    <div className="inline-flex rounded-xl border border-border bg-card p-1">
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button key={o.key} onClick={() => onChange(o.key)}
            className={`px-3 h-9 rounded-lg transition ${active ? "bg-primary text-background shadow-[var(--glow-weak)]" : "text-foreground hover:bg-[color-mix(in_oklab,var(--color-primary)_12%,transparent)]"}`}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
function PrefsToggle({ prefs, setPrefs }: { prefs: Prefs; setPrefs: (p: Prefs) => void; }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button className="px-3 h-9 rounded-lg border border-border bg-surface hover:border-primary" onClick={() => setOpen((o) => !o)}>Widgets</button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-card p-3 z-10 shadow-[var(--glow-weak)]">
          {[
            ["showKPIs", "KPIs"],
            ["showTopByBank", "Top banques"],
            ["showTimeSeries", "Time series"],
            ["showReminders", "Rappels (7j)"],
          ].map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 py-1">
              <input type="checkbox" checked={(prefs as any)[k]} onChange={(e) => setPrefs({ ...prefs, [k]: e.target.checked } as any)} />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
