// ui/src/lib/tracker.ts
export type AppStatus = "applied" | "shortlist" | "rejected" | "offer";
export type Stage = "applied" | "phone" | "interview" | "final" | "offer" | "rejected";

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
  interviews?: number;      // nb d’entretiens passés
  notes?: string;           // libre
  savedAt: number;
};

const KEY = "ja:applications";

function migrate(items: any[]): SavedJob[] {
  return (items ?? []).map((x) => ({
    stage: x.stage ?? (x.status === "shortlist" ? "interview" : x.status ?? "applied"),
    status: x.status ?? "applied",
    interviews: x.interviews ?? 0,
    appliedAt: x.appliedAt ?? x.savedAt ?? Date.now(),
    respondedAt: x.respondedAt,
    notes: x.notes ?? "",
    ...x,
  }));
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
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function setStatus(job: Omit<SavedJob,"status"|"savedAt">, status: AppStatus) {
  upsert({ ...job, status });
}

export function setStage(id: string, stage: Stage) {
  upsert({ id, stage });
}

export function incInterviews(id: string, delta=1) {
  const items = getAll();
  const it = items.find((x) => x.id === id);
  if (!it) return;
  upsert({ id, interviews: Math.max(0, (it.interviews ?? 0) + delta) });
}

export function setResponded(id: string, ts = Date.now()) {
  upsert({ id, respondedAt: ts });
}

export function clearJob(id: string) {
  if (typeof window === "undefined") return;
  const items = getAll().filter((j) => j.id !== id);
  localStorage.setItem(KEY, JSON.stringify(items));
}

// === Analytics helpers ===
export function stats() {
  const items = getAll();
  const applied = items.filter(i => i.status === "applied").length;
  const shortlist = items.filter(i => i.status === "shortlist").length;
  const rejected = items.filter(i => i.status === "rejected").length;
  const offer = items.filter(i => i.status === "offer").length;
  const interviews = items.reduce((s,i)=> s + (i.interviews ?? 0), 0);

  // Réponse = respondedAt défini
  const responded = items.filter(i => !!i.respondedAt).length;
  const responseRate = items.length ? Math.round(responded*100/items.length) : 0;

  // Time-to-response (moyenne jours)
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
  // array + ratio
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
