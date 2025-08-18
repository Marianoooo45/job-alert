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
  animation: "marquee 28s linear infinite",
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
    <div className="rounded-2xl border border-border bg-surface p-4 overflow-hidden">
      <style>{`
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      `}</style>
      <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
        <span>Banques couvertes</span>
        <span>{BANKS_LIST.length}+</span>
      </div>
      <div className="relative">
        <div
          className="flex"
          style={{ overflow: "hidden" }}
          onMouseEnter={(e) => ((e.currentTarget.firstElementChild as HTMLElement).style.animationPlayState = "paused")}
          onMouseLeave={(e) => ((e.currentTarget.firstElementChild as HTMLElement).style.animationPlayState = "running")}
        >
          <div style={{ ...trackStyle, animationPlayState: reduced ? "paused" : "running" }}>
            {[...BANKS_LIST, ...BANKS_LIST].map((b, i) => (
              <div key={b.id + i} className="inline-flex items-center gap-2 px-2 py-1 rounded-lg border border-border bg-card">
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
