import Navbar from "@/components/Navbar";
import "./themes/tokyo.css";
import "./themes/tokyo-light.css"; // 👈 déjà présent chez toi, je le rappelle ici
import { ThemeProvider } from "@/components/theme-provider";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400","500","600","700"], display: "swap" });

export const metadata: Metadata = {
  title: "Job Alert",
  description: "Votre hub centralisé pour les dernières offres d'emploi.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-theme="dark" suppressHydrationWarning> {/* 👈 évite les flashes clairs */}
      <body className={`${inter.className} min-h-screen bg-background font-sans antialiased theme-tokyo`}>
        <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <Navbar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
