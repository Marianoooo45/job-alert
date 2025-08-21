// ui/src/components/RowsSelect.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

const OPTIONS = [10, 25, 50, 100] as const;
type Rows = (typeof OPTIONS)[number];

export default function RowsSelect() {
  const router = useRouter();
  const params = useSearchParams();

  const urlRowsRaw = Number(params.get("rows") || "");
  const urlRows = (OPTIONS as readonly number[]).includes(urlRowsRaw)
    ? (urlRowsRaw as Rows)
    : undefined;

  const [rows, setRows] = React.useState<Rows>(urlRows ?? 25);

  React.useEffect(() => {
    if (urlRows !== undefined) return;
    try {
      const m = document.cookie.match(/(?:^|;\s*)rows_per_page_v1=(\d+)/);
      const c = m ? Number(m[1]) : NaN;
      if ((OPTIONS as readonly number[]).includes(c)) {
        setRows(c as Rows);
        const next = new URLSearchParams(params.toString());
        next.set("rows", String(c));
        next.set("page", "1");
        router.replace(`/offers?${next.toString()}`, { scroll: true });
        window.scrollTo({ top: 0, behavior: "auto" });
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setRowsAndNavigate(n: Rows) {
    try {
      document.cookie = `rows_per_page_v1=${n}; Max-Age=${60 * 60 * 24 * 180}; Path=/; SameSite=Lax`;
    } catch {}
    setRows(n);
    const next = new URLSearchParams(params.toString());
    next.set("rows", String(n));
    next.set("page", "1");
    router.push(`/offers?${next.toString()}`, { scroll: true });
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Lignes :</span>

      {/* ✅ segmented unifié (rond) */}
      <div className="segmented" data-size="sm" data-segmented>
        {OPTIONS.map((n) => {
          const active = n === rows;
          return (
            <button
              key={n}
              aria-pressed={active}
              onClick={() => setRowsAndNavigate(n as Rows)}
              className="seg-item text-sm w-12"
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
