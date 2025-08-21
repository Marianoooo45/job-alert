// ui/src/components/RowsSelect.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

const OPTIONS = [10, 25, 50, 100] as const;
type Rows = (typeof OPTIONS)[number];

export default function RowsSelect() {
  const router = useRouter();
  const params = useSearchParams();

  // 🔒 Valeur stable au 1er render (SSR + client) : URL > défaut
  const urlRowsRaw = Number(params.get("rows") || "");
  const urlRows = (OPTIONS as readonly number[]).includes(urlRowsRaw)
    ? (urlRowsRaw as Rows)
    : undefined;

  const [rows, setRows] = React.useState<Rows>(urlRows ?? 25);

  // ✅ Après montage seulement, on prend le cookie si l'URL ne fixe rien
  React.useEffect(() => {
    if (urlRows !== undefined) return; // l'URL gagne, ne pas override
    try {
      const m = document.cookie.match(/(?:^|;\s*)rows_per_page_v1=(\d+)/);
      const c = m ? Number(m[1]) : NaN;
      if ((OPTIONS as readonly number[]).includes(c)) {
        setRows(c as Rows);
        const next = new URLSearchParams(params.toString());
        next.set("rows", String(c));
        next.set("page", "1");
        router.replace(`/offers?${next.toString()}`); // pas d'entrée d'historique
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  function setRowsAndNavigate(n: Rows) {
    try {
      document.cookie = `rows_per_page_v1=${n}; Max-Age=${60 * 60 * 24 * 180}; Path=/; SameSite=Lax`;
    } catch {}
    setRows(n);
    const next = new URLSearchParams(params.toString());
    next.set("rows", String(n));
    next.set("page", "1");
    router.push(`/offers?${next.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Lignes :</span>
      <div className="segmented rounded-2xl border border-border px-1 py-1" data-segmented>
        {OPTIONS.map((n) => {
          const active = n === rows;
          return (
            <button
              key={n}
              aria-pressed={active}
              onClick={() => setRowsAndNavigate(n as Rows)}
              className={`seg-item mx-0.5 h-8 w-12 rounded-xl border px-2 text-sm transition ${
                active
                  ? "bg-primary text-background border-primary"
                  : "bg-surface text-foreground border-border hover:border-primary"
              }`}
              title={`${n} lignes`}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
