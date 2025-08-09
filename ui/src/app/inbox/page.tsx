// ui/src/app/inbox/page.tsx
"use client";

import { useEffect, useState } from "react";
import * as Alerts from "@/lib/alerts";

export default function InboxPage() {
  const [alerts, setAlerts] = useState<Alerts.Alert[]>([]);

  useEffect(() => {
    setAlerts(Alerts.getAll());
  }, []);

  const markAsRead = (id: string) => {
    Alerts.markRead(id);
    setAlerts(Alerts.getAll());
  };

  const remove = (id: string) => {
    Alerts.remove(id);
    setAlerts(Alerts.getAll());
  };

  return (
    <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight neon-title">Inbox</h1>
      {alerts.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-muted-foreground">
          Aucune alerte pour l’instant. Depuis la recherche, clique sur <b>“Sauver comme alerte”</b>.
        </div>
      ) : (
        <ul className="space-y-3">
          {alerts.map((a) => (
            <li key={a.id} className="rounded-xl border border-border bg-surface p-4 flex items-center justify-between">
              <div className="min-w-0">
                <div className="font-medium truncate">{a.name}</div>
                <div className="text-sm text-muted-foreground mt-1 truncate">
                  {[
                    a.query.keyword ? `Mot-clé: ${a.query.keyword}` : null,
                    a.query.banks?.length ? `Banques: ${a.query.banks.join(", ")}` : null,
                    a.query.categories?.length ? `Métiers: ${a.query.categories.join(", ")}` : null,
                    a.query.contractTypes?.length ? `Contrats: ${a.query.contractTypes.join(", ")}` : null,
                  ]
                    .filter(Boolean)
                    .join(" • ") || "Tous résultats"}
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <button
                  onClick={() => markAsRead(a.id)}
                  className="px-3 h-9 rounded-lg border border-border bg-surface hover:border-primary"
                  title="Marquer comme lu"
                >
                  Marquer lu
                </button>
                <button
                  onClick={() => remove(a.id)}
                  className="px-3 h-9 rounded-lg border border-border hover:border-danger"
                  title="Supprimer"
                >
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
