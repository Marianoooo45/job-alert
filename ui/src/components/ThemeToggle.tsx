"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

/**
 * Bouton compact (icône) qui bascule le thème et garde `data-theme`
 * synchronisé pour les CSS (tokyo.css / tokyo-light.css).
 */
export default function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Sync `data-theme` pour nos feuilles de style
  useEffect(() => {
    if (!mounted) return;
    const t = (theme ?? resolvedTheme) === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", t);
  }, [theme, resolvedTheme, mounted]);

  if (!mounted) return null;
  const isLight = (theme ?? resolvedTheme) === "light";

  return (
    <button
      onClick={() => setTheme(isLight ? "dark" : "light")}
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
