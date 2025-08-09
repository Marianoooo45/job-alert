// ui/src/lib/alerts.ts
export type Alert = {
  id: string;
  bank?: string;
  keyword?: string;
  category?: string;
  frequency?: "instant" | "daily";
  createdAt: number;
};

const KEY = "ja:alerts";

export function getAll(): Alert[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as Alert[];
  } catch {
    return [];
  }
}

export function addAlert(alert: Omit<Alert, "id" | "createdAt">) {
  if (typeof window === "undefined") return;
  const alerts = getAll();
  const newAlert: Alert = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    ...alert,
  };
  alerts.push(newAlert);
  localStorage.setItem(KEY, JSON.stringify(alerts));
}

export function clearAlert(id: string) {
  if (typeof window === "undefined") return;
  const alerts = getAll().filter((a) => a.id !== id);
  localStorage.setItem(KEY, JSON.stringify(alerts));
}
