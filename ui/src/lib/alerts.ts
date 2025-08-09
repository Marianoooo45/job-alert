// ui/src/lib/alerts.ts
export type Alert = {
  id: string;
  name: string;
  query: {
    keyword?: string;
    banks?: string[];
    categories?: string[];
    contractTypes?: string[];
  };
  frequency?: "instant" | "daily";
  createdAt: number;
  lastReadAt: number;
};

const KEY = "ja:alerts";

export function getAll(): Alert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as Alert[]) : [];
    return arr.map((a) => ({
      frequency: "instant",
      lastReadAt: 0,
      ...a,
    }));
  } catch {
    return [];
  }
}

export function upsert(a: Alert) {
  if (typeof window === "undefined") return;
  const items = getAll();
  const i = items.findIndex((x) => x.id === a.id);
  if (i >= 0) items[i] = a; else items.push(a);
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function create(partial: Omit<Alert, "id" | "createdAt" | "lastReadAt">) {
  const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  const a: Alert = {
    id,
    createdAt: Date.now(),
    lastReadAt: 0,
    ...partial,
  };
  upsert(a);
  return a;
}

export function remove(id: string) {
  if (typeof window === "undefined") return;
  const items = getAll().filter((x) => x.id !== id);
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function markRead(id: string) {
  const items = getAll();
  const i = items.findIndex((x) => x.id === id);
  if (i >= 0) {
    items[i].lastReadAt = Date.now();
    localStorage.setItem(KEY, JSON.stringify(items));
  }
}
