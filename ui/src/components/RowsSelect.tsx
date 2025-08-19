// ui/src/components/RowsSelect.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

const OPTIONS = [10, 25, 50, 100];

export default function RowsSelect() {
  const router = useRouter();
  const params = useSearchParams();

  const urlRows = Number(params.get("rows") || "");
  const cookieMatch = typeof document !== "undefined"
    ? document.cookie.match(/(?:^|;\s*)rows_per_page_v1=(\d+)/)
    : null;
  const cookieRows = cookieMatch ? Number(cookieMatch[1]) : undefined;

  const current = (urlRows || cookieRows || 25);

  function setRows(n: number) {
    // cookie 6 mois
    document.cookie = `rows_per_page_v1=${n}; Max-Age=${60 * 60 * 24 * 180}; Path=/; SameSite=Lax`;
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
          const active = n === current;
          return (
            <button
              key={n}
              aria-pressed={active}
              onClick={() => setRows(n)}
              className={`seg-item mx-0.5 h-8 w-12 rounded-xl border px-2 text-sm transition
                ${active ? "bg-primary text-background border-primary"
                         : "bg-surface text-foreground border-border hover:border-primary"}`}
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
