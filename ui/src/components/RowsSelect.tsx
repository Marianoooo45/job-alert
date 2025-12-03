"use client";

import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

const OPTIONS = [10, 25, 50, 100] as const;
type Rows = (typeof OPTIONS)[number];

export default function RowsSelect() {
  const router = useRouter();
  const params = useSearchParams();
  const [rows, setRows] = React.useState<Rows>(25);

  React.useEffect(() => {
    const u = Number(params.get("rows"));
    if (OPTIONS.includes(u as Rows)) setRows(u as Rows);
  }, [params]);

  function setRowsAndNavigate(n: Rows) {
    document.cookie = `rows_per_page_v1=${n}; Max-Age=${60*60*24*30}; Path=/`;
    setRows(n);
    const next = new URLSearchParams(params.toString());
    next.set("rows", String(n));
    next.set("page", "1");
    router.replace(`/offers?${next.toString()}`, { scroll: false });
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase font-mono text-muted-foreground tracking-wider hidden sm:inline">Rows</span>
      {/* bg-white/5 -> bg-surface-muted */}
      <div className="flex items-center bg-surface-muted rounded-md p-0.5 border border-border">
        {OPTIONS.map((n) => {
          const active = n === rows;
          return (
            <button
              key={n}
              onClick={() => setRowsAndNavigate(n)}
              // bg-slate-700 -> bg-background (ou primary)
              className={`h-6 px-2.5 rounded text-[11px] font-medium font-mono transition-all ${
                active 
                  ? "bg-background text-foreground shadow-sm border border-border" 
                  : "text-muted-foreground hover:text-foreground"
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