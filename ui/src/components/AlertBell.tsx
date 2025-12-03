"use client";

import { useEffect, useMemo, useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Bell, Plus, ArrowRight, Activity } from "lucide-react";
import * as Alerts from "@/lib/alerts";
import Link from "next/link";
import AlertModal from "./AlertModal";
import { useRouter } from "next/navigation";

// ... (fetchMatching et type Job inchangés, je les inclus pour que le code soit complet)
type Job = { id: string; title: string; company: string | null; location: string | null; link: string; posted: string; source: string; };
async function fetchMatching(query: Alerts.Alert["query"], limit = 100): Promise<Job[]> {
  try {
    const params = new URLSearchParams();
    const kws = Alerts.normalizeKeywords(query?.keywords) ?? [];
    if (kws.length) params.set("keyword", kws.join(" "));
    (query?.banks ?? []).forEach((b) => params.append("bank", b));
    (query?.categories ?? []).forEach((c) => params.append("category", c));
    (query?.contractTypes ?? []).forEach((ct) => params.append("contractType", ct));
    params.set("limit", String(limit));
    params.set("offset", "0");
    const res = await fetch(`/api/jobs?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error("fetch failed");
    return (await res.json()) as Job[];
  } catch { return []; }
}

export default function AlertBell({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alerts.Alert[]>([]);
  const [previews, setPreviews] = useState<Record<string, Job[]>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [isLogged, setIsLogged] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/me", { credentials: "include", cache: "no-store" });
        const j = r.ok ? await r.json().catch(() => null) : null;
        if (alive) setIsLogged(Boolean(j?.user || j?.authenticated));
      } catch { if (alive) setIsLogged(false); }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => { if (!isLogged) return; setAlerts(Alerts.getAll() ?? []); }, [isLogged]);
  useEffect(() => { if (!isLogged) return; const off = Alerts.onChange(() => setAlerts(Alerts.getAll() ?? [])); return off; }, [isLogged]);

  useEffect(() => {
    if (!isLogged) return;
    let cancelled = false;
    (async () => {
      const map: Record<string, Job[]> = {};
      let totalUnread = 0;
      for (const a of alerts) {
        const jobs = await fetchMatching(a.query, 12);
        map[a.id] = jobs.slice(0, 4);
        const seen = new Set(a.seenJobIds ?? []);
        const unseenCount = jobs.filter((j) => !seen.has(j.id)).length;
        totalUnread += unseenCount;
      }
      if (!cancelled) { setPreviews(map); setUnreadTotal(totalUnread); }
    })();
    return () => { cancelled = true; };
  }, [alerts, isLogged]);

  const badge = useMemo(() => (unreadTotal > 9 ? "9+" : unreadTotal), [unreadTotal]);

  const openCreate = () => {
    if (!isLogged) { router.push(`/login?next=/inbox`); return; }
    setOpen(false); setTimeout(() => setModalOpen(true), 0);
  };

  if (isLogged === null) return <div className="w-9 h-9" />;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={`relative flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all ${className ?? ""}`}
            aria-label="Notifications"
            onClick={!isLogged ? () => router.push(`/login?next=/inbox`) : undefined}
          >
            <Bell size={18} />
            {unreadTotal > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]" />
            )}
          </button>
        </PopoverTrigger>

        {isLogged && (
          <PopoverContent sideOffset={8} align="end" className="w-[380px] p-0 bg-popover/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl text-foreground overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-muted/50">
              <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Live Alerts
              </span>
              {unreadTotal > 0 && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">{badge} new</span>}
            </div>

            {/* List */}
            <div className="max-h-[300px] overflow-y-auto custom-scroll">
              {alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center px-6">
                  <span className="text-sm text-muted-foreground mb-2">Aucune alerte configurée</span>
                  <button onClick={openCreate} className="text-xs text-indigo-400 hover:text-indigo-300 underline">Créer ma première alerte</button>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {alerts.map((a) => (
                    <div key={a.id} className="p-3 hover:bg-foreground/[0.02] transition-colors">
                      <div className="flex justify-between items-baseline mb-2">
                        <h4 className="text-sm font-medium text-foreground truncate pr-2">{a.name}</h4>
                        <span className="text-[10px] text-muted-foreground font-mono">{(previews[a.id]??[]).length} hits</span>
                      </div>
                      <div className="space-y-1">
                        {(previews[a.id] ?? []).slice(0, 3).map((job) => {
                          const isSeen = (a.seenJobIds ?? []).includes(job.id);
                          return (
                            <a
                              key={job.id}
                              href={job.link}
                              target="_blank"
                              onClick={() => Alerts.markJobSeen(a.id, job.id)}
                              className={`block text-xs truncate transition-colors ${isSeen ? "text-muted-foreground" : "text-foreground hover:text-primary"}`}
                            >
                              {!isSeen && <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 mr-2" />}
                              {job.title}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-border grid grid-cols-2 gap-2 bg-surface-muted/50">
              <button onClick={openCreate} className="flex items-center justify-center gap-2 h-8 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors">
                <Plus className="w-3 h-3" /> Nouvelle Alerte
              </button>
              <Link href="/inbox" onClick={() => setOpen(false)} className="flex items-center justify-center gap-2 h-8 rounded text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">
                Voir Inbox <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </PopoverContent>
        )}
      </Popover>

      <AlertModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}