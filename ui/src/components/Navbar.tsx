"use client";

import { getAll as getAlerts } from "@/lib/alerts";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react"; // icône cloche

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname?.startsWith(href));
  return (
    <Link
      href={href}
      className={`relative px-3 h-9 inline-flex items-center rounded-lg transition ${
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

            <Link
              href="/inbox"
              className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                  {unreadCount}
                </span>
              )}
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
