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
    // CORRECTION: bg-white/5 -> bg-surface-muted
    <div className="flex items-center gap-2 p-1 rounded-lg bg-surface-muted border border-border">
      <button
        disabled={currentPage <= 1}
        onClick={() => go(currentPage - 1)}
        // text-slate-300 -> text-muted-foreground, hover:bg-white/10 -> hover:bg-foreground/5
        className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-foreground/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Page précédente"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="h-4 w-px bg-border mx-1" />

      <span className="px-2 text-sm font-mono font-medium text-muted-foreground">
        PAGE <span className="text-foreground">{currentPage}</span>
      </span>

      <div className="h-4 w-px bg-border mx-1" />

      <button
        disabled={!hasNextPage}
        onClick={() => go(currentPage + 1)}
        className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-foreground/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Page suivante"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}