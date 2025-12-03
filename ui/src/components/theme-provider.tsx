// ui/src/components/theme-provider.tsx
"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="ja-theme"
      themes={["light","dark"]}
      disableTransitionOnChange    // ✅ important pour éviter le jank
    >
      {children}
    </NextThemesProvider>
  );
}
