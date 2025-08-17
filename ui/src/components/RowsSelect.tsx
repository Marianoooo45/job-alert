"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const OPTIONS = [10, 25, 50, 100, 200];
const LS_KEY = "rows_per_page_v1";

export default function RowsSelect() {
  const router = useRouter();
  const sp = useSearchParams();
  const current = Math.max(10, Math.min(200, parseInt(String(sp.get("rows") || "25"), 10) || 25));
  const [value, setValue] = useState<number>(current);

  // Si l'URL n'a pas rows mais le localStorage oui → pousse rows
  useEffect(() => {
    if (!sp.get("rows")) {
      const saved = Number(localStorage.getItem(LS_KEY) || "");
      if (saved && OPTIONS.includes(saved)) {
        const p = new URLSearchParams(sp.toString());
        p.set("rows", String(saved));
        p.set("page", "1");
        router.push(`/?${p.toString()}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyRows(n: number) {
    setValue(n);
    localStorage.setItem(LS_KEY, String(n));
    const p = new URLSearchParams(sp.toString());
    p.set("rows", String(n));
    p.set("page", "1"); // reset à la première page
    router.push(`/?${p.toString()}`);
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">Lignes :</span>
      <div className="inline-flex rounded-lg border border-border bg-card p-1">
        {OPTIONS.map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              onClick={() => applyRows(n)}
              className={`px-2.5 h-8 rounded-md transition text-sm ${
                active
                  ? "bg-primary text-background shadow-[var(--glow-weak)]"
                  : "text-foreground hover:bg-[color-mix(in_oklab,var(--color-primary)_12%,transparent)]"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
