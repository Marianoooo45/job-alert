// ui/src/components/UserMenu.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, LogOut, LayoutDashboard, Settings as SettingsIcon, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const initials = user?.username?.[0]?.toUpperCase() || "A";

  if (loggedIn === null) {
    return (
      <Button variant="ghost" size="icon" aria-label="Chargement du profil">
        <User className="h-5 w-5 opacity-50" />
      </Button>
    );
  }

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

  // utilitaires visuels
  const row = "menu-item border border-border bg-surface px-3 py-2.5 rounded-xl flex items-center gap-3 hover:bg-accent/10 transition";
  const icon = "grid place-items-center h-8 w-8 rounded-lg border border-border bg-card";

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
          {/* avatar */}
          <span className="relative mr-2 grid place-items-center h-7 w-7 rounded-full overflow-hidden">
            <span className="absolute inset-0 rounded-full bg-[radial-gradient(70%_70%_at_30%_30%,rgba(34,211,238,.25),transparent_60%),radial-gradient(70%_70%_at_70%_70%,rgba(244,114,182,.25),transparent_60%)]" />
            <span className="absolute inset-0 rounded-full ring-1 ring-black/10 dark:ring-white/15" />
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
        sideOffset={10}
        alignOffset={-4}
        avoidCollisions
        collisionPadding={12}
        className="um-pop neon-dropdown pop-anim w-72 p-3 rounded-2xl"
      >
        {/* header */}
        <div className="flex items-center gap-3 pb-3 mb-2 border-b border-border">
          <div className="relative grid place-items-center h-9 w-9 rounded-full overflow-hidden">
            <span className="absolute inset-0 rounded-full bg-[radial-gradient(70%_70%_at_30%_30%,rgba(34,211,238,.25),transparent_60%),radial-gradient(70%_70%_at_70%_70%,rgba(244,114,182,.25),transparent_60%)]" />
            <span className="absolute inset-0 rounded-full ring-1 ring-black/10 dark:ring-white/15" />
            <span className="relative text-[10px] font-semibold">{initials}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="font-medium leading-tight truncate max-w-[12rem]">
                {user?.username || "Mon compte"}
              </div>
              {/* shield jaune */}
              <Shield className="h-4 w-4 shrink-0 um-shield" color="#facc15" />
            </div>
            <div className="text-xs text-muted-foreground truncate">{user?.email || "—"}</div>
          </div>
        </div>

        {/* actions */}
        <div className="flex flex-col gap-2">
          <Link href="/dashboard" className={row}>
            <span className={icon}>
              <LayoutDashboard className="h-4 w-4" />
            </span>
            <span className="text-sm truncate">Dashboard</span>
          </Link>

          <Link href="/settings" className={row}>
            <span className={icon}>
              <SettingsIcon className="h-4 w-4" />
            </span>
            <span className="text-sm truncate">Réglages du compte</span>
          </Link>
        </div>

        {/* séparateur */}
        <div className="my-3 border-t border-border" />

        {/* logout */}
        <button
          onClick={logout}
          className="um-logout menu-item px-3 py-2.5 rounded-xl flex items-center gap-3 w-full"
        >
          <span className="um-logout-ico grid place-items-center h-8 w-8 rounded-lg">
            <LogOut className="h-4 w-4" />
          </span>
          <span className="um-logout-text text-sm font-medium">Se déconnecter</span>
        </button>

        {/* styles globaux */}
        <style jsx global>{`
          /* cadre multicolore autour du popover */
          .um-pop {
            position: relative;
            border-color: transparent !important;
          }
          .um-pop::before {
            content: "";
            position: absolute;
            inset: 0;
            padding: 1px;
            border-radius: inherit;
            background: linear-gradient(135deg, var(--color-accent), var(--color-primary), var(--destructive));
            -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            pointer-events: none;
            opacity: 0.9;
          }

          /* shield jaune */
          .neon-dropdown .um-shield { color: #facc15 !important; }
          .neon-dropdown .um-shield path { stroke: #facc15 !important; }

          /* logout styling */
          .um-logout {
            border: 1px solid color-mix(in oklab, var(--destructive) 65%, var(--color-border));
            background: color-mix(in oklab, var(--destructive) 20%, var(--color-surface));
            transition: background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
          }
          .um-logout:hover {
            background: color-mix(in oklab, var(--destructive) 28%, var(--color-surface));
            transform: translateY(-1px);
            box-shadow: 0 10px 28px -18px color-mix(in oklab, var(--destructive) 45%, transparent);
          }
          .um-logout-ico {
            border: 1px solid color-mix(in oklab, var(--destructive) 60%, var(--color-border));
            background: color-mix(in oklab, var(--destructive) 16%, transparent);
            color: var(--destructive);
          }
          /* underline dégradé */
          .um-logout-text {
            position: relative;
          }
          .um-logout-text::after {
            content: "";
            position: absolute;
            left: 0;
            right: 0;
            bottom: -2px;
            height: 2px;
            background: linear-gradient(90deg, var(--color-accent), var(--color-primary), var(--destructive));
            transform: scaleX(0);
            transform-origin: left;
            transition: transform 0.18s ease;
            border-radius: 9999px;
            opacity: 0.95;
          }
          .um-logout:hover .um-logout-text::after {
            transform: scaleX(1);
          }
        `}</style>
      </PopoverContent>
    </Popover>
  );
}
