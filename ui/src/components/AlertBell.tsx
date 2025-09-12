// ui/src/components/AlertBell.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Bell, Plus, ArrowRight } from "lucide-react";
import * as Alerts from "@/lib/alerts";
import Link from "next/link";
import AlertModal from "./AlertModal";
import { useRouter } from "next/navigation";

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
      } catch {
        if (alive) setIsLogged(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!isLogged) return;
    setAlerts(Alerts.getAll() ?? []);
  }, [isLogged]);

  useEffect(() => {
    if (!isLogged) return;
    const off = Alerts.onChange(() => setAlerts(Alerts.getAll() ?? []));
    return off;
  }, [isLogged]);

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
      if (!cancelled) {
        setPreviews(map);
        setUnreadTotal(totalUnread);
      }
    })();
    return () => { cancelled = true; };
  }, [alerts, isLogged]);

  const badge = useMemo(() => (unreadTotal > 9 ? "9+" : unreadTotal), [unreadTotal]);

  const openCreate = () => {
    if (!isLogged) {
      router.push(`/login?next=/inbox`);
      return;
    }
    setOpen(false);
    setTimeout(() => setModalOpen(true), 0);
  };

  if (isLogged === null) {
    return (
      <button className={`nav-bell neon-underline neon-underline--icon relative ${className ?? ""}`} aria-label="Chargement...">
        <Bell size={18} className="opacity-40" />
      </button>
    );
  }

  if (!isLogged) {
    return (
      <button
        onClick={() => router.push(`/login?next=/inbox`)}
        className={`nav-bell neon-underline neon-underline--icon relative ${className ?? ""}`}
        aria-label="Connexion requise"
      >
        <Bell size={18} />
      </button>
    );
  }

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

        <PopoverContent sideOffset={10} className="notif-pop w-[420px] p-0 pop-anim um-pop rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border/50">
            <div className="text-sm text-muted-foreground">Notifications</div>
            <div className="text-base font-semibold">Alertes d’offres</div>
          </div>

          {/* Liste */}
          <div className="max-h-[60vh] overflow-y-auto py-3">
            {alerts.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">Aucune alerte. Crée ta première !</div>
            ) : (
              alerts.map((a, i) => {
                const kws = Alerts.normalizeKeywords(a?.query?.keywords) ?? [];
                return (
                  <section key={a.id} className={`px-3 ${i > 0 ? "mt-2 pt-3" : ""}`}>
                    {/* Capsule titre arrondie avec fond léger */}
                    <div className="title-cap rounded-2xl px-3 py-2.5 mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-[18px] font-semibold leading-tight truncate">{a.name}</h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="mini-chip">alerte</span>
                        {kws.length > 0 && <span className="mini-chip">#{kws[0]}</span>}
                      </div>
                    </div>

                    {/* Cartes offres arrondies */}
                    <ul className="space-y-2">
                      {(previews[a.id] ?? []).slice(0, 4).map((job) => {
                        const isSeen = (a.seenJobIds ?? []).includes(job.id);
                        return (
                          <li key={job.id} className={`job-card rounded-2xl p-3 ${isSeen ? "opacity-75" : ""}`}>
                            <a
                              href={job.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => Alerts.markJobSeen(a.id, job.id)}
                              className="job-title"
                            >
                              {job.title}
                            </a>
                            <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                              {job.company && <span className="chip brand">{job.company}</span>}
                              {job.location && <span className="chip">{job.location}</span>}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center gap-2 px-4 py-3 border-t border-border/40">
            <button className="btn-ghost" onClick={openCreate}>
              <Plus className="w-4 h-4" /> Créer une alerte
            </button>
            <Link href="/inbox" className="btn" onClick={() => setOpen(false)}>
              Tout voir <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </PopoverContent>
      </Popover>

      <AlertModal open={modalOpen} onClose={() => setModalOpen(false)} />

      {/* Styles globaux complémentaires */}
      <style jsx global>{`
        /* Cadre multicolore autour du popover */
        .um-pop { position: relative; }
        .um-pop::before{
          content:""; position:absolute; inset:0; padding:1px; border-radius:16px;
          background: linear-gradient(135deg, var(--color-accent), var(--color-primary), var(--destructive));
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
          pointer-events:none; opacity:.85;
        }

        /* Capsule titre — fond léger + bordure douce + arrondi fort */
        .title-cap{
          background:
            linear-gradient(180deg,
              color-mix(in oklab, var(--color-primary) 10%, var(--color-surface)),
              color-mix(in oklab, var(--color-surface) 96%, transparent)
            );
          border: 1px solid color-mix(in oklab, var(--color-primary) 30%, var(--color-border));
        }

        /* Mini chips à droite du titre */
        .mini-chip{
          padding: 2px 8px;
          border-radius: 9999px;
          border: 1px solid color-mix(in oklab, var(--color-primary) 50%, var(--color-border));
          background: color-mix(in oklab, var(--color-surface) 94%, transparent);
          font-size: 11px;
          line-height: 1.1;
          color: var(--color-foreground);
        }

        /* Cartes d'offres (arrondies) */
        .job-card{
          background: color-mix(in oklab, var(--color-surface) 94%, transparent);
          border: 1px solid var(--color-border);
          transition: background .18s ease, border-color .18s ease, transform .18s ease, box-shadow .18s ease;
        }
        .job-card:hover{
          background: color-mix(in oklab, var(--color-surface) 98%, transparent);
          border-color: color-mix(in oklab, var(--color-primary) 45%, var(--color-border));
          transform: translateY(-1px);
          box-shadow: 0 12px 28px -20px rgba(0,0,0,.22);
        }

        .job-title{
          display:inline-block;
          font-weight: 800;
          color: var(--color-foreground);
          text-decoration: none;
        }
        .job-title:hover{
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        /* Chips banque / lieu (arrondies et lisibles) */
        .chip{
          padding: 2px 8px;
          border-radius: 9999px;
          font-size: 11px;
          line-height: 1.2;
          background: color-mix(in oklab, var(--color-surface) 88%, transparent);
          border: 1px solid var(--color-border);
          color: var(--color-foreground);
          max-width: 100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }
        .chip.brand{
          color:#fff; border:none;
          background: linear-gradient(90deg, var(--color-primary),
            color-mix(in oklab, var(--color-accent) 80%, #6aa7ff));
          box-shadow: 0 0 0 1px rgba(255,255,255,.06) inset, 0 6px 16px -10px rgba(24,32,56,.25);
        }
      `}</style>
    </>
  );
}
