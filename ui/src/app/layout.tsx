// Fichier: ui/src/app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import "./themes/tokyo.css";
import { ThemeProvider } from "@/components/theme-provider"; // On importe le provider

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Job Alert",
  description: "Votre hub centralisé pour les dernières offres d'emploi.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background font-sans antialiased theme-tokyo`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <Navbar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
