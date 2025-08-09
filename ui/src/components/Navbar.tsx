"use client"; // 👈 Obligatoire pour utiliser useState/useEffect

import { getAll as getAlerts } from "@/lib/alerts";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const alerts = getAlerts();
    const unread = alerts.filter(a => !a.read).length;
    setUnreadCount(unread);
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
            <NavLink href="/">Offres</NavLink>
            <NavLink href="/dashboard">Dashboard</NavLink>
            <NavLink href="/inbox">
              Inbox
              {unreadCount > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                  {unreadCount}
                </span>
              )}
            </NavLink>
          </nav>
        </div>
      </div>
    </header>
  );
}
