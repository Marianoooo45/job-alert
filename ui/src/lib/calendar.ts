// ui/src/lib/calendar.ts
export type CalendarItem = {
  id: string;          // uuid
  jobId: string;       // référence SavedJob.id
  ts: number;          // timestamp (ms)
  durationMin?: number;
  title?: string;      // ex: "Call RH"
  location?: string;   // "Teams", "Bureau", etc.
  url?: string;        // lien visio
  notes?: string;
};

const KEY = "ja:calendar_interviews_v1";

function uuid() {
  // crypto.randomUUID si dispo
  if (typeof crypto !== "undefined" && (crypto as any).randomUUID) {
    return (crypto as any).randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getAll(): CalendarItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CalendarItem[]) : [];
  } catch {
    return [];
  }
}

function saveAll(items: CalendarItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function add(item: Omit<CalendarItem, "id">): CalendarItem {
  const it: CalendarItem = { id: uuid(), ...item };
  const list = getAll();
  list.push(it);
  saveAll(list);
  return it;
}

export function update(id: string, patch: Partial<CalendarItem>) {
  const list = getAll();
  const i = list.findIndex((x) => x.id === id);
  if (i >= 0) {
    list[i] = { ...list[i], ...patch };
    saveAll(list);
  }
}

export function remove(id: string) {
  const list = getAll().filter((x) => x.id !== id);
  saveAll(list);
}

export function moveToDay(id: string, y: number, m: number, d: number) {
  // conserve l'heure/minutes
  const list = getAll();
  const it = list.find((x) => x.id === id);
  if (!it) return;
  const old = new Date(it.ts);
  const next = new Date(old);
  next.setFullYear(y, m, d);
  it.ts = next.getTime();
  saveAll(list);
}

export function byDay(year: number, month0: number, day: number): CalendarItem[] {
  const list = getAll();
  return list
    .filter((x) => {
      const dt = new Date(x.ts);
      return (
        dt.getFullYear() === year && dt.getMonth() === month0 && dt.getDate() === day
      );
    })
    .sort((a, b) => a.ts - b.ts);
}

export function inRange(startTs: number, endTs: number): CalendarItem[] {
  const list = getAll();
  return list
    .filter((x) => x.ts >= startTs && x.ts < endTs)
    .sort((a, b) => a.ts - b.ts);
}
