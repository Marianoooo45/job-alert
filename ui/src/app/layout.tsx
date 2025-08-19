import Navbar from "@/components/Navbar";
import "./themes/tokyo.css";
import { ThemeProvider } from "@/components/theme-provider";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./themes/tokyo-light.css";

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
      {/* par défaut côté serveur: dark (NextThemes appliquera la valeur persistée après) */}
      <body className={`${inter.className} min-h-screen bg-background font-sans antialiased theme-tokyo`}>
        <ThemeProvider
          attribute="data-theme"    // ← important: correspond à :root[data-theme="light|dark"]
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <Navbar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
