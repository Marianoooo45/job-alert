// ui/src/app/inbox/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import * as Alerts from "@/lib/alerts";
import AlertModal from "@/components/AlertModal";

type Job = {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  link: string;
  posted: string;
  source: string;
};

function qsFromAlert(a: Alerts.Alert) {
  const p = new URLSearchParams();
  if (a.query.keywords?.length) p.set("keyword", a.query.keywords.join(" "));
  (a.query.banks ?? []).forEach((b) => p.append("bank", b));
  (a.query.categories ?? []).forEach((c) => p.append("category", c));
  (a.query.contractTypes ?? []).forEach((ct) => p.append("contractType", ct));
  p.set("limit", "200");
  p.set("offset", "0");
  return p;
}

export default function InboxPage() {
  const [alerts, setAlerts] = useState<Alerts.Alert[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [editOpen, setEditOpen] = useState(false);

  const selected = useMemo(
    () => alerts.find((a) => a.id === selectedId) ?? null,
    [alerts, selectedId]
  );

  // charger les alertes
  useEffect(() => {
    const all = Alerts.getAll();
    setAlerts(all);
    if (!selectedId && all.length) setSelectedId(all[0].id);
  }, []);

  // charger les jobs correspondant à l’alerte sélectionnée
  useEffect(() => {
    (async () => {
      if (!selected) {
        setJobs([]);
        return;
      }
      const res = await fetch(`/api/jobs?${qsFromAlert(selected).toString()}`, { cache: "no-store" });
      const arr = res.ok ? ((await res.json()) as Job[]) : [];
      setJobs(arr);
    })();
  }, [selectedId, alerts.length]); // re-fetch si la liste d’alertes évolue

  const remove = (id: string) => {
    Alerts.remove(id);
    const all = Alerts.getAll();
    setAlerts(all);
    if (selectedId === id) {
      setSelectedId(all[0]?.id ?? null);
      setJobs([]);
    }
  };

  const markAllReadForSelected = () => {
    if (!selected) return;
    Alerts.markRead(selected.id);
    setAlerts(Alerts.getAll());
  };

  return (
    <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight neon-title mb-6">Inbox</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
        {/* Colonne : liste des alertes */}
        <aside className="rounded-xl border border-border bg-surface">
          <div className="px-4 py-3 border-b border-border/60 text-sm text-muted-foreground">
            Mes alertes
          </div>
          <ul className="max-h-[70vh] overflow-auto">
            {alerts.map((a) => (
              <li key={a.id} className="border-b border-border/50 last:border-none">
                <button
                  onClick={() => setSelectedId(a.id)}
                  className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-muted/40 transition ${
                    a.id === selectedId ? "bg-muted/50" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{a.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {[
                        a.query.keywords?.length ? `#${a.query.keywords.join(" #")}` : null,
                        a.query.banks?.length ? `${a.query.banks.length} banque(s)` : null,
                        a.query.categories?.length ? `${a.query.categories.length} métier(s)` : null,
                        a.query.contractTypes?.length ? `${a.query.contractTypes.length} contrat(s)` : null,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </div>
                  </div>
                </button>

                {/* Actions “modifier/supprimer” */}
                <div className="px-4 pb-3 pt-1 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedId(a.id);
                      setEditOpen(true);
                    }}
                    className="h-9 px-3 rounded-lg border border-border hover:border-primary"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => remove(a.id)}
                    className="h-9 px-3 rounded-lg border border-border hover:border-danger"
                  >
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
            {alerts.length === 0 && (
              <li className="px-4 py-6 text-sm text-muted-foreground">
                Aucune alerte. Clique la cloche ➜ “Créer une alerte”.
              </li>
            )}
          </ul>
        </aside>

        {/* Colonne : résultats de l’alerte sélectionnée */}
        <section className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Résultats</div>
              <div className="text-lg font-semibold">{selected?.name ?? "—"}</div>
            </div>
            {selected && (
              <div className="flex items-center gap-2">
                <button
                  onClick={markAllReadForSelected}
                  className="h-9 px-3 rounded-lg border border-border hover:border-primary"
                >
                  Marquer tout lu
                </button>
              </div>
            )}
          </div>

          <div className="p-4">
            {!selected ? (
              <div className="text-muted-foreground">Sélectionne une alerte à gauche.</div>
            ) : jobs.length === 0 ? (
              <div className="text-muted-foreground">Aucune offre pour le moment.</div>
            ) : (
              <ul className="space-y-3">
                {jobs.map((job) => {
                  const isNew =
                    selected && new Date(job.posted).getTime() > (selected.lastReadAt || 0);
                  return (
                    <li
                      key={job.id}
                      className="rounded-lg border border-border p-3 flex items-start justify-between"
                    >
                      <div className="min-w-0">
                        <a
                          href={job.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium hover:underline text-cyan-400"
                          onClick={() => {
                            // 👇 marquer lu quand on clique un résultat
                            if (selected) {
                              Alerts.markRead(selected.id);
                              setAlerts(Alerts.getAll());
                            }
                          }}
                        >
                          {job.title}
                        </a>
                        <div className="text-sm text-muted-foreground">
                          {job.company ?? job.source} — {job.location ?? "—"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Publié : {new Date(job.posted).toLocaleString()}
                        </div>
                      </div>
                      {isNew && (
                        <span className="ml-3 shrink-0 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs">
                          Nouveau
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* Modale édition (pré-remplie) */}
      {selected && (
        <AlertModal
          open={editOpen}
          onClose={() => {
            setEditOpen(false);
            const all = Alerts.getAll();
            setAlerts(all);
          }}
          defaultValues={selected.query}
          // @ts-expect-error: prop custom pour édition
          editAlert={selected}
        />
      )}
    </main>
  );
}
