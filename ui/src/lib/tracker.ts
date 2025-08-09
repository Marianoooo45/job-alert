// ui/src/lib/tracker.ts
export type AppStatus = "applied" | "shortlist" | "rejected" | "offer";
export type Stage = "applied" | "phone" | "interview" | "final" | "offer" | "rejected";

/** Détail d’un entretien */
export type Interview = {
  ts: number;          // timestamp ms
  note?: string;
  location?: string;
  url?: string;
};

export type SavedJob = {
  id: string;
  title: string;
  company: string | null;   // banque
  location: string | null;
  link: string;
  posted: string;           // date de l’annonce
  source: string;           // code banque
  status: AppStatus;        // statut final/courant
  stage: Stage;             // étape actuelle du process
  appliedAt?: number;       // timestamps (ms)
  respondedAt?: number;     // date première réponse
  interviews?: number;      // nb d’entretiens (compteur legacy)
  interviewDetails?: Interview[]; // événements calendrier
  notes?: string;           // libre
  savedAt: number;
};

const KEY = "ja:applications";

/** migration: interviewDates[] (ancien) -> interviewDetails[] */
function migrate(items: any[]): SavedJob[] {
  return (items ?? []).map((x) => {
    const idates: number[] = Array.isArray(x.interviewDates)
      ? x.interviewDates.filter((n: any) => Number.isFinite(+n)).map((n: any) => +n)
      : [];

    const details: Interview[] = Array.isArray(x.interviewDetails)
      ? x.interviewDetails
          .filter((d: any) => d && Number.isFinite(+d.ts))
          .map((d: any) => ({ ts: +d.ts, note: d.note ?? "", location: d.location ?? "", url: d.url ?? "" }))
      : idates.map((ts) => ({ ts }));

    const interviews = Number.isFinite(+x.interviews) ? +x.interviews : details.length || 0;

    return {
      stage: x.stage ?? (x.status === "shortlist" ? "interview" : x.status ?? "applied"),
      status: x.status ?? "applied",
      interviewDetails: details.sort((a: Interview, b: Interview) => a.ts - b.ts),
      interviews,
      appliedAt: x.appliedAt ?? x.savedAt ?? Date.now(),
      respondedAt: x.respondedAt,
      notes: x.notes ?? "",
      ...x,
    } as SavedJob;
  });
}

export function getAll(): SavedJob[] {
  if (typeof window === "undefined") return [];
  try {
    const s = localStorage.getItem(KEY);
    const raw = s ? (JSON.parse(s) as any[]) : [];
    return migrate(raw);
  } catch {
    return [];
  }
}

