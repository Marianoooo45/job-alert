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
  createdAt: number;
  lastReadAt: number;
};

const KEY = "ja:alerts";

export function getAll(): Alert[] {
  if (typeof window === "undefined") return [];
  try {
    const s = localStorage.getItem(KEY);
    return s ? (JSON.parse(s) as Alert[]) : [];
  } catch {
    return [];
  }
}

export function upsert(alert: Alert) {
  const items = getAll();
  const i = items.findIndex((a) => a.id === alert.id);
  if (i >= 0) items[i] = alert;
  else items.push(alert);
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function remove(id: string) {
  const items = getAll().filter((a) => a.id !== id);
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function markRead(id: string) {
  const items = getAll();
  const i = items.findIndex((a) => a.id === id);
  if (i >= 0) {
    items[i].lastReadAt = Date.now();
    localStorage.setItem(KEY, JSON.stringify(items));
  }
}
