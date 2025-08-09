"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import type { CalEvent, SavedJob } from "@/lib/tracker";
import { addInterviewDate, removeInterviewDate } from "@/lib/tracker";
import Link from "next/link";
import BankAvatar from "./BankAvatar";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  date: Date;
  events: CalEvent[];
  allJobs: SavedJob[];
  onClose: () => void;
  /** recharger le parent après mutation */
  onChanged: () => void;
};

function fmt(dt: Date) {
  return dt.toLocaleString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}
function fmtTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
function toLocalInputValue(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Body({ open, date, events, allJobs, onClose, onChanged }: Props) {
  const [jobId, setJobId] = useState<string | "">("");
  const [when, setWhen] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    const defaultTs = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 10, 0, 0).getTime();
    setWhen(toLocalInputValue(defaultTs));
    setJobId(allJobs.find(j => j.status === "applied")?.id ?? (allJobs[0]?.id ?? ""));
  }, [open, date, allJobs]);

  // lock scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => { document.documentElement.style.overflow = prev; };
  }, [open]);

  const byType = useMemo(() => {
    return {
      interview: events.filter(e => e.type === "interview"),
      applied: events.filter(e => e.type === "applied"),
    };
  }, [events]);

  const addInterview = () => {
    if (!jobId || !when) return;
    const ts = new Date(when).getTime();
    addInterviewDate(jobId, ts);
    onChanged();
  };

  const removeInterview = (job: string, ts: number) => {
    removeInterviewDate(job, ts);
    onChanged();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[998] bg-black/55 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-[999] p-4 flex items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-3xl rounded-2xl border border-border bg-surface overflow-hidden shadow-[0_30px_120px_-40px_rgba(187,154,247,.35)]"
              initial={{ scale: 0.94 }} animate={{ scale: 1 }} exit={{ scale: 0.94 }} transition={{ duration: .18 }}
            >
              <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Calendrier</div>
                  <div className="text-lg font-semibold">{fmt(date)}</div>
                </div>
                <button onClick={onClose} className="h-9 w-9 grid place-items-center hover:bg-muted/30 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-5">
                {/* Entretiens */}
                <div className="rounded-xl border border-border/60 p-3">
                  <div className="text-sm font-medium mb-2">Entretiens</div>
                  {byType.interview.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Aucun entretien ce jour.</div>
                  ) : (
                    <ul className="space-y-2">
                      {byType.interview.map((e, i) => (
                        <li key={`${e.job.id}-${e.date}-${i}`} className="flex items-center justify-between gap-3 rounded border border-border px-3 py-2">
                          <div className="min-w-0 flex items-center gap-2">
                            <BankAvatar name={e.job.company ?? e.job.source} size={20} />
                            <span className="truncate">{e.job.title}</span>
                            <span className="text-xs text-muted-foreground shrink-0">à {fmtTime(e.date)}</span>
                          </div>
                          <button
                            className="px-2 py-1 text-xs rounded border border-border hover:border-danger"
                            onClick={() => removeInterview(e.job.id, e.date)}
                          >
                            Supprimer
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Candidatures envoyées */}
                <div className="rounded-xl border border-border/60 p-3">
                  <div className="text-sm font-medium mb-2">Candidatures envoyées</div>
                  {byType.applied.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Aucune candidature ce jour.</div>
                  ) : (
                    <ul className="space-y-2">
                      {byType.applied.map((e, i) => (
                        <li key={`${e.job.id}-${e.date}-${i}`} className="flex items-center justify-between gap-3 rounded border border-border px-3 py-2">
                          <div className="min-w-0 flex items-center gap-2">
                            <BankAvatar name={e.job.company ?? e.job.source} size={20} />
                            <Link href={e.job.link} target="_blank" className="truncate text-cyan-400 hover:underline">
                              {e.job.title}
                            </Link>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">{fmtTime(e.date)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Ajout rapide d'un entretien */}
                <div className="lg:col-span-2 rounded-xl border border-border/60 p-3">
                  <div className="text-sm font-medium mb-2">Planifier un entretien</div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <select
                      className="bg-card border border-border rounded px-2 h-10"
                      value={jobId}
                      onChange={(e)=>setJobId(e.target.value)}
                    >
                      {allJobs.length === 0 && <option value="">— Aucun job —</option>}
                      {allJobs.map(j => (
                        <option key={j.id} value={j.id}>
                          {j.title} — {j.company ?? j.source ?? "-"}
                        </option>
                      ))}
                    </select>

                    <input
                      type="datetime-local"
                      className="bg-card border border-border rounded px-2 h-10"
                      value={when}
                      onChange={(e)=>setWhen(e.target.value)}
                    />

                    <button
                      className="h-10 px-3 rounded-lg border border-border hover:border-primary"
                      onClick={addInterview}
                      disabled={!jobId || !when}
                    >
                      Ajouter
                    </button>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Astuce : tu peux repositionner/éditer plus tard, chaque entrée peut être supprimée individuellement.
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function DayEventsModal(props: Props) {
  if (typeof document === "undefined") return null;
  return createPortal(<Body {...props} />, document.body);
}
