"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import type { CalEvent, SavedJob, Interview } from "@/lib/tracker";
import { addInterview, removeInterview, updateInterview } from "@/lib/tracker";
import Link from "next/link";
import BankAvatar from "./BankAvatar";
import { X, Pencil, Check, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  date: Date;
  events: CalEvent[];
  allJobs: SavedJob[];
  onClose: () => void;
  onChanged: () => void;
};

function fmtHeader(dt: Date) {
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
const fromLocalInputValue = (s: string) => new Date(s).getTime();

function Body({ open, date, events, allJobs, onClose, onChanged }: Props) {
  const defaultTs = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 10, 0, 0).getTime();
  const [jobId, setJobId] = useState<string | "">("");
  const [when, setWhen] = useState<string>(toLocalInputValue(defaultTs));
  const [note, setNote] = useState<string>("");
  const [loc, setLoc] = useState<string>("");
  const [url, setUrl] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setJobId(allJobs.find(j => j.status === "applied")?.id ?? allJobs[0]?.id ?? "");
    setWhen(toLocalInputValue(defaultTs));
    setNote(""); setLoc(""); setUrl("");
  }, [open, defaultTs, allJobs]);

  // lock scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => { document.documentElement.style.overflow = prev; };
  }, [open]);

  const byType = useMemo(() => ({
    interview: events.filter(e => e.type === "interview"),
    applied: events.filter(e => e.type === "applied"),
  }), [events]);

  const add = () => {
    if (!jobId) return;
    const ts = fromLocalInputValue(when);
    addInterview(jobId, { ts, note, location: loc, url });
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
              className="w-full max-w-4xl rounded-2xl border border-border bg-surface overflow-hidden shadow-[0_30px_120px_-40px_rgba(187,154,247,.35)]"
              initial={{ scale: 0.94 }} animate={{ scale: 1 }} exit={{ scale: 0.94 }} transition={{ duration: .18 }}
            >
              {/* header */}
              <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Calendrier</div>
                  <div className="text-lg font-semibold capitalize">{fmtHeader(date)}</div>
                </div>
                <button onClick={onClose} className="h-9 w-9 grid place-items-center hover:bg-muted/30 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* content */}
              <div className="p-5 grid grid-cols-1 xl:grid-cols-2 gap-5">
                {/* Interviews */}
                <section className="rounded-xl border border-border p-3">
                  <div className="text-sm font-medium mb-2">Entretiens</div>
                  {byType.interview.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Aucun entretien ce jour.</div>
                  ) : (
                    <ul className="space-y-2">
                      {byType.interview.map((e, i) => (
                        <InterviewRow key={`${e.job.id}-${e.date}-${i}`} ev={e} onChanged={onChanged} />
                      ))}
                    </ul>
                  )}
                </section>

                {/* Applications */}
                <section className="rounded-xl border border-border p-3">
                  <div className="text-sm font-medium mb-2">Candidatures envoyées</div>
                  {byType.applied.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Aucune candidature ce jour.</div>
                  ) : (
                    <ul className="space-y-2">
                      {byType.applied.map((e, i) => (
                        <li key={`${e.job.id}-${e.date}-${i}`} className="flex items-center justify-between gap-3 rounded border border-border px-3 py-2">
                          <div className="min-w-0 flex items-center gap-2">
                            <BankAvatar name={e.job.company ?? e.job.source} size={20} />
                            <Link href={e.job.link} target="_blank" className="truncate text-cyan-400 hover:underline">{e.job.title}</Link>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">{fmtTime(e.date)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {/* Add interview */}
                <section className="xl:col-span-2 rounded-xl border border-border p-3">
                  <div className="text-sm font-medium mb-2">Planifier un entretien</div>
                  <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                    <select className="bg-card border border-border rounded px-2 h-10" value={jobId} onChange={(e)=>setJobId(e.target.value)}>
                      {allJobs.length === 0 && <option value="">— Aucun job —</option>}
                      {allJobs.map(j => (
                        <option key={j.id} value={j.id}>{j.title} — {j.company ?? j.source ?? "-"}</option>
                      ))}
                    </select>
                    <input type="datetime-local" className="bg-card border border-border rounded px-2 h-10" value={when} onChange={(e)=>setWhen(e.target.value)} />
                    <input type="text" className="flex-1 bg-card border border-border rounded px-2 h-10" placeholder="Note (optionnel)" value={note} onChange={(e)=>setNote(e.target.value)} />
                    <input type="text" className="bg-card border border-border rounded px-2 h-10" placeholder="Lieu / Outil" value={loc} onChange={(e)=>setLoc(e.target.value)} />
                    <input type="url" className="bg-card border border-border rounded px-2 h-10" placeholder="Lien visio" value={url} onChange={(e)=>setUrl(e.target.value)} />
                    <button className="h-10 px-3 rounded-lg border border-border hover:border-primary" onClick={add} disabled={!jobId}>Ajouter</button>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">Astuce : glisse-dépose un entretien sur un autre jour pour le déplacer.</div>
                </section>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function InterviewRow({ ev, onChanged }: { ev: CalEvent; onChanged: () => void }) {
  const [edit, setEdit] = useState(false);
  const [when, setWhen] = useState<string>(toLocalInputValue(ev.date));
  const [note, setNote] = useState<string>(ev.meta?.note ?? "");
  const [loc, setLoc] = useState<string>(ev.meta?.location ?? "");
  const [url, setUrl] = useState<string>(ev.meta?.url ?? "");

  const save = () => {
    const ts = new Date(when).getTime();
    updateInterview(ev.job.id, ev.date, { ts, note, location: loc, url });
    setEdit(false);
    onChanged();
  };

  const remove = () => {
    removeInterview(ev.job.id, ev.date);
    onChanged();
  };

  return (
    <li className="rounded border border-border p-2">
      {!edit ? (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2">
            <BankAvatar name={ev.job.company ?? ev.job.source} size={20} />
            <span className="truncate">{ev.job.title}</span>
            <span className="text-xs text-muted-foreground shrink-0">à {new Date(ev.date).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</span>
            {(ev.meta?.note || ev.meta?.location || ev.meta?.url) && (
              <span className="text-xs text-muted-foreground truncate">
                — {ev.meta?.note ?? ""} {ev.meta?.location ? `• ${ev.meta.location}` : ""} {ev.meta?.url ? "• lien" : ""}
              </span>
            )}
          </div>
          <div className="shrink-0 flex items-center gap-1">
            <button className="px-2 py-1 text-xs rounded border border-border hover:border-primary inline-flex items-center gap-1" onClick={() => setEdit(true)}>
              <Pencil className="w-3.5 h-3.5" /> Éditer
            </button>
            <button className="px-2 py-1 text-xs rounded border border-border hover:border-danger inline-flex items-center gap-1" onClick={remove}>
              <Trash2 className="w-3.5 h-3.5" /> Suppr.
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr_160px_220px_100px] gap-2">
          <input type="datetime-local" className="bg-card border border-border rounded px-2 h-9" value={when} onChange={(e)=>setWhen(e.target.value)} />
          <input type="text" className="bg-card border border-border rounded px-2 h-9" placeholder="Note" value={note} onChange={(e)=>setNote(e.target.value)} />
          <input type="text" className="bg-card border border-border rounded px-2 h-9" placeholder="Lieu" value={loc} onChange={(e)=>setLoc(e.target.value)} />
          <input type="url" className="bg-card border border-border rounded px-2 h-9" placeholder="Lien" value={url} onChange={(e)=>setUrl(e.target.value)} />
          <button className="h-9 px-3 rounded-lg border border-border hover:border-primary inline-flex items-center justify-center gap-1" onClick={save}>
            <Check className="w-3.5 h-3.5" /> Enregistrer
          </button>
        </div>
      )}
    </li>
  );
}

export default function DayEventsModal(props: Props) {
  if (typeof document === "undefined") return null;
  return createPortal(<Body {...props} />, document.body);
}
