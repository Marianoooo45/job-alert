// ui/src/components/UserMenu.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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

        // ⬇️ Namespace username (au cas où navbar n’a pas encore écrit)
        if (authed && j?.user?.username) {
          sessionStorage.setItem("ja:username", j.user.username);
        } else {
          sessionStorage.removeItem("ja:username");
        }
      } catch {
        if (!cancelled) {
          setLoggedIn(false);
          setUser(null);
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
      await fetch("/api/logout", { method: "POST" });
    } catch {}
    // ⬇️ Nettoie le namespace local
    sessionStorage.removeItem("ja:username");
    setLoggedIn(false);
    setUser(null);
    router.push("/login");
  };

  // Initiales pour l’avatar
  const initials = user?.username?.[0]?.toUpperCase() || "A";

  // Pendant le check
  if (loggedIn === null) {
    return (
      <Button variant="ghost" size="icon" aria-label="Chargement du profil">
        <User className="h-5 w-5 opacity-50" />
      </Button>
    );
  }

  // Si pas connecté
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

  // Si connecté
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
          {/* Avatar cercle */}
          <span className="relative mr-2 grid place-items-center h-7 w-7 rounded-full overflow-hidden">
            <span className="absolute inset-0 rounded-full bg-[radial-gradient(70%_70%_at_30%_30%,rgba(34,211,238,.25),transparent_60%),radial-gradient(70%_70%_at_70%_70%,rgba(244,114,182,.25),transparent_60%)]" />
            <span className="absolute inset-0 rounded-full ring-1 ring-white/15" />
            <span className="relative text-[10px] font-semibold opacity-90">
              {initials}
            </span>
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
            <div className="text-xs text-muted-foreground truncate">
              {user?.email || "—"}
            </div>
          </div>
        </div>

        {/* Liens rapides */}
        <div className="flex flex-col gap-2 mt-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition"
          >
            <LayoutDashboard className="h-4 w-4 opacity-70" />
            Dashboard
          </Link>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition">
            <Checkbox id="notif" />
            <Label htmlFor="notif" className="cursor-pointer">
              Alertes email
            </Label>
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition">
            <Checkbox id="public" />
            <Label htmlFor="public" className="cursor-pointer">
              Profil public
            </Label>
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition">
            <Checkbox id="autoupdate" />
            <Label htmlFor="autoupdate" className="cursor-pointer">
              Auto update jobs
            </Label>
          </div>
        </div>

        {/* Logout */}
        <Button
          onClick={logout}
          variant="ghost"
          className="mt-3 w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <LogOut className="h-4 w-4 mr-2" /> Logout
        </Button>
      </PopoverContent>
    </Popover>
  );
}
