"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { User as UserIcon, Terminal } from "lucide-react";
import AlertBell from "./AlertBell";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";

import * as Alerts from "@/lib/alerts";
import * as Tracker from "@/lib/tracker";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname?.startsWith(href));

  return (
    <Link
      href={href}
      className={`relative px-4 h-9 inline-flex items-center rounded-md text-sm font-medium transition-all duration-300 ${
        active
          ? "text-primary bg-primary/10 border border-primary/20 shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-foreground/5 hover:scale-105"
      }`}
    >
      {active && (
        <span className="absolute inset-x-2 -bottom-[1px] h-[2px] bg-primary rounded-full shadow-[0_0_8px_var(--primary)] animate-pulse" />
      )}
      {children}
    </Link>
  );
}

type MeResponse = {
  authenticated?: boolean;
  user?: { username?: string; email?: string } | null;
};

export default function Navbar() {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const r = await fetch("/api/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (!alive) return;

        const data: MeResponse | null = r.ok ? await r.json().catch(() => null) : null;
        const authed = Boolean(data?.authenticated || data?.user);
        const name = data?.user?.username ?? null;

        setLoggedIn(authed);
        setUsername(name);

        if (authed && name) {
          sessionStorage.setItem("ja:username", name);
          try {
            await Alerts.hydrateFromServer();
            await Tracker.hydrateFromServer();
          } catch {
            // silencieux
          }
        } else {
          sessionStorage.removeItem("ja:username");
        }
      } catch {
        setLoggedIn(false);
        setUsername(null);
        sessionStorage.removeItem("ja:username");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 pointer-events-none pt-4">
        <div className="mx-auto max-w-7xl pointer-events-auto">
          <div className="relative flex items-center justify-between h-16 px-4 rounded-xl border border-border bg-background/95 backdrop-blur-xl shadow-[0_14px_40px_rgba(15,23,42,0.25)] transition-all duration-300 overflow-hidden group hover:shadow-[0_20px_50px_rgba(15,23,42,0.35)]">
            
            {/* Ligne lumineuse défilante */}
            <div className="absolute top-0 left-0 w-full h-[2px] overflow-hidden pointer-events-none z-20">
              <div className="navbar-scanline" />
            </div>

            {/* Glow subtil en arrière-plan */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 transition-opacity duration-500 pointer-events-none" />

            {/* Logo + LIVE */}
            <div className="flex items-center gap-4 z-10">
              <Link href="/" className="group/logo flex items-center gap-2.5 font-bold tracking-tight text-foreground text-lg">
                <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 group-hover/logo:border-primary/50 group-hover/logo:shadow-[0_0_15px_var(--primary)] group-hover/logo:scale-110 transition-all duration-300">
                  <Terminal className="w-4 h-4 text-primary group-hover/logo:rotate-12 transition-transform duration-300" />
                </div>
                <div className="flex flex-col leading-none">
                  <span className="group-hover/logo:text-primary transition-colors duration-300">
                    Job<span className="text-primary">Alert</span>
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mt-0.5 group-hover/logo:text-primary/80 transition-colors">
                    Finance Terminal
                  </span>
                </div>
              </Link>

              <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 ml-4 hover:bg-emerald-500/15 transition-all duration-300 hover:scale-105">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                </span>
                <span className="text-[10px] font-mono font-medium text-emerald-600 dark:text-emerald-400">
                  MARKET LIVE
                </span>
              </div>
            </div>

            {/* Nav droite */}
            <nav className="flex items-center gap-1 sm:gap-2 z-10">
              <NavLink href="/offers">Offres</NavLink>

              <div className="h-4 w-px bg-border mx-2 hidden sm:block opacity-50" />

              {loggedIn && (
                <div className="animate-fadeIn">
                  <AlertBell />
                </div>
              )}

              <div className="animate-fadeIn" style={{ animationDelay: '0.1s' }}>
                <ThemeToggle />
              </div>

              {loading ? (
                <div className="h-9 w-9 rounded-full bg-muted animate-pulse ml-2" />
              ) : loggedIn ? (
                <div className="animate-fadeIn" style={{ animationDelay: '0.2s' }}>
                  <UserMenu />
                </div>
              ) : (
                <Link
                  href="/login"
                  className="ml-2 group/btn relative inline-flex items-center justify-center h-9 px-4 rounded-lg text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 hover:scale-105 transition-all shadow-md hover:shadow-lg overflow-hidden animate-fadeIn"
                  style={{ animationDelay: '0.2s' }}
                >
                  <span className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  
                  <span className="relative flex items-center gap-2">
                    <UserIcon className="w-3.5 h-3.5 group-hover/btn:rotate-12 transition-transform duration-300" />
                    <span>Connexion</span>
                  </span>
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      <style jsx global>{`
        @keyframes scanline {
          0% {
            transform: translateX(-100%);
            opacity: 0;
          }
          10% {
            opacity: 0.8;
          }
          90% {
            opacity: 0.8;
          }
          100% {
            transform: translateX(100%);
            opacity: 0;
          }
        }

        .navbar-scanline {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, var(--color-primary) 20%, #f7768e 50%, #3b82f6 80%, transparent);
          opacity: 0.8;
          animation: scanline 3s ease-in-out infinite;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
          opacity: 0;
        }

        @media (prefers-reduced-motion: reduce) {
          .navbar-scanline,
          .animate-fadeIn {
            animation: none !important;
            opacity: 1 !important;
          }
        }
      `}</style>
    </>
  );
}