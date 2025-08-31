// ui/src/lib/useUserSettings.ts
"use client";

import { useEffect, useState } from "react";

export type UserSettings = {
  notifEmail: boolean;
  publicProfile: boolean;
  autoUpdate: boolean;
};

const DEFAULTS: UserSettings = {
  notifEmail: false,
  publicProfile: false,
  autoUpdate: false,
};

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const r = await fetch("/api/user/settings", {
          cache: "no-store",
          credentials: "include",
        });
        const j = await r.json();
        if (cancel) return;
        setSettings(j?.settings ?? DEFAULTS);
      } catch {
        if (!cancel) setSettings(DEFAULTS);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  async function save(patch: Partial<UserSettings>) {
    const next = { ...(settings ?? DEFAULTS), ...patch };
    setSettings(next);
    try {
      await fetch("/api/user/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
    } catch {
      // silencieux : on garde l’UI responsive même si la requête échoue
    }
  }

  return { settings, loading, save };
}
