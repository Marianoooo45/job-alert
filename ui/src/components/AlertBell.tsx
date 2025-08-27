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

    // keywords normalisés en amont avec fallback []
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

  useEffect(() => {
    // getAll doit toujours renvoyer un array
    setAlerts(Alerts.getAll() ?? []);
  }, []);

  useEffect(() => {
    const off = Alerts.onChange(() => setAlerts(Alerts.getAll() ?? []));
    return off;
  }, []);

  useEffect(() => {
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
    // évite un clash d’animation Popover/Modal
    setTimeout(() => setModalOpen(true), 0);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={`nav-bell neon-underline neon-underline--icon relative ${className ?? ""}`}
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadTotal > 0 && (
              <span className="badge-count absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
                {badge}
              </span>
            )}
          </button>
        </PopoverTrigger>

        {/* Fenêtre des alertes – couleurs + verre */}
        <PopoverContent sideOffset={10} className="notif-pop w-[360px] p-0 pop-anim">
          <div className="notif-pop__header">
            <div className="text-sm text-muted-foreground">Notifications</div>
            <div className="notif-pop__title text-base">Alertes d’offres</div>
          </div>

          <div className="notif-pop__list">
            {alerts.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">Aucune alerte. Crée ta première !</div>
            ) : (
              alerts.map((a) => {
                // ✅ calcule une seule fois, fallback []
                const kws = Alerts.normalizeKeywords(a?.query?.keywords) ?? [];

                return (
                  <div key={a.id} className="border-b border-border/60">
                    <div className="px-4 pt-3 text-sm font-medium">
                      {a.name}
                      {kws.length > 0 ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {kws.map((k: string) => `#${k}`).join(" ")}
                        </span>
                      ) : null}
                    </div>

                    {previews[a.id]?.length ? (
                      <ul className="mt-2 px-4 pb-3 space-y-1">
                        {(previews[a.id] ?? []).map((job) => {
                          const isSeen = (a.seenJobIds ?? []).includes(job.id);
                          return (
                            <li key={job.id} className="notif-pop__item">
                              {!isSeen && <span className="notif-pop__bullet" />}
                              <a
                                href={job.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => {
                                  Alerts.markJobSeen(a.id, job.id);
                                }}
                              >
                                {job.title}
                              </a>
                              <span className="notif-pop__meta"> — {job.company ?? job.source}</span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="px-4 pb-3 text-sm text-muted-foreground">— Rien de neuf.</div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="notif-pop__footer">
            <button className="btn-ghost" onClick={openCreate}>
              <Plus className="w-4 h-4" /> Créer une alerte
            </button>
            <Link href="/inbox" className="btn" onClick={() => setOpen(false)}>
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
        }}
      />
    </>
  );
}
