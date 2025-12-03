"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Calendar as CalIcon } from "lucide-react";
import { getAll, type SavedJob } from "@/lib/tracker";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from "date-fns";
import { fr } from "date-fns/locale";

type Props = { open: boolean; onClose: () => void; compact?: boolean; };

export default function CalendarModal({ open, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [jobs, setJobs] = useState<SavedJob[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (open) {
      setJobs(getAll().filter(j => j.status === "applied" && j.appliedAt));
      document.body.style.overflow = "hidden";
    } else { document.body.style.overflow = ""; }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startDay = days[0].getDay(); 
  const offset = startDay === 0 ? 6 : startDay - 1; 
  const blanks = Array(offset).fill(null);

  return createPortal(
    <>
      <motion.div className="fixed inset-0 z-[998] bg-black/80 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />
      
      <div className="fixed inset-0 z-[999] p-4 flex items-center justify-center pointer-events-none">
        <motion.div
          // CORRECTION: bg-surface, border-border
          className="w-full max-w-4xl bg-surface border border-border rounded-xl shadow-2xl flex flex-col max-h-[90vh] pointer-events-auto overflow-hidden"
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.15 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-muted/50">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-indigo-400">
                <CalIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground capitalize">
                  {format(currentMonth, "MMMM yyyy", { locale: fr })}
                </h2>
                <p className="text-xs text-muted-foreground">Planning des candidatures</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-foreground/5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"><ChevronLeft className="w-5 h-5" /></button>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-foreground/5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"><ChevronRight className="w-5 h-5" /></button>
              <div className="w-px h-6 bg-border mx-2" />
              <button onClick={onClose} className="p-2 hover:bg-foreground/5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"><X className="w-5 h-5" /></button>
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-7 gap-4 mb-2">
              {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(d => (
                <div key={d} className="text-center text-xs font-bold text-muted-foreground uppercase tracking-widest py-2">{d}</div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-px bg-border border border-border rounded-lg overflow-hidden">
              {blanks.map((_, i) => (
                <div key={`blank-${i}`} className="min-h-[100px] bg-card/50" />
              ))}

              {days.map(date => {
                const dayJobs = jobs.filter(j => j.appliedAt && isSameDay(new Date(Number(j.appliedAt)), date));
                const today = isToday(date);

                return (
                  <div key={date.toISOString()} className={`min-h-[120px] bg-card p-3 transition-colors hover:bg-surface-muted flex flex-col gap-2 ${today ? "bg-indigo-500/[0.05]" : ""}`}>
                    <div className="flex justify-between items-start">
                      <span className={`text-sm font-medium ${today ? "text-indigo-500" : "text-muted-foreground"}`}>
                        {format(date, "d")}
                      </span>
                      {today && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      {dayJobs.map(job => (
                        <div key={job.id} className="px-2 py-1.5 rounded bg-surface-muted border border-border text-xs truncate hover:border-foreground/20 transition-colors group cursor-default">
                          <div className="font-medium text-foreground truncate">{job.company || "N/A"}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{job.title}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}