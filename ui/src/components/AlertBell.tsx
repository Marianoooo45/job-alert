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

async function fetchMatching(query: Alerts.Alert["query"], limit = 100): Promise<Job[]> {
  try {
    const params = new URLSearchParams();
    const kws = Alerts.normalizeKeywords(query.keywords) ?? [];
    if (kws.length) params.set("keyword", kws.join(" "));
    (query.banks ?? []).forEach((b) => params.append("bank", b));
    (query.categories ?? []).forEach((c) => params.append("category", c));
    (query.contractTypes ?? []).forEach((ct) => params.append("contractType", ct));
    params.set("limit", String(limit));
    params.set("offset", "0");
    const res = await fetch(`/api/jobs?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error("fetch failed");
    return (await res.json()) as Job[];
  } catch {
    return [];
  }
}

export default function AlertBell({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alerts.Alert[]>([]);
  const [previews, setPreviews] = useState<Record<string, Job[]>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);

  // charge initial
  useEffect(() => {
    setAlerts(Alerts.getAll());
  }, []);

  // s’abonne aux changements globaux (Inbox, modale, etc.)
  useEffect(() => {
    const off = Alerts.onChange(() => {
      setAlerts(Alerts.getAll());
    });
    return off;
  }, []);

  // recalc previews + badge à chaque changement d’alertes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const map: Record<string, Job[]> = {};
      let totalUnread = 0;

      for (const a of alerts) {
        const jobs = await fetchMatching(a.query, 12); // 4 preview + marge
        map[a.id] = jobs.slice(0, 4);

        const seen = new Set(a.seenJobIds ?? []);
        const unseenCount = jobs.filter((j) => !seen.has(j.id)).length;
        totalUnread += unseenCount;
      }

      if (!cancelled) {
        setPreviews(map);
        setUnreadTotal(totalUnread);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [alerts]);

  const badge = useMemo(() => (unreadTotal > 9 ? "9+" : unreadTotal), [unreadTotal]);

  const openCreate = () => {
    setOpen(false);
    setTimeout(() => setModalOpen(true), 0);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
  <button
    className="nav-icon-link neon-underline neon-underline--icon relative"
    aria-label="Notifications"
  >
    <Bell size={18} />
    {unreadTotal > 0 && (
      <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
        {badge}
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
              <div className="px-4 py-6 text-sm text-muted-foreground">
                Aucune alerte. Crée ta première !
              </div>
            ) : (
              alerts.map((a) => (
                <div key={a.id} className="px-4 py-3 border-b border-border/60">
                  <div className="text-sm font-medium">
                    {a.name}
                    {Alerts.normalizeKeywords(a.query.keywords)?.length ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {Alerts.normalizeKeywords(a.query.keywords)!.map((k) => `#${k}`).join(" ")}
                      </span>
                    ) : null}
                  </div>

                  {previews[a.id]?.length ? (
                    <ul className="mt-2 space-y-1">
                      {previews[a.id].map((job) => {
                        const isSeen = (a.seenJobIds ?? []).includes(job.id);
                        return (
                          <li key={job.id} className="text-sm flex items-start gap-2">
                            {!isSeen && (
                              <span className="mt-1 inline-block shrink-0 rounded-full border border-primary/40 bg-primary/10 px-1.5 text-[10px]">
                                N
                              </span>
                            )}
                            <a
                              href={job.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-400 hover:underline"
                              onClick={() => {
                                Alerts.markJobSeen(a.id, job.id); // marque seulement cette annonce
                                // l’event global fera rafraîchir la cloche
                              }}
                            >
                              {job.title}
                            </a>{" "}
                            <span className="text-muted-foreground">— {job.company ?? job.source}</span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="text-sm text-muted-foreground mt-2">— Rien de neuf.</div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="px-4 py-3 flex items-center justify-between">
            <button
              className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border hover:border-primary"
              onClick={openCreate}
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

      {/* Modal portée au body */}
      <AlertModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          // pas besoin de setAlerts ici
        }}
      />
    </>
  );
}
