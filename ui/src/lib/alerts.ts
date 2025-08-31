// ui/src/lib/alerts.ts
export type Alert = {
  id: string;
  name: string;
  query: {
    keywords?: string[];
    banks?: string[];
    categories?: string[];
    contractTypes?: string[];
  };
  frequency?: "instant" | "daily";
  createdAt: number;
  lastReadAt: number;
  seenJobIds?: string[];
};

const KEY = "ja:alerts";
const EVT = "ja:alerts:changed";

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

// ====== SYNC HELPERS ======
async function isAuthed(): Promise<boolean> {
  try {
    const r = await fetch("/api/me", { cache: "no-store", credentials: "include" });
    if (!r.ok) return false;
    const j = await r.json();
    return !!j?.authenticated;
  } catch {
    return false;
  }
}

async function pushServer(items: Alert[]) {
  try {
    await fetch("/api/user/alerts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ alerts: items }),
    });
  } catch {}
}

export async function hydrateFromServer() {
  if (!(await isAuthed())) return;
  try {
    const r = await fetch("/api/user/alerts", { cache: "no-store", credentials: "include" });
    if (!r.ok) return;
    const j = await r.json();
    if (!Array.isArray(j?.alerts)) return;
    // Remplace local UNIQUEMENT si différent
    const local = getAll();
    const a = JSON.stringify(local);
    const b = JSON.stringify(j.alerts);
    if (a !== b) {
      localStorage.setItem(KEY, JSON.stringify(j.alerts));
      notifyChange();
    }
  } catch {}
}
// ====== /SYNC HELPERS ======

export function normalizeKeywords(arr?: string[]): string[] | undefined {
  if (!arr || arr.length === 0) return undefined;
  const cleaned = arr
    .map((s) =>
      String(s || "")
        .trim()
        .replace(/^[#＃]+/, "")
        .replace(/\s+/g, " ")
    )
    .filter((s) => s.length > 0);
  const uniqed = uniq(cleaned);
  return uniqed.length ? uniqed : undefined;
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
    return arr.map((a: any) => {
      const q = a.query ?? {};
      if (q.keyword && !q.keywords) {
        q.keywords = [String(q.keyword)];
        delete q.keyword;
      }
      if (q.keywords) q.keywords = normalizeKeywords(q.keywords);
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

async function saveAll(items: Alert[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
  notifyChange();
  // push serveur (fire & forget, ok si non connecté -> 401 ignoré)
  pushServer(items);
}

export function upsert(a: Alert) {
  if (typeof window === "undefined") return;
  if (a.query?.keywords) {
    a = { ...a, query: { ...a.query, keywords: normalizeKeywords(a.query.keywords) } };
  }
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
    query: { ...partial.query, keywords: normalizeKeywords(partial.query?.keywords) },
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
  const items = getAll();
  const i = items.findIndex((x) => x.id === id);
  if (i >= 0) {
    items[i].lastReadAt = Date.now();
    saveAll(items);
  }
}

export function markJobSeen(id: string, jobId: string) {
  const items = getAll();
  const i = items.findIndex((x) => x.id === id);
  if (i >= 0) {
    const seen = items[i].seenJobIds ?? [];
    items[i].seenJobIds = uniq([...seen, jobId]);
    saveAll(items);
  }
}

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
