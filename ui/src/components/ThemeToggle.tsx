"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isLight = (theme ?? resolvedTheme) === "light";
  const next = isLight ? "dark" : "light";

  const smoothSwitch = () => {
    const prefersReduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // A) View Transitions API (Chrome/Edge) → cross-fade 1s super smooth
    const canVT = "startViewTransition" in document && !prefersReduce;
    if (canVT) {
      // @ts-expect-error: types VT pas globaux
      (document as any).startViewTransition(() => setTheme(next));
      return;
    }

    // B) Fallback universel (Safari/Firefox) : rideau qui fade en 1s
    const curtain = document.getElementById("theme-curtain") as HTMLDivElement | null;
    if (!curtain) { setTheme(next); return; }

    // Snapshot de la couleur avant switch (évite la coupure visuelle)
    const root = document.documentElement;
    const oldBg =
      getComputedStyle(root).getPropertyValue("--background").trim() ||
      getComputedStyle(document.body).backgroundColor || "#000";
    curtain.style.background = oldBg;

    curtain.style.transition = "none";
    curtain.style.opacity = "1";
    // force reflow
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    curtain.offsetHeight;

    setTheme(next);

    requestAnimationFrame(() => {
      curtain.style.transition = "opacity 1s cubic-bezier(.2,.8,.2,1)"; // <- 1s
      curtain.style.opacity = "0";
      curtain.addEventListener("transitionend", () => {
        curtain.style.background = "";
      }, { once: true });
    });
  };

  return (
    <button
      onClick={smoothSwitch}
      title={isLight ? "Passer en sombre" : "Passer en clair"}
      aria-label="Basculer le thème"
      className={`nav-icon-link neon-underline neon-underline--icon theme-switch ${
        isLight ? "is-light" : "is-dark"
      }`}
    >
      {isLight ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
