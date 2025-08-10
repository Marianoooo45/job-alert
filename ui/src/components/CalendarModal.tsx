// ui/src/components/CalendarModal.tsx
"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Cal from "@/lib/calendar";
import * as Tracker from "@/lib/tracker";
import BankAvatar from "@/components/BankAvatar";
import {
  X,
  Trash2,
  Edit2,
  Calendar as CalIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  preselectJobId?: string;
  anchorDate?: Date;
};

/* ----------------------- utils ----------------------- */
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
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function fmtHM(ts: number) {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/* ----------------------- component ----------------------- */
export default function CalendarModal({
  open,
  onClose,
  preselectJobId,
  anchorDate,
}: Props) {
  const [cursor, setCursor] = useState<Date>(anchorDate ?? new Date());
  const [list, setList] = useState<Cal.CalendarItem[]>([]);
  const [editing, setEditing] = useState<Cal.CalendarItem | null>(null);

  // on garde les candidatures (dashboard) pour le panel et le select du form
  const jobs = useMemo(() => Tracker.getAll(), []);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // form (ajout / édition)
  const [formJobId, setFormJobId] = useState(preselectJobId ?? jobs[0]?.id ?? "");
  const [formWhen, setFormWhen] = useState(() => {
    const d = new Date();
    d.setHours(10, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [formTitle, setFormTitle] = useState("");
  const [formLoc, setFormLoc] = useState("");
  const [formUrl, setFormUrl] = useState("");

  /* ---------- lifecycle ---------- */
  useEffect(() => {
    if (!open) return;
    refresh();
    // lock scroll body
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (preselectJobId) setFormJobId(preselectJobId);
  }, [preselectJobId]);

  function refresh() {
    setList(Cal.getAll());
  }

  // Grille mois
  const grid = useMemo(() => {
    const start = startOfMonthGrid(cursor);
    return [...Array(42)].map((_, i) => addDays(start, i));
  }, [cursor]);

  // Entretiens du jour (depuis lib/calendar)
  function interviewsForDay(day: Date) {
    return list
      .filter((x) => sameDay(new Date(x.ts), day))
      .sort((a, b) => a.ts - b.ts);
  }

  // Candidatures du jour (depuis tracker)
  function applicationsForDay(day: Date) {
    const arr = Tracker.getAll().filter(
      (j) => j.appliedAt && sameDay(new Date(Number(j.appliedAt)), day)
    );
    return arr.sort(
      (a, b) => Number(a.appliedAt || 0) - Number(b.appliedAt || 0)
    );
  }

  /* ---------- DnD entretiens ---------- */
  const dragOverKey = useRef<string | null>(null);
  const [, forceRerender] = useState(0);
  const setDragOverKey = (k: string | null) => {
    dragOverKey.current = k;
    forceRerender((x) => x + 1);
  };

  function onDragStart(ev: React.DragEvent, id: string) {
    ev.dataTransfer.setData("text/calendar-id", id);
    ev.dataTransfer.effectAllowed = "move";
  }
  function onDragOver(ev: React.DragEvent) {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "move";
  }
  function onDragEnter(day: Date) {
    setDragOverKey(day.toDateString());
  }
  function onDragLeave(day: Date) {
    // éviter flicker: on remettra à null au drop ou quand survole autre case
    const k = day.toDateString();
    if (dragOverKey.current === k) setDragOverKey(null);
  }
  function onDrop(ev: React.DragEvent, targetDate: Date) {
    ev.preventDefault();
    const id = ev.dataTransfer.getData("text/calendar-id");
    if (!id) return;
    Cal.moveToDay(
      id,
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate()
    );
    setDragOverKey(null);
    refresh();
  }

  /* ---------- actions ---------- */
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

  // Label mois
  const monthLabel = cursor.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  // Double-clic jour → préremplit le formulaire à 10:00
  function onDayDoubleClick(d: Date) {
    const dd = new Date(d);
    dd.setHours(10, 0, 0, 0);
    setFormWhen(dd.toISOString().slice(0, 16));
    setSelectedDay(d);
  }

  // au premier affichage, sélectionner aujourd’hui par défaut
  useEffect(() => {
    if (!open) return;
    const today = new Date();
    setSelectedDay(today);
  }, [open]);

  /* ----------------------- render ----------------------- */
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop plein écran (couvre bien jusqu’en bas) */}
          <motion.div
            className="fixed inset-0 z-[998] bg-black/55 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Wrapper centré */}
          <motion.div
            className="fixed inset-0 z-[999] p-4 sm:p-6 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Panel compact + scroll interne */}
            <motion.div
              className="
                w-full max-w-5xl max-h-[90vh]
                rounded-2xl border border-border bg-surface
                shadow-[0_30px_120px_-40px_rgba(187,154,247,.35)]
                overflow-hidden flex flex-col
              "
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              transition={{ duration: 0.18 }}
            >
              {/* Header fixe */}
              <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <CalIcon className="w-5 h-5 text-primary" />
                  <div className="text-lg font-semibold">Calendrier</div>
                </div>
                <button
                  onClick={onClose}
                  className="h-9 w-9 grid place-items-center hover:bg-muted/30 rounded-lg"
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body scrollable */}
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 p-5">
                  {/* Col gauche : calendrier mois */}
                  <section className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                      <button
                        className="h-9 w-9 rounded-lg border border-border hover:border-primary grid place-items-center"
                        onClick={() =>
                          setCursor(
                            (d) => new Date(d.getFullYear(), d.getMonth() - 1, 1)
                          )
                        }
                        title="Mois précédent"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="text-base font-medium capitalize">
                        {monthLabel}
                      </div>
                      <button
                        className="h-9 w-9 rounded-lg border border-border hover:border-primary grid place-items-center"
                        onClick={() =>
                          setCursor(
                            (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1)
                          )
                        }
                        title="Mois suivant"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Légende */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-primary inline-block" />
                        Candidature
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-pink-400 inline-block" />
                        Entretien
                      </span>
                    </div>

                    {/* Weekdays */}
                    <div className="grid grid-cols-7 text-xs text-muted-foreground mb-1 px-1">
                      {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(
                        (d) => (
                          <div key={d} className="px-1 py-1">
                            {d}
                          </div>
                        )
                      )}
                    </div>

                    {/* Grille jours */}
                    <div className="grid grid-cols-7 gap-1">
                      {grid.map((day) => {
                        const inMonth = day.getMonth() === cursor.getMonth();
                        const its = interviewsForDay(day);
                        const apps = applicationsForDay(day);
                        const isSelected = selectedDay && sameDay(selectedDay, day);
                        const isDragOver = dragOverKey.current === day.toDateString();

                        // on montre jusqu’à 2 entretiens sous forme de chips draggables
                        const visible = its.slice(0, 2);
                        const extra = its.length - visible.length;

                        return (
                          <div
                            key={day.toISOString()}
                            onDragOver={onDragOver}
                            onDragEnter={() => onDragEnter(day)}
                            onDragLeave={() => onDragLeave(day)}
                            onDrop={(e) => onDrop(e, day)}
                            onDoubleClick={() => onDayDoubleClick(day)}
                            onClick={() => setSelectedDay(day)}
                            className={`min-h-[90px] sm:min-h-[100px] rounded-lg border p-2 cursor-pointer transition relative
                              ${inMonth ? "border-border/70 bg-card/60 hover:bg-card" : "border-border/40 bg-card/30 text-muted-foreground"}
                              ${isSelected ? "outline outline-2 outline-primary/50" : ""}
                              ${isDragOver ? "ring-2 ring-primary/50" : ""}
                            `}
                            title="Cliquer pour voir le détail du jour"
                          >
                            <div className="text-xs mb-1 opacity-70 flex items-center justify-between">
                              <span>{day.getDate()}</span>
                              <span className="inline-flex items-center gap-1">
                                {apps.length > 0 && (
                                  <span
                                    className="inline-block h-2 w-2 rounded-full bg-primary"
                                    title={`${apps.length} candidature(s)`}
                                  />
                                )}
                                {its.length > 0 && (
                                  <span
                                    className="inline-block h-2 w-2 rounded-full bg-pink-400"
                                    title={`${its.length} entretien(s)`}
                                  />
                                )}
                              </span>
                            </div>

                            {/* Chips entretiens draggables directement dans la cellule */}
                            <div className="space-y-1">
                              {visible.map((it) => {
                                const job = jobs.find((j) => j.id === it.jobId);
                                return (
                                  <div
                                    key={it.id}
                                    draggable
                                    onDragStart={(e) => onDragStart(e, it.id)}
                                    className="group text-[11px] sm:text-xs rounded-md border border-border bg-surface/70 px-2 py-1 flex items-center justify-between hover:border-primary"
                                    title={job ? job.title : ""}
                                  >
                                    <span className="truncate">
                                      {fmtHM(it.ts)} — {it.title || (job?.company ?? "Entretien")}
                                    </span>
                                    <span className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1 ml-2 shrink-0">
                                      <button
                                        className="p-0.5 rounded hover:bg-primary/15"
                                        title="Éditer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          editItem(it);
                                        }}
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        className="p-0.5 rounded hover:bg-destructive/15"
                                        title="Supprimer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeItem(it.id);
                                        }}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </span>
                                  </div>
                                );
                              })}
                              {extra > 0 && (
                                <div className="text-[11px] text-muted-foreground">
                                  +{extra} entretien(s)…
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Panneau détail du jour sélectionné */}
                    <div className="mt-4 rounded-xl border border-border bg-card p-3">
                      <div className="text-sm font-medium mb-2">
                        {selectedDay
                          ? selectedDay.toLocaleDateString("fr-FR", {
                              weekday: "long",
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            })
                          : "Sélectionne un jour"}
                      </div>

                      {selectedDay ? (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          {/* Entretiens */}
                          <section className="rounded border border-border p-2">
                            <div className="text-sm mb-2">Entretiens</div>
                            {interviewsForDay(selectedDay).length === 0 ? (
                              <div className="text-sm text-muted-foreground">
                                Aucun entretien ce jour.
                              </div>
                            ) : (
                              <ul className="space-y-2">
                                {interviewsForDay(selectedDay).map((it) => {
                                  const job = jobs.find((j) => j.id === it.jobId);
                                  return (
                                    <li
                                      key={it.id}
                                      draggable
                                      onDragStart={(e) => onDragStart(e, it.id)}
                                      className="group text-sm rounded-md border border-border bg-surface/70 px-3 py-2 flex items-center justify-between hover:border-primary"
                                      title={job ? job.title : ""}
                                    >
                                      <div className="min-w-0">
                                        <div className="truncate">
                                          {fmtHM(it.ts)} — {it.title || job?.company || "Entretien"}
                                        </div>
                                        {(it.location || it.url) && (
                                          <div className="text-xs text-muted-foreground truncate">
                                            {it.location ? `• ${it.location} ` : ""}
                                            {it.url ? "• lien" : ""}
                                          </div>
                                        )}
                                      </div>
                                      <span className="opacity-100 flex items-center gap-1 ml-2 shrink-0">
                                        <button
                                          className="p-1 rounded hover:bg-primary/15"
                                          title="Éditer"
                                          onClick={() => editItem(it)}
                                        >
                                          <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                          className="p-1 rounded hover:bg-destructive/15"
                                          title="Supprimer"
                                          onClick={() => removeItem(it.id)}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </span>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </section>

                          {/* Candidatures */}
                          <section className="rounded border border-border p-2">
                            <div className="text-sm mb-2">Candidatures envoyées</div>
                            {applicationsForDay(selectedDay).length === 0 ? (
                              <div className="text-sm text-muted-foreground">
                                Aucune candidature ce jour.
                              </div>
                            ) : (
                              <ul className="space-y-2">
                                {applicationsForDay(selectedDay).map((j) => (
                                  <li
                                    key={j.id}
                                    className="flex items-center justify-between gap-3 rounded border border-border px-3 py-2"
                                  >
                                    <div className="min-w-0 flex items-center gap-2">
                                      <BankAvatar name={j.company ?? j.source} size={20} />
                                      <a
                                        href={j.link}
                                        target="_blank"
                                        className="truncate text-cyan-400 hover:underline"
                                        rel="noreferrer"
                                      >
                                        {j.title}
                                      </a>
                                    </div>
                                    <span className="text-xs text-muted-foreground shrink-0">
                                      {j.appliedAt ? fmtHM(Number(j.appliedAt)) : ""}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </section>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          Clique sur une case du calendrier pour voir le détail du
                          jour (candidatures & entretiens).
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground mt-2">
                      Astuce : glisse-dépose un <b>entretien</b> sur un autre jour
                      pour le déplacer. Le détail (heure) est conservé. Double-clic
                      sur un jour pour préremplir la date du formulaire.
                    </p>
                  </section>

                  {/* Col droite : formulaire */}
                  <aside className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="text-sm text-muted-foreground">
                      {editing ? "Modifier l’entretien" : "Planifier un entretien"}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs text-muted-foreground">
                        Candidature
                      </label>
                      <select
                        className="w-full h-10 rounded-lg border border-border bg-surface px-2"
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
                      <label className="block text-xs text-muted-foreground">
                        Date & heure
                      </label>
                      <input
                        type="datetime-local"
                        className="w-full h-10 rounded-lg border border-border bg-surface px-2"
                        value={formWhen}
                        onChange={(e) => setFormWhen(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs text-muted-foreground">
                        Titre
                      </label>
                      <input
                        placeholder="Ex : Call RH / Tech round"
                        className="w-full h-10 rounded-lg border border-border bg-surface px-2"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs text-muted-foreground">
                        Lieu / Outil
                      </label>
                      <input
                        placeholder="Teams, Google Meet, Bureau…"
                        className="w-full h-10 rounded-lg border border-border bg-surface px-2"
                        value={formLoc}
                        onChange={(e) => setFormLoc(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs text-muted-foreground">
                        Lien (optionnel)
                      </label>
                      <input
                        type="url"
                        placeholder="https://…"
                        className="w-full h-10 rounded-lg border border-border bg-surface px-2"
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
                          className="h-10 px-3 rounded-lg border border-border hover:border-danger"
                        >
                          Annuler
                        </button>
                      )}
                      <button
                        onClick={submitForm}
                        className="h-10 px-4 rounded-lg border border-border hover:border-primary btn"
                      >
                        {editing ? "Enregistrer" : "Ajouter"}
                      </button>
                    </div>
                  </aside>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
