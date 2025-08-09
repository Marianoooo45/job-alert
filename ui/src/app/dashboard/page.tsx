// ui/src/app/dashboard/page.tsx
// ui/src/app/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BankAvatar from "@/components/BankAvatar";
import JobTimeline from "@/components/JobTimeline";
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

/* ======= Ajout : si tu as un composant CalendarModal, on l'importe ======= */
// Si ton calendrier est ailleurs, garde seulement le wrapper .dashboard-calendar autour
import CalendarModal from "@/components/CalendarModal"; // <= garde ce chemin si c'est déjà ton composant

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

  /* ======= Ajout : ouverture calendrier ======= */
  const [calOpen, setCalOpen] = useState(false);

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
          {/* ===== bouton calendrier compact ===== */}
          <button
            onClick={() => setCalOpen(true)}
            className="px-3 h-9 rounded-lg border border-border bg-surface hover:border-primary"
            title="Calendrier"
          >
            Calendrier 📅
          </button>
          <PrefsToggle prefs={prefs} setPrefs={setPrefs} />
          {view === "applied" && (
            <button onClick={exportCSV} className="px-3 h-9 rounded-lg border border-border bg-surface hover:border-primary" title="Exporter les candidatures (CSV)">
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* … (le reste de la page : KPIs, charts, liste — inchangé) … */}

      {/* ====== MODAL CALENDRIER EN MODE COMPACT ====== */}
      {calOpen && (
        <div className="dashboard-calendar">
          {/* 
            IMPORTANT :
            - on garde ton composant existant (drag & drop, etc.)
            - on n’ajoute que des classes utilitaires pour activer les styles compacts
          */}
          <CalendarModal
            open={calOpen}
            onClose={() => setCalOpen(false)}
            classNames={{
              shell: "cal-shell",        // wrapper transform/scale
              surface: "cal-surface",    // scroll + max-height
              card: "cal-card",
              title: "cal-title",
              subtitle: "cal-subtitle",
              list: "cal-list",
              chip: "cal-chip",
              btn: "cal-btn",
              input: "cal-input",
              stack: "cal-stack",
              gridCell: "cal-grid-cell",
              popover: "cal-popover",
            }}
          />
        </div>
      )}
    </main>
  );
}

/* ==== UI helpers (inchangé) ==== */
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
