"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion } from "framer-motion";

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
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "auto" });
  };

  return (
    <div className="ja-pagi-wrap">
      <motion.button
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.95 }}
        disabled={currentPage <= 1}
        onClick={() => go(currentPage - 1)}
        className="ja-pagi-btn"
      >
        Précédent
      </motion.button>

      <span className="ja-pagi-page">Page {currentPage}</span>

      <motion.button
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.95 }}
        disabled={!hasNextPage}
        onClick={() => go(currentPage + 1)}
        className="ja-pagi-btn"
      >
        Suivant
      </motion.button>

      <style>{`
        .ja-pagi-wrap{
          position:relative; display:flex; align-items:center; gap:.5rem;
          border-radius:14px; padding:.75rem 1rem; background:var(--color-surface);
          border:1px solid transparent; box-shadow:0 14px 40px -24px color-mix(in oklab, var(--color-primary) 45%, transparent);
          isolation:isolate;
        }
        .ja-pagi-wrap::before{
          content:""; position:absolute; inset:0; padding:1px; border-radius:inherit;
          background:linear-gradient(135deg, var(--color-accent), var(--color-primary), var(--destructive));
          -webkit-mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite:xor; mask-composite:exclude; opacity:.95; pointer-events:none;
        }
        .ja-pagi-btn{
          height:2.25rem; padding:0 .9rem; border-radius:10px;
          background:color-mix(in oklab, var(--color-primary) 10%, var(--color-surface));
          border:1px solid color-mix(in oklab, var(--color-primary) 40%, var(--color-border));
          color:var(--color-foreground);
          transition:background .18s ease, border-color .18s ease, box-shadow .18s ease, color .18s ease, transform .18s ease;
          box-shadow:0 0 0 0 transparent;
        }
        .ja-pagi-btn:hover:not(:disabled){
          background:color-mix(in oklab, var(--color-primary) 18%, var(--color-surface));
          border-color: color-mix(in oklab, var(--color-primary) 55%, var(--color-border));
          box-shadow:0 10px 28px -18px color-mix(in oklab, var(--color-primary) 55%, transparent),
                     0 0 0 2px color-mix(in oklab, var(--color-primary) 22%, transparent);
        }
        .ja-pagi-btn:active:not(:disabled){
          transform: translateY(1px);
          box-shadow:0 6px 20px -18px color-mix(in oklab, var(--color-primary) 55%, transparent);
        }
        .ja-pagi-btn:disabled{ opacity:.5; cursor:not-allowed; }
        .ja-pagi-page{
          padding:.45rem .9rem; border-radius:10px; border:1px dashed var(--color-border);
          background:color-mix(in oklab, var(--color-primary) 6%, transparent);
          font-weight:600; font-variant-numeric:tabular-nums;
        }
        @media (max-width:480px){ .ja-pagi-page{ display:none; } }
      `}</style>
    </div>
  );
}
