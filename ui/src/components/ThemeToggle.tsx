"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-9 h-9" />;

  const isLight = (theme ?? resolvedTheme) === "light";

  return (
    <button
      onClick={() => setTheme(isLight ? "dark" : "light")}
      className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all"
      aria-label="Changer le thème"
    >
      {isLight ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}