// ui/src/components/Navbar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AlertBell from "./AlertBell";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";

function NavLink({
  href,
  children,
  requiresAuth,
  loggedIn,
}: {
  href: string;
  children: React.ReactNode;
  requiresAuth?: boolean;
  loggedIn: boolean;
}) {
  const pathname = usePathname();
  const target =
    requiresAuth && !loggedIn ? `/login?next=${encodeURIComponent(href)}` : href;
  const active = pathname === href || (href !== "/" && pathname?.startsWith(href));
  return (
    <Link
      href={target}
      className={`px-3 h-9 inline-flex items-center rounded-lg neon-underline transition ${
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}

export default function Navbar() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(document.cookie.includes("auth=1"));
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-transparent">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-6 bg-gradient-to-b from-black/40 to-transparent" />
      <div className="glass-nav mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-3 rounded-2xl">
        <div className="h-14 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight text-foreground text-lg">
            <span className="opacity-80">Job</span>{" "}
            <span className="text-primary neon-title">Alert</span>
          </Link>

          <nav className="flex items-center gap-1">
            <NavLink href="/offers" requiresAuth loggedIn={loggedIn}>
              Offres
            </NavLink>
            <NavLink href="/dashboard" requiresAuth loggedIn={loggedIn}>
              Dashboard
            </NavLink>
            {loggedIn && <AlertBell />}
            <ThemeToggle />
            <UserMenu />
          </nav>
        </div>
      </div>
    </header>
  );
}
