// ui/src/app/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { getAll, stats, clearJob, type SavedJob } from "@/lib/tracker";
import Link from "next/link";

type Filter = "all" | "applied" | "shortlist" | "rejected";

export default function DashboardPage() {
  const [items, setItems] = useState<SavedJob[]>([]);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => setItems(getAll()), []);
  const s = useMemo(() => stats(), [items]);
  const list = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.status === filter)),
    [items, filter]
  );

  return (
    <main className="container mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">Dashboard candidatures</h1>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <CardStat label="Total" value={s.total} />
        <CardStat label="Postulé" value={s.applied} />
        <CardStat label="Shortlist" value={s.shortlist} />
        <CardStat label="Refusé" value={s.rejected} />
      </div>

      <div className="mt-6 flex gap-2">
        {(["all","applied","shortlist","rejected"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded border ${filter===f ? "border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            {f === "all" ? "Tous" : f}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-border bg-surface overflow-x-auto">
        <table className="w-full">
          <thead className="text-left text-sm text-muted-foreground">
            <tr>
              <th className="p-3">Poste</th>
              <th className="p-3">Entreprise</th>
              <th className="p-3">Lieu</th>
              <th className="p-3">Statut</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td className="p-4 text-muted-foreground" colSpan={5}>Aucune donnée enregistrée.</td></tr>
            ) : (
              list.map((j) => (
                <tr key={j.id} className="border-t border-border/60 hover:bg-muted/30">
                  <td className="p-3">
                    <Link href={j.link} target="_blank" className="text-cyan-400 hover:underline">{j.title}</Link>
                  </td>
                  <td className="p-3">{j.company ?? "-"}</td>
                  <td className="p-3">{j.location ?? "-"}</td>
                  <td className="p-3 capitalize">{j.status}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => { clearJob(j.id); setItems(getAll()); }}
                      className="px-2 py-1 text-xs rounded border border-border hover:border-danger"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function CardStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
