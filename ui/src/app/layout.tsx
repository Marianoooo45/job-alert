// ui/src/app/layout.tsx
import Navbar from "@/components/Navbar";
// ON SUPPRIME LES IMPORTS MULTIPLES ICI
import { ThemeProvider } from "@/components/theme-provider";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
// ON GARDE JUSTE GLOBALS.CSS
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Job Alert",
  description: "Votre hub centralisé pour les dernières offres d'emploi.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      {/* On garde ta classe "theme-tokyo" si tu l'utilises pour cibler le body */}
      <body className={`${inter.className} min-h-screen font-sans antialiased theme-tokyo`}>
        <ThemeProvider>
          <div id="theme-curtain" aria-hidden="true" />
          <Navbar />
          <div className="app-zoom">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}