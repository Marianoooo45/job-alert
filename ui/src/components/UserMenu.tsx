"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function UserMenu() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/me", { cache: "no-store" });
        const j = await r.json();
        if (!cancelled) setLoggedIn(!!j?.authenticated);
      } catch {
        if (!cancelled) setLoggedIn(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const logout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {}
    setLoggedIn(false);
    router.push("/login");
  };

  // Pendant le check, on évite de flicker
  if (loggedIn === null) {
    return (
      <Button variant="ghost" size="icon" aria-label="Chargement du profil">
        <User className="h-5 w-5 opacity-50" />
      </Button>
    );
  }

  if (!loggedIn) {
    return (
      <Link href="/login" className="p-2" aria-label="Se connecter">
        <User className="h-5 w-5" />
      </Link>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Ouvrir le menu utilisateur">
          <User className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 flex flex-col gap-2">
        <div className="flex items-center space-x-2">
          <Checkbox id="notif" />
          <Label htmlFor="notif">Email alerts</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="public" />
          <Label htmlFor="public">Public profile</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="autoupdate" />
          <Label htmlFor="autoupdate">Auto update jobs</Label>
        </div>
        <Button onClick={logout} variant="secondary" className="mt-2">
          <LogOut className="h-4 w-4 mr-2" /> Logout
        </Button>
      </PopoverContent>
    </Popover>
  );
}
