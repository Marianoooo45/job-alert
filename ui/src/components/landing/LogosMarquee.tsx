// ui/src/components/landing/LogosMarquee.tsx
// -------------------------------------------------------------
"use client";

import * as React from "react";
import { BANKS_LIST } from "@/config/banks";
import BankAvatar from "@/components/BankAvatar";

// Simple CSS marquee (pause on hover). Respects reduced motion by disabling scroll.
const trackStyle: React.CSSProperties = {
  display: "flex",
  gap: "28px",
  animation: "marquee 120s linear infinite",
  willChange: "transform",
};

export default function LogosMarquee() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  return (
    <div className="rounded-3xl border border-border bg-card/70 p-5 shadow-[0_20px_100px_-70px_rgba(15,23,42,1)] sm:p-6">
      <style>{`
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      `}</style>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Écosystème</p>
          <p className="text-lg font-semibold">Banques et institutions couvertes</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-muted/60 px-3 py-1 text-xs font-semibold text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden />
          {BANKS_LIST.length}+ établissements
        </span>
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-muted/40 px-2 py-3">
        <div
          className="flex"
          style={{ overflow: "hidden" }}
          onMouseEnter={(e) => ((e.currentTarget.firstElementChild as HTMLElement).style.animationPlayState = "paused")}
          onMouseLeave={(e) => ((e.currentTarget.firstElementChild as HTMLElement).style.animationPlayState = "running")}
        >
          <div style={{ ...trackStyle, animationPlayState: reduced ? "paused" : "running" }}>
            {[...BANKS_LIST, ...BANKS_LIST].map((b, i) => (
              <div
                key={b.id + i}
                className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 shadow-[0_15px_45px_-35px_rgba(15,23,42,0.6)]"
              >
                <BankAvatar bankId={b.id} name={b.name} size={22} />
                <span className="text-sm whitespace-nowrap">{b.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
