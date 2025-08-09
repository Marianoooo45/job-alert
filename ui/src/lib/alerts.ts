// ui/src/lib/alerts.ts
export type Alert = {
  id: string;
  name: string;
  query: {
    keywords?: string[];       // multi-tags
    banks?: string[];
    categories?: string[];
    contractTypes?: string[];
  };
  frequency?: "instant" | "daily";
  createdAt: number;
  lastReadAt: number;
  seenJobIds?: string[];       // ⬅️ NEW: annonces déjà vues pour cette alerte
};

const KEY = "ja:alerts";

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function getAll(): Alert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as Alert[]) : [];
    // migration: keyword -> keywords[], + défauts (frequency, lastReadAt, seenJobIds)
    return arr.map((a: any) => {
      const q = a.query ?? {};
      if (q.keyword && !q.keywords) {
        q.keywords = [String(q.keyword)];
        delete q.keyword;
      }
      const seen = Array.isArray(a.seenJobIds) ? uniq(a.seenJobIds) : [];
      return {
        frequency: "instant",
        lastReadAt: 0,
        seenJobIds: seen,
        ...a,
        query: q,
      } as Alert;
    });
  } catch {
    return [];
  }
}

function saveAll(items: Alert[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function upsert(a: Alert) {
  if (typeof window === "undefined") return;
  const items = getAll();
  const i = items.findIndex((x) => x.id === a.id);
  if (i >= 0) items[i] = a; else items.push(a);
  saveAll(items);
}

export function create(partial: Omit<Alert, "id" | "createdAt" | "lastReadAt" | "seenJobIds">) {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
  const a: Alert = {
    id,
    createdAt: Date.now(),
    lastReadAt: 0,
    seenJobIds: [],
    ...partial,
  };
  upsert(a);
  return a;
}

export function remove(id: string) {
  if (typeof window === "undefined") return;
  const items = getAll().filter((x) => x.id !== id);
  saveAll(items);
}

export function markRead(id: string) {
  // garde pour compat; met juste à jour lastReadAt
  const items = getAll();
  const i = items.findIndex((x) => x.id === id);
  if (i >= 0) {
    items[i].lastReadAt = Date.now();
    saveAll(items);
  }
}

// ⬇️ NEW: marquer une annonce spécifique comme vue
export function markJobSeen(id: string, jobId: string) {
  const items = getAll();
  const i = items.findIndex((x) => x.id === id);
  if (i >= 0) {
    const seen = items[i].seenJobIds ?? [];
    items[i].seenJobIds = uniq([...seen, jobId]);
    saveAll(items);
  }
}

// ⬇️ NEW: marquer plusieurs annonces comme vues (ex: “Marquer tout lu”)
export function markJobsSeen(id: string, jobIds: string[]) {
  const items = getAll();
  const i = items.findIndex((x) => x.id === id);
  if (i >= 0) {
    const seen = items[i].seenJobIds ?? [];
    items[i].seenJobIds = uniq([...seen, ...jobIds]);
    items[i].lastReadAt = Date.now(); // bonus: on met à jour la date de lecture globale
    saveAll(items);
  }
}
