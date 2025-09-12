// ui/src/components/UserMenu.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  LogOut,
  LayoutDashboard,
  Settings as SettingsIcon,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type MeResponse = {
  authenticated?: boolean;
  user?: { username?: string; email?: string } | null;
};
type ProfileResponse = {
  ok: boolean;
  profile?: { username: string; email: string | null; emailVerified: boolean };
};

export default function UserMenu() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [user, setUser] = useState<{ username?: string; email?: string } | null>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  const router = useRouter();

  // Hydrate auth + profile (email + vérif)
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

        if (authed && j?.user?.username) {
          sessionStorage.setItem("ja:username", j.user.username);
          try {
            const pr = (await fetch("/api/account/profile", {
              cache: "no-store",
            }).then((res) => res.json())) as ProfileResponse;
            if (!cancelled && pr?.ok) setVerified(!!pr.profile?.emailVerified);
          } catch {}
        } else {
          sessionStorage.removeItem("ja:username");
          setVerified(null);
        }
      } catch {
        if (!cancelled) {
          setLoggedIn(false);
          setUser(null);
          setVerified(null);
          sessionStorage.removeItem("ja:username");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = async () => {
    try {
      await fetch("/api/logout", { method: "POST", credentials: "include" });
    } catch {}
    sessionStorage.removeItem("ja:username");
    setLoggedIn(false);
    setUser(null);
    router.push("/login");
  };

  const initials = user?.username?.[0]?.toUpperCase() || "A";

  // Loading
  if (loggedIn === null) {
    return (
      <Button variant="ghost" size="icon" aria-label="Chargement du profil">
        <User className="h-5 w-5 opacity-50" />
      </Button>
    );
  }

  // Not logged
  if (!loggedIn) {
    return (
      <Link
        href="/login"
        className="px-3 py-1.5 rounded-full text-sm font-medium
                   bg-gradient-to-r from-cyan-400 to-pink-400 text-white
                   hover:opacity-90 transition"
      >
        Connexion
      </Link>
    );
  }

  // Helper: style cohérent “login button vibes”
  const itemBase =
    "w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 " +
    "bg-gradient-to-r from-cyan-400/15 via-fuchsia-400/15 to-rose-400/15 " +
    "hover:from-cyan-400/25 hover:via-fuchsia-400/25 hover:to-rose-400/25 " +
    "hover:shadow-[0_0_14px_rgba(244,114,182,0.35)] ring-1 ring-white/10";
  const itemText = "text-foreground/90 group-hover:text-foreground";
  const iconCls = "h-4 w-4 opacity-80";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Ouvrir le menu utilisateur"
          className="group relative inline-flex items-center h-9 pl-2 pr-3
                     rounded-full text-sm font-medium text-foreground
                     focus-visible:outline-none focus-visible:ring-2
                     focus-visible:ring-pink-400/50"
        >
          {/* Avatar */}
          <span className="relative mr-2 grid place-items-center h-7 w-7 rounded-full overflow-hidden">
            <span className="absolute inset-0 rounded-full bg-[radial-gradient(70%_70%_at_30%_30%,rgba(34,211,238,.25),transparent_60%),radial-gradient(70%_70%_at_70%_70%,rgba(244,114,182,.25),transparent_60%)]" />
            <span className="absolute inset-0 rounded-full ring-1 ring-white/15" />
            <span className="relative text-[10px] font-semibold opacity-90">{initials}</span>
          </span>
          <span className="relative hidden sm:inline max-w-[12ch] truncate">
            {user?.username || "Compte"}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={8}
        alignOffset={-4}
        avoidCollisions
        collisionPadding={12}
        className="neon-dropdown pop-anim w-64 p-3 rounded-xl"
      >
        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-white/10">
          <div className="relative grid place-items-center h-9 w-9 rounded-full overflow-hidden">
            <span className="absolute inset-0 rounded-full bg-[radial-gradient(70%_70%_at_30%_30%,rgba(34,211,238,.25),transparent_60%),radial-gradient(70%_70%_at_70%_70%,rgba(244,114,182,.25),transparent_60%)]" />
            <span className="absolute inset-0 rounded-full ring-1 ring-white/15" />
            <span className="relative text-[10px] font-semibold">{initials}</span>
          </div>
          <div className="min-w-0">
            <div className="font-medium leading-tight truncate">
              {user?.username || "Mon compte"}
            </div>
            <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
              {user?.email || "—"}
              {verified === true && (
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" title="Email vérifié" />
              )}
              {verified === false && (
                <ShieldAlert className="h-3.5 w-3.5 text-amber-400" title="Email non vérifié" />
              )}
            </div>
          </div>
        </div>

        {/* Actions -> style unifié */}
        <div className="flex flex-col gap-2 mt-3">
          <Link href="/dashboard" className={`group ${itemBase}`}>
            <LayoutDashboard className={iconCls} />
            <span className={itemText}>Dashboard</span>
          </Link>

          <Link href="/settings" className={`group ${itemBase}`}>
            <SettingsIcon className={iconCls} />
            <span className={itemText}>Réglages du compte</span>
          </Link>
        </div>

        {/* Logout (même vibe, mais teinte rouge subtile en overlay) */}
        <button
          onClick={logout}
          className={`group mt-3 ${itemBase} relative text-red-300 hover:text-red-200`}
        >
          <span className="pointer-events-none absolute inset-0 rounded-lg bg-red-500/10 opacity-60 group-hover:opacity-80 transition-opacity" />
          <LogOut className="relative h-4 w-4 opacity-90" />
          <span className="relative">Logout</span>
        </button>
      </PopoverContent>
    </Popover>
  );
}
