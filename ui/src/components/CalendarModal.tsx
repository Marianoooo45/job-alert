// ui/src/components/CalendarModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Cal from "@/lib/calendar";
import * as Tracker from "@/lib/tracker";
import { X, Trash2, Edit2, Calendar as CalIcon, ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  preselectJobId?: string; // pour pré-remplir le formulaire
  anchorDate?: Date;       // date à afficher au lancement
  compact?: boolean;       // ✅ nouveau: UI plus compacte
};

function startOfMonthGrid(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  const day = d.getDay(); // 0=dim
  const offset = (day + 6) % 7; // Lundi=0
  d.setDate(d.getDate() - offset);
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(d: Date, days: number) {
  const n = new Date(d);
  n.setDate(n.getDate() + days);
  return n;
}
function fmtHM(ts: number) {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export default function CalendarModal({ open, onClose, preselectJobId, anchorDate, compact = false }: Props) {
  // ✅ tailles “responsive compact”
  const S = compact
    ? {
        modalMaxW: "max-w-4xl",
        headerPad: "px-4 py-3",
        wrapperPad: "p-4",
        gridGap: "gap-1",
        cellMinH: "min-h-[72px]",
        weekText: "text-[12px]",
        dayNumText: "text-[11px]",
        itemText: "text-[11px]",
        ctrlSize: "h-8 w-8",
        formPad: "p-3",
        formLbl: "text-[11px]",
        inputH: "h-9",
        titleText: "text-[15px]",
      }
    : {
        modalMaxW: "max-w-6xl",
        headerPad: "px-5 py-4",
        wrapperPad: "p-5",
        gridGap: "gap-1",
        cellMinH: "min-h-[96px]",
        weekText: "text-xs",
        dayNumText: "text-xs",
        itemText: "text-xs",
        ctrlSize: "h-9 w-9",
        formPad: "p-4",
        formLbl: "text-xs",
        inputH: "h-10",
        titleText: "text-lg",
      };

  // data
  const [refreshToken, setRefreshToken] = useState(0);
  const jobs = useMemo(() => Tracker.getAll(), [refreshToken]); // refresh quand on modifie le calendrier
  const [cursor, setCursor] = useState<Date>(anchorDate ?? new Date());
  const [list, setList] = useState<Cal.CalendarItem[]>([]);
  const [editing, setEditing] = useState<Cal.CalendarItem | null>(null);

  // form (ajout / édition)
  const [formJobId, setFormJobId] = useState(preselectJobId ?? (jobs[0]?.id ?? ""));
  const [formWhen, setFormWhen] = useState(() => {
    const d = new Date();
    d.setHours(10, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [formTitle, setFormTitle] = useState("");
  const [formLoc, setFormLoc] = useState("");
  const [formUrl, setFormUrl] = useState("");

  useEffect(() => {
    if (!open) return;
    setList(Cal.getAll());
  }, [open, refreshToken]);

  useEffect(() => {
    if (preselectJobId) setFormJobId(preselectJobId);
  }, [preselectJobId]);

  const grid = useMemo(() => {
    const start = startOfMonthGrid(cursor);
    return [...Array(42)].map((_, i) => addDays(start, i));
  }, [cursor]);

  function refresh() {
    setList(Cal.getAll());
    setRefreshToken((t) => t + 1);
  }

  // DnD
  function onDragStart(ev: React.DragEvent, id: string) {
    ev.dataTransfer.setData("text/calendar-id", id);
    ev.dataTransfer.effectAllowed = "move";
  }
  function onDragOver(ev: React.DragEvent) {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "move";
  }
  function onDrop(ev: React.DragEvent, targetDate: Date) {
    ev.preventDefault();
    const id = ev.dataTransfer.getData("text/calendar-id");
    if (!id) return;
    Cal.moveToDay(id, targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    refresh();
  }

  function submitForm() {
    const ts = new Date(formWhen).getTime();
    if (!formJobId || Number.isNaN(ts)) return;
    if (editing) {
      Cal.update(editing.id, {
        jobId: formJobId,
        ts,
        title: formTitle || undefined,
        location: formLoc || undefined,
        url: formUrl || undefined,
      });
      setEditing(null);
    } else {
      Cal.add({
        jobId: formJobId,
        ts,
        title: formTitle || undefined,
        location: formLoc || undefined,
        url: formUrl || undefined,
      });
    }
    refresh();
  }

  function editItem(it: Cal.CalendarItem) {
    setEditing(it);
    setFormJobId(it.jobId);
    setFormWhen(new Date(it.ts).toISOString().slice(0, 16));
    setFormTitle(it.title ?? "");
    setFormLoc(it.location ?? "");
    setFormUrl(it.url ?? "");
  }

  function removeItem(id: string) {
    Cal.remove(id);
    if (editing?.id === id) setEditing(null);
    refresh();
  }

  const monthLabel = cursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[998] bg-black/55 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-[999] p-4 sm:p-6 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={`w-full ${S.modalMaxW} rounded-2xl border border-border bg-surface shadow-[0_30px_120px_-40px_rgba(187,154,247,.35)] overflow-hidden`}
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              transition={{ duration: 0.18 }}
            >
              {/* Header */}
              <div className={`${S.headerPad} border-b border-border/60 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <CalIcon className="w-5 h-5 text-primary" />
                  <div className={`${S.titleText} font-semibold`}>Calendrier</div>
                </div>
                <button
                  onClick={onClose}
                  className="h-9 w-9 grid place-items-center hover:bg-muted/30 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className={`grid grid-cols-1 lg:grid-cols-3 gap-5 ${S.wrapperPad}`}>
                {/* Col gauche : calendrier mois */}
                <div className="lg:col-span-2">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      className={`${S.ctrlSize} rounded-lg border border-border hover:border-primary grid place-items-center`}
                      onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                      title="Mois précédent"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="text-base font-medium capitalize">{monthLabel}</div>
                    <button
                      className={`${S.ctrlSize} rounded-lg border border-border hover:border-primary grid place-items-center`}
                      onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                      title="Mois suivant"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className={`grid grid-cols-7 ${S.weekText} text-muted-foreground mb-1 px-1`}>
                    {["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"].map((d) => (
                      <div key={d} className="px-1 py-1">{d}</div>
                    ))}
                  </div>

                  <div className={`grid grid-cols-7 ${S.gridGap}`}>
                    {grid.map((day) => {
                      const inMonth = day.getMonth() === cursor.getMonth();
                      const todays = list.filter((x) => {
                        const dt = new Date(x.ts);
                        return dt.getFullYear() === day.getFullYear() &&
                               dt.getMonth() === day.getMonth() &&
                               dt.getDate() === day.getDate();
                      });

                      return (
                        <div
                          key={day.toISOString()}
                          onDragOver={onDragOver}
                          onDrop={(e) => onDrop(e, day)}
                          className={`${S.cellMinH} rounded-lg border p-2 ${
                            inMonth
                              ? "border-border/70 bg-card/60 hover:bg-card"
                              : "border-border/40 bg-card/30 text-muted-foreground"
                          }`}
                        >
                          <div className={`${S.dayNumText} mb-1 opacity-70`}>
                            {day.getDate()}
                          </div>
                          <div className="space-y-1">
                            {todays.map((it) => {
                              const job = jobs.find((j) => j.id === it.jobId);
                              return (
                                <div
                                  key={it.id}
                                  draggable
                                  onDragStart={(e) => onDragStart(e, it.id)}
                                  className={`group ${S.itemText} rounded-md border border-border bg-surface/70 px-2 py-1 flex items-center justify-between hover:border-primary`}
                                  title={job ? job.title : ""}
                                >
                                  <span className="truncate">
                                    {fmtHM(it.ts)} — {it.title || (job?.company ?? "Entretien")}
                                  </span>
                                  <span className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1 ml-2 shrink-0">
                                    <button
                                      className="p-0.5 rounded hover:bg-primary/15"
                                      title="Éditer"
                                      onClick={() => editItem(it)}
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      className="p-0.5 rounded hover:bg-destructive/15"
                                      title="Supprimer"
                                      onClick={() => removeItem(it.id)}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Astuce : glisse-dépose un entretien sur un autre jour pour le déplacer. Le détail (heure) est conservé.
                  </p>
                </div>

                {/* Col droite : formulaire */}
                <div className={`rounded-xl border border-border bg-card ${S.formPad} space-y-3`}>
                  <div className="text-sm text-muted-foreground">
                    {editing ? "Modifier l’entretien" : "Planifier un entretien"}
                  </div>

                  <div className="space-y-2">
                    <label className={`block ${S.formLbl} text-muted-foreground`}>Candidature</label>
                    <select
                      className={`w-full ${S.inputH} rounded-lg border border-border bg-surface px-2`}
                      value={formJobId}
                      onChange={(e) => setFormJobId(e.target.value)}
                    >
                      {jobs.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.title} — {j.company ?? j.source}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className={`block ${S.formLbl} text-muted-foreground`}>Date & heure</label>
                    <input
                      type="datetime-local"
                      className={`w-full ${S.inputH} rounded-lg border border-border bg-surface px-2`}
                      value={formWhen}
                      onChange={(e) => setFormWhen(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className={`block ${S.formLbl} text-muted-foreground`}>Titre</label>
                    <input
                      placeholder="Ex : Call RH / Tech round"
                      className={`w-full ${S.inputH} rounded-lg border border-border bg-surface px-2`}
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className={`block ${S.formLbl} text-muted-foreground`}>Lieu / Outil</label>
                    <input
                      placeholder="Teams, Google Meet, Bureau…"
                      className={`w-full ${S.inputH} rounded-lg border border-border bg-surface px-2`}
                      value={formLoc}
                      onChange={(e) => setFormLoc(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className={`block ${S.formLbl} text-muted-foreground`}>Lien (optionnel)</label>
                    <input
                      type="url"
                      placeholder="https://…"
                      className={`w-full ${S.inputH} rounded-lg border border-border bg-surface px-2`}
                      value={formUrl}
                      onChange={(e) => setFormUrl(e.target.value)}
                    />
                  </div>

                  <div className="pt-1 flex items-center justify-end gap-2">
                    {editing && (
                      <button
                        onClick={() => {
                          setEditing(null);
                          setFormTitle("");
                          setFormLoc("");
                          setFormUrl("");
                        }}
                        className={`px-3 ${S.inputH} rounded-lg border border-border hover:border-danger`}
                      >
                        Annuler
                      </button>
                    )}
                    <button
                      onClick={submitForm}
                      className={`px-4 ${S.inputH} rounded-lg border border-border hover:border-primary btn`}
                    >
                      {editing ? "Enregistrer" : "Ajouter"}
                    </button>
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
