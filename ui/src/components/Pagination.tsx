"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({
  currentPage,
  hasNextPage,
}: {
  currentPage: number;
  hasNextPage: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();

  const go = (p: number) => {
    const next = new URLSearchParams(params.toString());
    next.set("page", String(Math.max(1, p)));
    router.push(`${pathname}?${next.toString()}`, { scroll: true });
  };

  return (
    <div className="relative group">
      {/* Glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative flex items-center gap-2 p-1.5 rounded-xl bg-background/60 backdrop-blur-xl border border-border/50 shadow-lg group-hover:border-primary/30 transition-all duration-300">
        {/* Previous button */}
        <button
          disabled={currentPage <= 1}
          onClick={() => go(currentPage - 1)}
          className="relative h-10 w-10 flex items-center justify-center rounded-lg hover:bg-primary/10 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all duration-300 text-muted-foreground hover:text-primary group/btn overflow-hidden"
          aria-label="Page précédente"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
          <ChevronLeft className="w-5 h-5 relative z-10" />
        </button>

        {/* Separator */}
        <div className="h-6 w-px bg-gradient-to-b from-transparent via-border to-transparent mx-1" />

        {/* Page indicator */}
        <div className="relative px-6 py-2 rounded-lg bg-primary/5 border border-primary/20 group-hover:bg-primary/10 group-hover:border-primary/30 transition-all duration-300 overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          
          <span className="relative text-sm font-mono font-bold flex items-center gap-2">
            <span className="text-muted-foreground text-xs tracking-wider">PAGE</span>
            <span className="text-primary text-lg">{currentPage}</span>
          </span>
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-gradient-to-b from-transparent via-border to-transparent mx-1" />

        {/* Next button */}
        <button
          disabled={!hasNextPage}
          onClick={() => go(currentPage + 1)}
          className="relative h-10 w-10 flex items-center justify-center rounded-lg hover:bg-secondary/10 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all duration-300 text-muted-foreground hover:text-secondary group/btn overflow-hidden"
          aria-label="Page suivante"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-secondary/0 via-secondary/10 to-secondary/0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
          <ChevronRight className="w-5 h-5 relative z-10" />
        </button>

        {/* Live indicator */}
        {hasNextPage && (
          <div className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
              MORE
            </span>
          </div>
        )}
      </div>
    </div>
  );
}