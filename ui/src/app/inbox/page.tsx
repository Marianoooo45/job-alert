"use client";
import { getAll, markRead, remove } from "@/lib/alerts";
import { useEffect, useState } from "react";

export default function InboxPage() {
  const [alerts, setAlerts] = useState(getAll());

  const handleMarkRead = (id: string) => {
    markRead(id);
    setAlerts(getAll());
  };

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Mes alertes</h1>
      {alerts.length === 0 && <p>Aucune alerte enregistrée.</p>}
      {alerts.map(a => (
        <div key={a.id} className="glass p-4 mb-3 rounded-lg flex justify-between">
          <div>
            <div className="font-semibold">{a.name}</div>
            <div className="text-sm opacity-70">
              Mots-clés : {a.query.keyword || "—"}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleMarkRead(a.id)} className="btn btn-primary">Marquer lu</button>
            <button onClick={() => { remove(a.id); setAlerts(getAll()); }} className="btn btn-secondary">Supprimer</button>
          </div>
        </div>
      ))}
    </div>
  );
}
