// ui/src/components/ThemeToggle.tsx
"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const saved = window.localStorage.getItem("theme") as Theme | null;
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(getInitialTheme());
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  const next = theme === "dark" ? "light" : "dark";

  const className = compact
    ? "nav-bell px-3 h-9 inline-flex items-center rounded-lg neon-underline transition text-[var(--color-accent)] hover:text-foreground"
    : "inline-flex items-center h-9 px-3 rounded-lg border border-border hover:border-primary transition";

  return (
    <button
      className={className}
      onClick={() => setTheme(next)}
      title={theme === "dark" ? "Passer en clair" : "Passer en sombre"}
      type="button"
      aria-label="Basculer le thème"
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      {!compact && <span className="ml-2 text-sm">{theme === "dark" ? "Clair" : "Sombre"}</span>}
    </button>
  );
}
