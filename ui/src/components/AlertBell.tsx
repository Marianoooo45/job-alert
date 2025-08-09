// ui/src/components/AlertBell.tsx 
"use client";

import { useEffect, useMemo, useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Bell, Plus, ArrowRight } from "lucide-react";
import * as Alerts from "@/lib/alerts";
import Link from "next/link";
import AlertModal from "./AlertModal";

type Job = {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  link: string;
  posted: string;
  source: string;
};

async function fetchPreview(query: Alerts.Alert["query"], limit = 4): Promise<Job[]> {
  try {
    const params = new URLSearchParams();
    // ⬇️ ton API accepte 1 seul 'keyword' → on joint les tags par espace
    if (query.keywords?.length) params.set("keyword", query.keywords.join(" "));
    (query.banks ?? []).forEach(b => params.append("bank", b));
    (query.categories ?? []).forEach(c => params.append("category", c));
    (query.contractTypes ?? []).forEach(ct => params.append("contractType", ct));
    params.set("limit", String(limit));
    params.set("offset", "0");

    const res = await fetch(`/api/jobs?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error("fetch failed");
    const data = (await res.json()) as Job[];
    return data;
  } catch {
    return [];
  }
}

export default function AlertBell() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alerts.Alert[]>([]);
  const [previews, setPreviews] = useState<Record<string, Job[]>>({});
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setAlerts(Alerts.getAll());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const map: Record<string, Job[]> = {};
      for (const a of alerts) {
        map[a.id] = await fetchPreview(a.query, 4);
      }
      if (!cancelled) setPreviews(map);
    })();
    return () => { cancelled = true; };
  }, [alerts]);

  const count = useMemo(() => alerts.length, [alerts]);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition">
            <Bell size={20} />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
                {count}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent sideOffset={10} className="w-[360px] p-0 neon-dropdown pop-anim">
          <div className="border-b border-border/60 px-4 py-3">
            <div className="text-sm text-muted-foreground">Notifications</div>
            <div className="text-base font-medium">Alertes d’offres</div>
          </div>

          <div className="max-h-[50vh] overflow-auto">
            {alerts.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">Aucune alerte. Crée ta première !</div>
            ) : alerts.map((a) => (
              <div key={a.id} className="px-4 py-3 border-b border-border/60">
                <div className="text-sm font-medium mb-1">{a.name}</div>
                {a.query.keywords?.length ? (
                  <div className="text-xs text-muted-foreground mb-2">
                    {a.query.keywords.map(k => <span key={k} className="mr-2">#{k}</span>)}
                  </div>
                ) : null}
                {previews[a.id]?.length ? (
                  <ul className="space-y-1">
                    {previews[a.id].slice(0, 4).map(job => (
                      <li key={job.id} className="text-sm">
                        <a href={job.link} target="_blank" className="text-cyan-400 hover:underline">
                          {job.title}
                        </a>
                        <span className="text-muted-foreground"> — {job.company ?? job.source}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-muted-foreground">— Rien de neuf.</div>
                )}
              </div>
            ))}
          </div>

          <div className="px-4 py-3 flex items-center justify-between">
            <button
              className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border hover:border-primary"
              onClick={() => setModalOpen(true)}
            >
              <Plus className="w-4 h-4" /> Créer une alerte
            </button>
            <Link
              href="/inbox"
              className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border hover:border-primary"
              onClick={() => setOpen(false)}
            >
              Tout voir <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </PopoverContent>
      </Popover>

      <AlertModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setAlerts(Alerts.getAll()); // refresh la liste après création
        }}
      />
    </>
  );
}
