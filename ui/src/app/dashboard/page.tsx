"use client";

import { useEffect, useMemo, useState } from "react";
import { getAll, stats, byBank, weeklyApplied, clearJob, type SavedJob, setStage, incInterviews } from "@/lib/tracker";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell
} from "recharts";

const COLORS = ["#7aa2f7","#bb9af7","#9ece6a","#e0af68","#f7768e","#b4f9f8"];

export default function DashboardPage() {
  const [items, setItems] = useState<SavedJob[]>([]);

  useEffect(() => { setItems(getAll()); }, []);

  const s = useMemo(() => stats(), [items]);
  const banks = useMemo(() => byBank(), [items]);
  const weekly = useMemo(() => weeklyApplied(10), [items]);

  const funnel = [
    { name: "Candidatures", value: s.total },
    { name: "Réponses", value: Math.round(s.total * (s.responseRate/100)) },
    { name: "Shortlists", value: banks.reduce((a,b)=> a + b.shortlist, 0) },
    { name: "Offres", value: s.offer },
  ];

  return (
    <main className="container mx-auto px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      <h1 className="text-3xl font-semibold tracking-tight">Dashboard candidatures</h1>

      {/* KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <CardStat label="Total" value={s.total} />
        <CardStat label="Réponse %" value={s.responseRate + "%"} />
        <CardStat label="Entretiens" value={s.interviews} />
        <CardStat label="Tps réponse moyen" value={s.timeToResponse + " j"} />
      </section>

      {/* Graphs principaux */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* A: Réponses par banque (barres) */}
        <Card title="Taux de réponse par banque">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={banks.slice(0,12)} margin={{left: -20}}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="bank" tick={{fontSize: 12}} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="responseRate" name="Réponse %" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* B: Funnel candidatures */}
        <Card title="Funnel">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={funnel}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" name="Volume" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* C: Candidatures par semaine */}
        <Card title="Candidatures / semaine">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={weekly}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="week" tick={{fontSize: 11}} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" name="Candidatures" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </section>

      {/* Tableau banque détail */}
      <Card title="Performance par banque">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="text-left text-sm text-muted-foreground">
              <tr>
                <th className="p-3">Banque</th>
                <th className="p-3">Candidatures</th>
                <th className="p-3">Réponse %</th>
                <th className="p-3">Shortlist %</th>
                <th className="p-3">Offre %</th>
                <th className="p-3">Entretiens</th>
              </tr>
            </thead>
            <tbody>
              {banks.length === 0 ? (
                <tr><td className="p-4 text-muted-foreground" colSpan={6}>Aucune donnée.</td></tr>
              ) : banks.map((b) => (
                <tr key={b.bank} className="border-t border-border/60 hover:bg-muted/30">
                  <td className="p-3">{b.bank}</td>
                  <td className="p-3">{b.total}</td>
                  <td className="p-3">{b.responseRate}%</td>
                  <td className="p-3">{b.shortlistRate}%</td>
                  <td className="p-3">{b.hitRate}%</td>
                  <td className="p-3">{b.interviews}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Historique brut + quick actions */}
      <Card title="Historique (local)">
        <HistoryTable items={items} refresh={()=>setItems(getAll())} />
      </Card>
    </main>
  );
}

/* ============ Components ============ */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 text-sm text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

function CardStat({ label, value }: { label: string; value: number|string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function HistoryTable({ items, refresh }: { items: SavedJob[]; refresh: ()=>void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="text-left text-sm text-muted-foreground">
          <tr>
            <th className="p-3">Poste</th>
            <th className="p-3">Banque</th>
            <th className="p-3">Étape</th>
            <th className="p-3">Entretiens</th>
            <th className="p-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr><td className="p-4 text-muted-foreground" colSpan={5}>Rien pour l’instant. Marque des offres depuis la liste.</td></tr>
          ) : items.map((j) => (
            <tr key={j.id} className="border-t border-border/60 hover:bg-muted/30">
              <td className="p-3">
                <Link href={j.link} target="_blank" className="text-cyan-400 hover:underline">{j.title}</Link>
              </td>
              <td className="p-3">{j.company ?? j.source}</td>
              <td className="p-3 capitalize">
                <select
                  value={j.stage}
                  onChange={(e) => { setStage(j.id, e.target.value as any); refresh(); }}
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
                    onClick={() => { incInterviews(j.id, +1); refresh(); }}
                  >+1</button>
                  <span>{j.interviews ?? 0}</span>
                </div>
              </td>
              <td className="p-3 text-right">
                <button
                  className="px-2 py-1 text-xs rounded border border-border hover:border-danger"
                  onClick={() => { clearJob(j.id); refresh(); }}
                >
                  Supprimer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
