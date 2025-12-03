"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, LogOut, LayoutDashboard, Settings as SettingsIcon, Sparkles } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type MeResponse = { authenticated?: boolean; user?: { username?: string; email?: string } | null };

export default function UserMenu() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [user, setUser] = useState<{ username?: string; email?: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/me", { cache: "no-store" });
        const j: MeResponse = await r.json();
        if (cancelled) return;
        const authed = !!j?.authenticated;
        setLoggedIn(authed);
        setUser(j?.user || null);
        if (authed && j?.user?.username) sessionStorage.setItem("ja:username", j.user.username);
        else sessionStorage.removeItem("ja:username");
      } catch {
        if (!cancelled) {
          setLoggedIn(false);
          setUser(null);
          sessionStorage.removeItem("ja:username");
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const logout = async () => {
    try { await fetch("/api/logout", { method: "POST", credentials: "include" }); } catch {}
    sessionStorage.removeItem("ja:username");
    setLoggedIn(false);
    setUser(null);
    router.push("/login");
  };

  const initials = user?.username?.[0]?.toUpperCase() || "U";

  if (loggedIn === null) return <div className="w-8 h-8 rounded-full bg-muted/20 animate-pulse" />;

  if (!loggedIn) {
    return (
      <Link
        href="/login"
        className="group relative inline-flex items-center justify-center h-9 px-4 rounded-lg text-xs font-semibold text-foreground transition-all overflow-hidden"
      >
        <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-gray-700" />
        <span className="relative">Connexion</span>
        <span className="absolute inset-0 border border-border rounded-lg group-hover:border-foreground/30 transition-colors" />
      </Link>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="group flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-foreground/5 transition-colors border border-transparent hover:border-border outline-none">
          <div className="relative h-7 w-7 rounded-full overflow-hidden ring-1 ring-border group-hover:ring-foreground/40 transition-all">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-600 opacity-80" />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
              {initials}
            </span>
          </div>
          <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors max-w-[100px] truncate">
            {user?.username}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={8}
        className="w-64 p-2 bg-popover/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl text-foreground"
      >
        {/* Header */}
        <div className="px-3 py-2 mb-2 border-b border-border">
          <p className="text-sm font-semibold text-foreground truncate">{user?.username}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>

        {/* Menu Items */}
        <div className="space-y-1">
          <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-foreground/5 hover:text-foreground transition-colors">
            <LayoutDashboard className="w-4 h-4 text-indigo-400" />
            Dashboard
          </Link>
          <Link href="/settings" className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-foreground/5 hover:text-foreground transition-colors">
            <SettingsIcon className="w-4 h-4 text-muted-foreground" />
            Paramètres
          </Link>
        </div>

        <div className="my-2 border-t border-border" />

        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </PopoverContent>
    </Popover>
  );
}