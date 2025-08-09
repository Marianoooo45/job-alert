"use client";

import { useMemo, useState, useRef } from "react";
import type { CalEvent, SavedJob } from "@/lib/tracker";
import { eventsForMonth, reminderDaysForMonth, addInterview, removeInterview } from "@/lib/tracker";
import DayEventsModal from "./DayEventsModal";

type Props = {
  year?: number;
  month0?: number;
  allJobs: SavedJob[];
  onChanged: () => void;
};

const WEEKDAYS = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth()+1, 0, 23, 59, 59, 999); }
function addMonths(d: Date, m: number) { return new Date(d.getFullYear(), d.getMonth()+m, 1); }

export default function CalendarMonth({ year, month0, allJobs, onChanged }: Props) {
  const [cursor, setCursor] = useState<Date>(() => new Date(year ?? new Date().getFullYear(), month0 ?? new Date().getMonth(), 1));
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<Date>(new Date());
  const [modalEvents, setModalEvents] = useState<CalEvent[]>([]);
  const [mode, setMode] = useState<"month"|"agenda">("month");
  const [showApplied, setShowApplied] = useState(true);
  const [showInterviews, setShowInterviews] = useState(true);

  const ym = { y: cursor.getFullYear(), m0: cursor.getMonth() };
  const title = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(cursor);

  const events = useMemo(() => eventsForMonth(ym.y, ym.m0), [ym.y, ym.m0]);
  const reminders = useMemo(() => reminderDaysForMonth(ym.y, ym.m0), [ym.y, ym.m0]);

  // mapping par jour
  const perDay = useMemo(() => {
    const map = new Map<string, { applied: number; interview: number; items: CalEvent[] }>();
    for (const ev of events) {
      const key = new Date(ev.date).toDateString();
      const entry = map.get(key) ?? { applied: 0, interview: 0, items: [] };
      if (ev.type === "applied") entry.applied++;
      if (ev.type === "interview") entry.interview++;
      entry.items.push(ev);
      map.set(key, entry);
    }
    return map;
  }, [events]);

  // grille mois
  const grid = useMemo(() => {
    const start = startOfMonth(cursor);
    const end = endOfMonth(cursor);
    const before = (start.getDay() + 6) % 7; // lundi=0
    const daysInMonth = end.getDate();
    const cells:(Date|null)[] = [];
    for (let i = 0; i < before; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const openDay = (d: Date) => {
    const key = d.toDateString();
    setModalDate(d);
    setModalEvents(perDay.get(key)?.items ?? []);
    setModalOpen(true);
  };

  // drag & drop (entretiens)
  const dragData = useRef<{ jobId: string; ts: number } | null>(null);
  const onDragStart = (jobId: string, ts: number) => (e: React.DragEvent) => {
    dragData.current = { jobId, ts };
    e.dataTransfer.setData("text/plain", JSON.stringify({ jobId, ts }));
    e.dataTransfer.effectAllowed = "move";
  };
  const onDayDrop = (day: Date) => (e: React.DragEvent) => {
    e.preventDefault();
    const payload = dragData.current || (() => { try { return JSON.parse(e.dataTransfer.getData("text/plain")); } catch { return null; } })();
    if (!payload) return;
    const prev = new Date(payload.ts);
    const next = new Date(day.getFullYear(), day.getMonth(), day.getDate(), prev.getHours(), prev.getMinutes());
    // move = remove + add
    removeInterview(payload.jobId, payload.ts);
    addInterview(payload.jobId, { ts: next.getTime() });
    dragData.current = null;
    onChanged();
  };
  const allowDrop = (e: React.DragEvent) => e.preventDefault();

  // agenda (liste) filtrable
  const agenda = useMemo(() => {
    const arr = events.filter(e => (e.type === "applied" && showApplied) || (e.type === "interview" && showInterviews));
    return arr.sort((a,b)=>a.date-b.date);
  }, [events, showApplied, showInterviews]);

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-[var(--glow-weak)]">
      {/* header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
        <div className="text-sm text-muted-foreground">Calendrier</div>
        <div className="flex items-center gap-2">
          <button className="h-9 px-3 rounded-lg border border-border hover:border-primary" onClick={() => setCursor(addMonths(cursor, -1))} aria-label="Mois précédent">◀</button>
          <div className="min-w-[180px] text-center font-semibold capitalize">{title}</div>
          <button className="h-9 px-3 rounded-lg border border-border hover:border-primary" onClick={() => setCursor(addMonths(cursor, +1))} aria-label="Mois suivant">▶</button>

          <div className="h-9 px-1 rounded-lg border border-border ml-2 flex items-center">
            <button className={`h-7 px-2 rounded ${mode==="month"?"bg-primary text-background":"hover:bg-[color-mix(in_oklab,var(--color-primary)_12%,transparent)]"}`} onClick={()=>setMode("month")}>Mois</button>
            <button className={`h-7 px-2 rounded ${mode==="agenda"?"bg-primary text-background":"hover:bg-[color-mix(in_oklab,var(--color-primary)_12%,transparent)]"}`} onClick={()=>setMode("agenda")}>Agenda</button>
          </div>

          <div className="h-9 px-2 rounded-lg border border-border ml-2 flex items-center gap-2 text-sm">
            <label className="flex items-center gap-1"><input type="checkbox" checked={showApplied} onChange={(e)=>setShowApplied(e.target.checked)} /> Candidatures</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={showInterviews} onChange={(e)=>setShowInterviews(e.target.checked)} /> Entretiens</label>
          </div>

          <button
            className="h-9 px-3 rounded-lg border border-border hover:border-primary"
            onClick={() => exportICS(events)}
            title="Exporter les entretiens (.ics)"
          >
            Export iCal
          </button>
        </div>
      </div>

      {/* légende */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary inline-block" /> Candidature</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-pink-400 inline-block" /> Entretien</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400 inline-block" /> À relancer</span>
      </div>

      {mode === "month" ? (
        <>
          {/* weekdays */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-xs text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          {/* days */}
          <div className="grid grid-cols-7 gap-1">
            {grid.map((d, idx) => {
              if (!d) return <div key={`e-${idx}`} className="h-24 rounded-lg border border-transparent" />;
              const k = d.toDateString();
              const counts = perDay.get(k);
              const today = new Date();
              const isToday = d.getFullYear()===today.getFullYear() && d.getMonth()===today.getMonth() && d.getDate()===today.getDate();
              const remind = reminders.has(k);
              return (
                <div
                  key={k}
                  className={`h-24 rounded-lg border p-2 transition relative group
                    ${isToday ? "border-primary/70" : "border-border/60"}
                    hover:border-primary/60 hover:bg-[color-mix(in_oklab,var(--color-primary)_7%,transparent)]`}
                  onDoubleClick={() => openDay(d)}
                  onDrop={onDayDrop(d)} onDragOver={allowDrop}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs opacity-80">{d.getDate()}</div>
                    {remind && <span className="inline-block h-2 w-2 rounded-full bg-amber-400" title="À relancer" />}
                  </div>

                  {counts ? (
                    <div className="mt-1 space-y-1">
                      {showApplied && counts.applied > 0 && (
                        <div className="text-[11px] inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-1.5">
                          <span className="h-2 w-2 rounded-full bg-primary inline-block" />
                          {counts.applied} cand.
                        </div>
                      )}
                      {showInterviews && counts.interview > 0 && (
                        <div className="text-[11px] inline-flex items-center gap-1 rounded-full border border-fuchsia-500/40 bg-fuchsia-500/10 px-1.5">
                          <span className="h-2 w-2 rounded-full bg-pink-400 inline-block" />
                          {counts.interview} entretiens
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-1 text-[11px] text-muted-foreground">—</div>
                  )}

                  {/* zone drop hint */}
                  <div className="absolute inset-0 rounded-lg border-2 border-transparent group-[&.drag-over]:border-primary/50 pointer-events-none" />
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* Agenda */
        <div className="rounded-xl border border-border/70">
          {agenda.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">Rien ce mois-ci avec ces filtres.</div>
          ) : (
            <ul className="divide-y divide-border/60">
              {agenda.map((e, idx) => {
                const d = new Date(e.date);
                const day = d.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" });
                return (
                  <li key={idx} className="flex items-center justify-between gap-3 px-4 py-2">
                    <div className="min-w-0">
                      <div className="text-sm">
                        <span className="opacity-80">{day}</span>
                        <span className="mx-2">•</span>
                        <span className="text-xs rounded px-1.5 py-0.5 border" style={{borderColor: e.type==="interview" ? "rgba(244,114,182,.4)":"rgba(187,154,247,.4)", background: e.type==="interview" ? "rgba(244,114,182,.08)":"rgba(187,154,247,.08)"}}>
                          {e.type === "interview" ? "Entretien" : "Candidature"}
                        </span>
                      </div>
                      <div className="truncate">{e.job.title} — <span className="text-muted-foreground">{e.job.company ?? e.job.source ?? "-"}</span></div>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">{d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* modal jour */}
      <DayEventsModal
        open={modalOpen}
        date={modalDate}
        events={modalEvents}
        allJobs={allJobs}
        onClose={() => setModalOpen(false)}
        onChanged={() => {
          setModalOpen(false);
          setTimeout(() => setCursor(new Date(ym.y, ym.m0, 1)), 0);
          onChanged();
        }}
      />

      <style jsx>{`
        .drag-over { border-color: var(--color-primary); }
      `}</style>
    </div>
  );
}

/* --- Export .ics --- */
function exportICS(events: CalEvent[]) {
  const interviews = events.filter(e => e.type === "interview");
  if (interviews.length === 0) {
    alert("Aucun entretien à exporter pour ce mois.");
    return;
  }
  const esc = (s: string) => String(s).replace(/[\n,;]/g, " ");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Job Alert//Calendar//FR",
  ];
  for (const e of interviews) {
    const dt = new Date(e.date);
    const toICS = (d: Date) => {
      const pad = (n:number)=>String(n).padStart(2,"0");
      return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
    };
    const end = new Date(dt.getTime() + 60*60*1000); // 1h par défaut
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.job.id}-${e.date}@job-alert`,
      `DTSTAMP:${toICS(new Date())}`,
      `DTSTART:${toICS(dt)}`,
      `DTEND:${toICS(end)}`,
      `SUMMARY:${esc(`Entretien — ${e.job.title}`)}`,
      `DESCRIPTION:${esc(`${e.job.company ?? e.job.source ?? ""}${e.meta?.note ? " — " + e.meta.note : ""}${e.meta?.url ? " — " + e.meta.url : ""}`)}`,
      `LOCATION:${esc(e.meta?.location ?? "")}`,
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "entretiens_job_alert.ics"; a.click();
  URL.revokeObjectURL(url);
}
