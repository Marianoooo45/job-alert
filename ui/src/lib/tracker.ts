// ui/src/lib/tracker.ts
export type AppStatus = "applied" | "shortlist" | "rejected";

export type SavedJob = {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  link: string;
  posted: string;
  source: string;
  status: AppStatus;
  savedAt: number;
};

const KEY = "ja:applications";

export function getAll(): SavedJob[] {
  if (typeof window === "undefined") return [];
  try {
    const s = localStorage.getItem(KEY);
    return s ? (JSON.parse(s) as SavedJob[]) : [];
  } catch {
    return [];
  }
}

export function setStatus(job: Omit<SavedJob, "status" | "savedAt">, status: AppStatus) {
  if (typeof window === "undefined") return;
  const items = getAll();
  const i = items.findIndex((x) => x.id === job.id);
  const entry: SavedJob = { ...job, status, savedAt: Date.now() };
  if (i >= 0) items[i] = { ...items[i], ...entry };
  else items.push(entry);
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function clearJob(id: string) {
  if (typeof window === "undefined") return;
  const items = getAll().filter((j) => j.id !== id);
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function stats() {
  const items = getAll();
  return {
    total: items.length,
    applied: items.filter((i) => i.status === "applied").length,
    shortlist: items.filter((i) => i.status === "shortlist").length,
    rejected: items.filter((i) => i.status === "rejected").length,
  };
}
