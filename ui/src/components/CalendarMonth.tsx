"use client";

import { useMemo, useState } from "react";
import type { CalEvent, SavedJob } from "@/lib/tracker";
import { eventsForMonth } from "@/lib/tracker";
import DayEventsModal from "./DayEventsModal";

type Props = {
  /** année (ex: 2025) et mois (0..11). Si non fournis, utilise le mois courant. */
  year?: number;
  month0?: number;
  /** tous les jobs (pour sélection dans la modale) */
  allJobs: SavedJob[];
  /** callback appelé après ajout/suppression d’un event (pour recharger parent) */
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

  const ym = { y: cursor.getFullYear(), m0: cursor.getMonth() };

  const events = useMemo(() => eventsForMonth(ym.y, ym.m0), [ym.y, ym.m0]);

  // map jour -> { applied, interview, events[] }
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

  const grid = useMemo(() => {
    const start = startOfMonth(cursor);
    const end = endOfMonth(cursor);
    // commence la semaine le lundi
    const before = (start.getDay() + 6) % 7; // 0=lundi
    const daysInMonth = end.getDate();
    const cells = [];
    for (let i = 0; i < before; i++) cells.push(null); // jours du mois précédent (vides)
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

  const title = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(cursor);

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-[var(--glow-weak)]">
      {/* header */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-muted-foreground">Calendrier</div>
        <div className="flex items-center gap-2">
          <button
            className="h-9 px-3 rounded-lg border border-border hover:border-primary"
            onClick={() => setCursor(addMonths(cursor, -1))}
            aria-label="Mois précédent"
          >◀</button>
          <div className="min-w-[160px] text-center font-semibold capitalize">{title}</div>
          <button
            className="h-9 px-3 rounded-lg border border-border hover:border-primary"
            onClick={() => setCursor(addMonths(cursor, +1))}
            aria-label="Mois suivant"
          >▶</button>
        </div>
      </div>

      {/* légende */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary inline-block" /> Candidature</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-pink-400 inline-block" /> Entretien</span>
      </div>

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
          return (
            <button
              key={k}
              className={`h-24 rounded-lg border text-left p-2 transition
                ${isToday ? "border-primary/70" : "border-border/60"}
                hover:border-primary/60 hover:bg-[color-mix(in_oklab,var(--color-primary)_7%,transparent)]`}
              onClick={() => openDay(d)}
            >
              <div className="text-xs opacity-80">{d.getDate()}</div>
              {counts ? (
                <div className="mt-1 space-y-1">
                  {counts.applied > 0 && (
                    <div className="text-[11px] inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-1.5">
                      <span className="h-2 w-2 rounded-full bg-primary inline-block" />
                      {counts.applied} candidature{counts.applied>1?"s":""}
                    </div>
                  )}
                  {counts.interview > 0 && (
                    <div className="text-[11px] inline-flex items-center gap-1 rounded-full border border-fuchsia-500/40 bg-fuchsia-500/10 px-1.5">
                      <span className="h-2 w-2 rounded-full bg-pink-400 inline-block" />
                      {counts.interview} entretien{counts.interview>1?"s":""}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-1 text-[11px] text-muted-foreground">—</div>
              )}
            </button>
          );
        })}
      </div>

      {/* modal jour */}
      <DayEventsModal
        open={modalOpen}
        date={modalDate}
        events={modalEvents}
        allJobs={allJobs}
        onClose={() => setModalOpen(false)}
        onChanged={() => {
          setModalOpen(false);
          // force refresh en ré-ouvrant sur le même mois
          setTimeout(() => setCursor(new Date(ym.y, ym.m0, 1)), 0);
          onChanged();
        }}
      />
    </div>
  );
}
