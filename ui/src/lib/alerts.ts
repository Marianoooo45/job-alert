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
  seenJobIds?: string[];       // annonces déjà vues pour cette alerte
};

const KEY = "ja:alerts";
const EVT = "ja:alerts:changed"; // ⬅️ événement global interne

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function notifyChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVT));
  }
}

export function onChange(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVT, handler);
  // Option bonus: réagit aussi aux changements inter–onglets
  const storageHandler = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  window.addEventListener("storage", storageHandler);
  return () => {
    window.removeEventListener(EVT, handler);
    window.removeEventListener("storage", storageHandler);
  };
}

export function getAll(): Alert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as Alert[]) : [];
    // migration: keyword -> keywords[], + defaults
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
  notifyChange(); // ⬅️ ping toutes les vues
}

export function upsert(a: Alert) {
  if (typeof window === "undefined") return;
  const items = getAll();
  const i = items.findIndex((x) => x.id === a.id);
  if (i >= 0) items[i] = a; else items.push(a);
  saveAll(items);
}

export function create(
  partial: Omit<Alert, "id" | "createdAt" | "lastReadAt" | "seenJobIds">
) {
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
  // compat: met à jour la date de lecture globale
  const items = getAll();
  const i = items.findIndex((x) => x.id === id);
  if (i >= 0) {
    items[i].lastReadAt = Date.now();
    saveAll(items);
  }
}

// Marquer une annonce spécifique comme vue
export function markJobSeen(id: string, jobId: string) {
  const items = getAll();
  const i = items.findIndex((x) => x.id === id);
  if (i >= 0) {
    const seen = items[i].seenJobIds ?? [];
    items[i].seenJobIds = uniq([...seen, jobId]);
    saveAll(items);
  }
}

// Marquer plusieurs annonces comme vues (ex: “Marquer tout lu”)
export function markJobsSeen(id: string, jobIds: string[]) {
  const items = getAll();
  const i = items.findIndex((x) => x.id === id);
  if (i >= 0) {
    const seen = items[i].seenJobIds ?? [];
    items[i].seenJobIds = uniq([...seen, ...jobIds]);
    items[i].lastReadAt = Date.now();
    saveAll(items);
  }
}
