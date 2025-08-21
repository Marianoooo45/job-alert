"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function Pagination({
  currentPage,
  hasNextPage,
}: {
  currentPage: number;
  hasNextPage: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function go(to: number) {
    const next = new URLSearchParams(params.toString());
    next.set("page", String(Math.max(1, to)));
    router.push(`/offers?${next.toString()}`, { scroll: true });
    // Fallback universel pour garantir le scroll-top
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-2"
    >
      <button
        className="pager-btn h-9 px-3 rounded-lg border bg-surface hover:border-primary transition"
        onClick={() => go(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        Précédent
      </button>

      <span className="h-9 px-3 rounded-lg border bg-surface flex items-center">
        Page {currentPage}
      </span>

      <button
        className="pager-btn h-9 px-3 rounded-lg border bg-surface hover:border-primary transition"
        onClick={() => go(currentPage + 1)}
        disabled={!hasNextPage}
      >
        Suivant
      </button>
    </nav>
  );
}
