// ui/src/app/layout.tsx
import Navbar from "@/components/Navbar";
import "./themes/tokyo.css";
import "./themes/tokyo-light.css";
import { ThemeProvider } from "@/components/theme-provider";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
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
      <body className={`${inter.className} min-h-screen font-sans antialiased theme-tokyo`}>
        <ThemeProvider>
          <div id="theme-curtain" aria-hidden="true" />
          {/* ❌ pas dans .app-zoom → popovers OK */}
          <Navbar />
          {/* ✅ tout le reste peut être “dézoommé” */}
          <div className="app-zoom">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
