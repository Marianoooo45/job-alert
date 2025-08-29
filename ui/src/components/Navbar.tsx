// ui/src/components/Navbar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { User as UserIcon } from "lucide-react";
import AlertBell from "./AlertBell";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname?.startsWith(href));
  return (
    <Link
      href={href}
      className={`px-3 h-9 inline-flex items-center rounded-lg neon-underline transition ${
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}

export default function Navbar() {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  // Vérifie la session via /api/me (cookie HttpOnly)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/me", { credentials: "include", cache: "no-store" });
        if (!alive) return;
        const data = r.ok ? await r.json().catch(() => null) : null;
        setLoggedIn(Boolean(data?.user));
      } catch {
        setLoggedIn(false);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-transparent">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-6 bg-gradient-to-b from-black/40 to-transparent" />
      <div className="glass-nav mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-3 rounded-2xl">
        <div className="h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="font-semibold tracking-tight text-foreground text-lg">
            <span className="opacity-80">Job</span>{" "}
            <span className="text-primary neon-title">Alert</span>
          </Link>

          <nav className="flex items-center gap-2">
            {/* Offres reste en navbar */}
            <NavLink href="/offers">Offres</NavLink>

            {/* Plus de Dashboard ici (il est dans UserMenu) */}

            <AlertBell />
            <ThemeToggle />

            {loading ? (
              <span
                className="relative overflow-hidden rounded-full h-9 px-3 inline-flex items-center text-sm text-muted-foreground"
                aria-hidden
              >
                <span className="absolute inset-0 rounded-full bg-white/5 ring-1 ring-white/10" />
                <span className="relative">…</span>
              </span>
            ) : loggedIn ? (
              <UserMenu />
            ) : (
              /* Bouton Connexion */
              <Link
                href="/login"
                className="group relative inline-flex items-center h-9 pl-2 pr-3 rounded-full text-sm font-medium text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/50"
                aria-label="Connexion"
              >
                <span className="absolute inset-0 rounded-full p-[1px] bg-[linear-gradient(135deg,theme(colors.cyan.400),theme(colors.fuchsia.400),theme(colors.rose.400))] opacity-25 group-hover:opacity-40 transition-opacity" />
                <span className="absolute inset-[1px] rounded-full bg-white/6 ring-1 ring-white/10 backdrop-blur-sm" />
                <span className="relative mr-2 grid place-items-center h-7 w-7 rounded-full overflow-hidden">
                  <span className="absolute inset-0 rounded-full bg-white/10" />
                  <span className="absolute inset-0 rounded-full ring-1 ring-white/15" />
                  <UserIcon className="relative h-4 w-4 text-foreground/80" />
                </span>
                <span className="relative">Connexion</span>
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
