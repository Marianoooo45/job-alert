// ui/src/app/offers/RevealOnScroll.tsx
"use client";

import { useEffect } from "react";

type Props = { selector?: string };

/** Révèle les lignes d'offres au scroll via IntersectionObserver */
export default function RevealOnScroll({ selector = "[data-offers-table] tbody tr" }: Props) {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
    if (!nodes.length) return;

    // Marque initiale (pour que le CSS de reveal s’applique)
    nodes.forEach((el) => el.classList.add("offer-row"));

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
    );

    nodes.forEach((el) => io.observe(el));

    // Re-scan si la table change (pagination / nb de lignes)
    const container =
      document.querySelector<HTMLElement>(selector)?.closest("[data-offers-table]") ?? document.body;

    const mo = new MutationObserver(() => {
      const fresh = Array.from(document.querySelectorAll<HTMLElement>(selector)).filter(
        (el) => !el.classList.contains("offer-row")
      );
      fresh.forEach((el) => {
        el.classList.add("offer-row");
        io.observe(el);
      });
    });

    mo.observe(container, { subtree: true, childList: true });

    return () => { io.disconnect(); mo.disconnect(); };
  }, [selector]);

  return null;
}
