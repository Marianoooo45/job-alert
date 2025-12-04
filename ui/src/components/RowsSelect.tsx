"use client";

import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { Layers } from "lucide-react";

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
    <div className="relative group">
      {/* Glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-purple-500/20 to-secondary/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative flex items-center gap-3 px-4 py-2 rounded-xl bg-background/60 backdrop-blur-xl border border-border/50 shadow-lg group-hover:border-primary/30 transition-all duration-300">
        {/* Icon */}
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <span className="text-[10px] uppercase font-mono text-muted-foreground tracking-[0.15em] hidden sm:inline">
            Rows
          </span>
        </div>

        {/* Separator */}
        <div className="h-5 w-px bg-gradient-to-b from-transparent via-border to-transparent" />

        {/* Options */}
        <div className="flex items-center gap-1.5">
          {OPTIONS.map((n) => {
            const active = n === rows;
            return (
              <button
                key={n}
                onClick={() => setRowsAndNavigate(n)}
                className={`relative h-8 min-w-[2.5rem] px-3 rounded-lg text-xs font-bold font-mono transition-all duration-300 overflow-hidden group/btn ${
                  active 
                    ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] scale-105" 
                    : "text-muted-foreground hover:text-foreground hover:bg-primary/10 hover:scale-105"
                }`}
              >
                {/* Animated background for active */}
                {active && (
                  <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-secondary opacity-100 animate-gradient" />
                )}
                
                {/* Hover glow */}
                {!active && (
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                )}
                
                <span className="relative z-10">{n}</span>

                {/* Active indicator */}
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-white/50 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
}