// ui/src/components/ThemeToggle.tsx
"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

/**
 * Bascule Light/Dark en utilisant next-themes.
 * - Utilise l'attribut `data-theme` (configuré dans le ThemeProvider).
 * - `compact` = bouton icône seule, avec soulignement néon (parfait en navbar).
 */
export default function ThemeToggle({ compact = true }: { compact?: boolean }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // évite le clignotement avant hydratation
  if (!mounted) {
    return (
      <button
        className="px-3 h-9 inline-flex items-center rounded-lg neon-underline opacity-0"
        aria-hidden
      />
    );
  }

  const current = (theme ?? resolvedTheme ?? "dark") as "light" | "dark";
  const next = current === "dark" ? "light" : "dark";

  const baseClass =
    "px-3 h-9 inline-flex items-center rounded-lg neon-underline transition text-[var(--color-accent)] hover:text-foreground";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className={baseClass}
      title={current === "dark" ? "Passer en clair" : "Passer en sombre"}
      aria-label="Basculer le thème"
    >
      {current === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      {!compact && <span className="ml-2 text-sm">{current === "dark" ? "Clair" : "Sombre"}</span>}
    </button>
  );
}
