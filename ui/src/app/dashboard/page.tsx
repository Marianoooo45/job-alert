"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BankAvatar from "@/components/BankAvatar";
import { getAll, setStage, incInterviews, clearJob, type SavedJob } from "@/lib/tracker";
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, Legend,
} from "recharts";
import { motion } from "framer-motion";

/* =========================
   Helpers (format & colors)
   ========================= */

function timeAgo(ts?: number | string) {
  if (!ts) return "-";
  const d = typeof ts === "string" ? new Date(ts) : new Date(ts);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 48) return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  return `il y a ${j} j`;
}

// couleurs issues des CSS variables (Tokyo Night)
const CSS = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const palette = () => ({
  primary: CSS("--color-primary") || "hsl(var(--primary))",
  secondary: CSS("--color-secondary") || "hsl(var(--secondary))",
  text: CSS("--color-foreground") || "hsl(var(--foreground))",
  grid: "rgba(255,255,255,.12)",
});

/* =========================
   Page
   ========================= */

export default function DashboardPage() {
  const [items, setItems] = useState<SavedJob[]>([]);
  useEffect(() => { setItems(getAll()); }, []);

  // Favoris uniquement = status === "shortlist"
  const favs = useMemo(() => items.filter(i => i.status === "shortlist"), [items]);

  // KPIs
  const kpis = useMemo(() => {
    const banks = new Set<string>();
    let interviews = 0;
    let lastAdded: number | undefined;

    favs.forEach(f => {
      if (f.company) banks.add(f.company);
      if (f.interviews) interviews += f.interviews;
      if (!lastAdded || (f.appliedAt && +f.appliedAt > lastAdded)) lastAdded = f.appliedAt ? +f.appliedAt : lastAdded;
    });

    return {
      total: favs.length,
      distinctBanks: banks.size,
      interviews,
      lastAdded: lastAdded ? timeAgo(lastAdded) : "-",
    };
  }, [favs]);

  // Graph: favoris par banque (Top 12)
  const topByBank = useMemo(() => {
    const map = new Map<string, number>();
    favs.forEach(f => {
      const key = f.company ?? f.source ?? "Autre";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([bank, count]) => ({ bank, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [favs]);

  // Graph: favoris par semaine (4 derniers mois)
  const weekly = useMemo(() => {
    const buckets = new Map<string, number>(); // YYYY-WW -> count
    const weekKey = (d: Date) => {
      const date = new Date(d);
      // ISO week
      const dayNum = (date.getUTCDay() + 6) % 7;
      date.setUTCDate(date.getUTCDate() - dayNum + 3);
      const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
      const week = 1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86400000 - 3) / 7);
      const year = date.getUTCFullYear();
      return `${year}-W${String(week).padStart(2, "0")}`;
    };
    favs.forEach(f => {
      const d = f.appliedAt ? new Date(f.appliedAt) : undefined;
      if (!d) return;
      const key = weekKey(d);
      buckets.set(key, (buckets.get(key) || 0) + 1);
    });
    return Array.from(buckets.entries())
      .map(([week, value]) => ({ week, value }))
      .sort((a, b) => (a.week > b.week ? 1 : -1));
  }, [favs]);

  const colors = typeof window !== "undefined" ? palette() : { primary: "#bb9af7", secondary: "#f7768e", text: "#c0caf5", grid: "rgba(255,255,255,.12)" };

  return (
    <main className="container mx-auto px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      <motion.h1
        className="text-3xl sm:text-4xl font-semibold tracking-tight neon-title"
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4 }}
      >
        Dashboard <span className="text-primary">Favoris</span> ⭐
      </motion.h1>

      {/* KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <CardStat label="Favoris" value={kpis.total} />
        <CardStat label="Banques différentes" value={kpis.distinctBanks} />
        <CardStat label="Entretiens (cumul)" value={kpis.interviews} />
        <CardStat label="Dernier ajout" value={kpis.lastAdded} />
      </section>

      {/* Graphs */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* A: Top banques */}
        <Card title="Top banques (favoris)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topByBank} margin={{ left: -20 }}>
              <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
              <XAxis dataKey="bank" tick={{ fontSize: 12, fill: colors.text }} />
              <YAxis tick={{ fill: colors.text }} />
              <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }} />
              <Bar dataKey="count" name="Favoris" fill={colors.primary} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* B: Time series */}
        <Card title="Favoris par semaine">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={weekly}>
              <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: colors.text }} />
              <YAxis allowDecimals={false} tick={{ fill: colors.text }} />
              <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }} />
              <Legend />
              <Line type="monotone" dataKey="value" name="Favoris" stroke={colors.secondary} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* C: Placeholder next features */}
        <Card title="À venir">
          <div className="h-[260px] grid place-items-center text-sm text-muted-foreground">
            Scatter “temps de réponse par banque”, Export CSV, Rappels, Notes…
          </div>
        </Card>
      </section>

      {/* Table détails favoris */}
      <Card title="Favoris (liste)">
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
              {favs.length === 0 ? (
                <tr><td className="p-4 text-muted-foreground" colSpan={6}>Aucun favori pour l’instant. ⭐ Ajoute depuis la liste d’offres.</td></tr>
              ) : favs.map((j, i) => (
                <motion.tr
                  key={j.id}
                  className="border-t border-border/60 hover:bg-[color-mix(in_oklab,var(--color-primary)_7%,transparent)]"
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.25), duration: .25 }}
                >
                  <td className="p-3">
                    <Link href={j.link} target="_blank" className="text-cyan-400 hover:underline">{j.title}</Link>
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
                      {["applied","phone","interview","final","offer","rejected"].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <div className="inline-flex items-center gap-2">
                      <button
                        className="px-2 py-1 text-xs rounded border border-border hover:border-primary"
                        onClick={() => { incInterviews(j.id, +1); setItems(getAll()); }}
                      >+1</button>
                      <span>{j.interviews ?? 0}</span>
                    </div>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">{j.appliedAt ? timeAgo(j.appliedAt) : "-"}</td>
                  <td className="p-3 text-right">
                    <button
                      className="px-2 py-1 text-xs rounded border border-border hover:border-danger"
                      onClick={() => { clearJob(j.id); setItems(getAll()); }}
                    >
                      Retirer
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}

/* =========================
   UI helpers
   ========================= */

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