function saveAll(items: SavedJob[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function upsert(job: Partial<SavedJob> & Pick<SavedJob,"id">) {
  if (typeof window === "undefined") return;
  const items = getAll();
  const i = items.findIndex((j) => j.id === job.id);
  const merged: SavedJob = {
    ...(i >= 0 ? items[i] : (job as SavedJob)),
    ...job,
    savedAt: i >= 0 ? items[i].savedAt : Date.now(),
  };
  if (i >= 0) items[i] = merged; else items.push(merged);
  saveAll(items);
}

export function setStatus(job: Omit<SavedJob,"status"|"savedAt">, status: AppStatus) {
  upsert({ ...job, status });
}

export function setStage(id: string, stage: Stage) {
  upsert({ id, stage });
}

/* ===== Entretiens ===== */

function nextUniqueTimestamp(ts: number, arr: Interview[]) {
  // évite collisions si on clique plusieurs fois la même minute
  while (arr.some((d) => d.ts === ts)) ts += 60 * 1000;
  return ts;
}

/**
 * Incrémente/décrémente le compteur ET synchronise le calendrier.
 * - delta > 0 : ajoute un événement (opts.ts sinon maintenant)
 * - delta < 0 : supprime le **dernier** événement (le plus récent)
 */
export function incInterviews(
  id: string,
  delta = 1,
  opts?: { ts?: number; note?: string; location?: string; url?: string }
) {
  const items = getAll();
  const it = items.find((x) => x.id === id);
  if (!it) return;

  let details = [...(it.interviewDetails ?? [])].sort((a, b) => a.ts - b.ts);

  if (delta > 0) {
    const base = opts?.ts ?? Date.now();
    const ts = nextUniqueTimestamp(base, details);
    details.push({ ts, note: opts?.note, location: opts?.location, url: opts?.url });
    details.sort((a, b) => a.ts - b.ts);
  } else if (delta < 0 && details.length > 0) {
    details = details.slice(0, -1); // retire le plus récent
  }

  const count = Math.max(0, (it.interviews ?? 0) + delta);
  upsert({ id, interviews: Math.max(count, details.length), interviewDetails: details });
}

export function addInterview(id: string, detail: Interview) {
  const items = getAll();
  const it = items.find((x) => x.id === id);
  if (!it) return;
  const dedup = new Map<number, Interview>();
  [...(it.interviewDetails ?? []), detail].forEach((d) =>
    dedup.set(d.ts, { ...dedup.get(d.ts), ...d })
  );
  const arr = Array.from(dedup.values()).sort((a, b) => a.ts - b.ts);
  upsert({ id, interviewDetails: arr, interviews: Math.max(arr.length, it.interviews ?? 0) });
}

export function updateInterview(id: string, prevTs: number, next: Partial<Interview>) {
  const items = getAll();
  const it = items.find((x) => x.id === id);
  if (!it) return;
  const arr = (it.interviewDetails ?? [])
    .map((d) => (d.ts === prevTs ? { ...d, ...next, ts: next.ts ?? d.ts } : d))
    .sort((a, b) => a.ts - b.ts);
  upsert({ id, interviewDetails: arr, interviews: Math.max(arr.length, it.interviews ?? 0) });
}

export function removeInterview(id: string, ts: number) {
  const items = getAll();
  const it = items.find((x) => x.id === id);
  if (!it) return;
  const arr = (it.interviewDetails ?? []).filter((d) => d.ts !== ts);
  upsert({ id, interviewDetails: arr, interviews: Math.max(arr.length, it.interviews ?? 0) });
}

export function setResponded(id: string, ts = Date.now()) {
  upsert({ id, respondedAt: ts });
}

export function clearJob(id: string) {
  if (typeof window === "undefined") return;
  const items = getAll().filter((j) => j.id !== id);
  saveAll(items);
}

/* ====== Analytics ====== */
export function stats() {
  const items = getAll();
  const applied = items.filter(i => i.status === "applied").length;
  const shortlist = items.filter(i => i.status === "shortlist").length;
  const rejected = items.filter(i => i.status === "rejected").length;
  const offer = items.filter(i => i.status === "offer").length;
  const interviews = items.reduce((s,i)=> s + (i.interviews ?? 0), 0);

  const responded = items.filter(i => !!i.respondedAt).length;
  const responseRate = items.length ? Math.round(responded*100/items.length) : 0;

  const ttrArr = items
    .filter(i => i.appliedAt && i.respondedAt && i.respondedAt > i.appliedAt)
    .map(i => (i.respondedAt! - i.appliedAt!) / 86400000);
  const timeToResponse = ttrArr.length ? +(ttrArr.reduce((a,b)=>a+b,0)/ttrArr.length).toFixed(1) : 0;

  return { total: items.length, applied, shortlist, rejected, offer, interviews, responseRate, timeToResponse };
}

export function byBank() {
  const m: Record<string, { total:number; responded:number; interviews:number; offer:number; rejected:number; shortlist:number; }> = {};
  for (const i of getAll()) {
    const k = i.company ?? i.source ?? "Autre";
    m[k] ??= { total:0, responded:0, interviews:0, offer:0, rejected:0, shortlist:0 };
    m[k].total++; 
    if (i.respondedAt) m[k].responded++;
    m[k].interviews += i.interviews ?? 0;
    if (i.status === "offer") m[k].offer++;
    if (i.status === "rejected") m[k].rejected++;
    if (i.status === "shortlist") m[k].shortlist++;
  }
  return Object.entries(m).map(([bank,v]) => ({
    bank,
    ...v,
    responseRate: v.total ? +(100*v.responded/v.total).toFixed(0) : 0,
    hitRate: v.total ? +(100*(v.offer)/v.total).toFixed(0) : 0,
    shortlistRate: v.total ? +(100*(v.shortlist)/v.total).toFixed(0) : 0,
  })).sort((a,b)=> b.total - a.total);
}

export function weeklyApplied(weeks=8) {
  const bins: Record<string, number> = {};
  const now = new Date();
  for (let k=weeks-1;k>=0;k--){
    const d = new Date(now); d.setDate(d.getDate() - d.getDay() - 7*k); // dimanche précédent
    const key = d.toISOString().slice(0,10);
    bins[key] = 0;
  }
  for (const i of getAll()) {
    const d = new Date(i.appliedAt ?? i.savedAt);
    const weekKey = new Date(d); weekKey.setDate(d.getDate() - d.getDay());
    const key = weekKey.toISOString().slice(0,10);
    if (key in bins) bins[key] += 1;
  }
  return Object.entries(bins).map(([week,value]) => ({ week, value }));
}

/* ====== Calendrier ====== */
export type CalEventType = "applied" | "interview";
export type CalEvent = { date: number; type: CalEventType; job: SavedJob; meta?: Interview };

export function eventsForMonth(year: number, month0: number): CalEvent[] {
  const start = new Date(year, month0, 1).getTime();
  const end = new Date(year, month0 + 1, 0, 23, 59, 59, 999).getTime();
  const out: CalEvent[] = [];
  for (const j of getAll()) {
    if (j.appliedAt && j.appliedAt >= start && j.appliedAt <= end) {
      out.push({ date: j.appliedAt, type: "applied", job: j });
    }
    for (const d of j.interviewDetails ?? []) {
      if (d.ts >= start && d.ts <= end) {
        out.push({ date: d.ts, type: "interview", job: j, meta: d });
      }
    }
  }
  return out.sort((a,b)=>a.date-b.date);
}

/** Jours à relancer: au moins 1 candidature >7j sans réponse */
export function reminderDaysForMonth(year: number, month0: number): Set<string> {
  const set = new Set<string>();
  const start = new Date(year, month0, 1).getTime();
  const end = new Date(year, month0 + 1, 0, 23, 59, 59, 999).getTime();
  const seven = 7 * 24 * 3600 * 1000;
  for (const j of getAll()) {
    if (j.appliedAt && j.appliedAt >= start && j.appliedAt <= end) {
      if (!j.respondedAt && (Date.now() - j.appliedAt) > seven) {
        const key = new Date(j.appliedAt).toDateString();
        set.add(key);
      }
    }
  }
  return set;
}
