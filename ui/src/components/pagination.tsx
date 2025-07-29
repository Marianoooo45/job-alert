"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface PaginationProps {
  currentPage: number;
  hasNextPage: boolean;
}

export default function Pagination({ currentPage, hasNextPage }: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex justify-center items-center gap-4 mt-6">
      <button
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage <= 1}
        className="px-4 py-2 bg-muted rounded disabled:opacity-50"
      >
        Précédent
      </button>
      <span className="text-white">Page {currentPage}</span>
      <button
        onClick={() => goToPage(currentPage + 1)}
        disabled={!hasNextPage}
        className="px-4 py-2 bg-muted rounded disabled:opacity-50"
      >
        Suivant
      </button>
    </div>
  );
}
