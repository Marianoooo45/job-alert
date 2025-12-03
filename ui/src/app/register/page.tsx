"use client";

import { useSearchParams } from "next/navigation";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const sp = useSearchParams();
  const next = sp.get("next") || "/";
  const code = sp.get("error");

  const [loading, setLoading] = useState(false);
  const [pwd1, setPwd1] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const errorMsg = useMemo(() => {
    if (code === "exists") return "Cet identifiant est déjà pris.";
    if (code === "server") return "Erreur serveur. Réessayez.";
    if (code === "invalid") return "Format invalide (min 3 chars).";
    return null;
  }, [code]);

  const isValid = pwd1.length >= 6 && pwd1 === pwd2;

  function onSubmit(e: React.FormEvent) {
    if (!isValid || loading) { e.preventDefault(); return; }
    setLoading(true);
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-20" />
      <div className="absolute inset-0 z-0 bg-radial-gradient from-transparent to-background opacity-80 pointer-events-none" />

      <Card className="relative z-10 w-full max-w-[400px] bg-card border border-border shadow-2xl rounded-xl overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600" />
        
        <CardContent className="p-8 space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-surface-muted border border-border mb-4">
              <UserPlus className="w-5 h-5 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Initialisation</h1>
            <p className="text-sm text-muted-foreground">Créez votre profil candidat.</p>
          </div>

          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg text-sm text-center">
              {errorMsg}
            </div>
          )}

          <form method="POST" action="/api/register" onSubmit={onSubmit} className="space-y-5">
            <input type="hidden" name="next" value={next} />

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nouvel Identifiant</Label>
              <Input
                name="username"
                required
                minLength={3}
                className="h-11 bg-surface border-border focus-visible:border-indigo-500/50 focus-visible:ring-0 text-foreground rounded-lg placeholder:text-muted-foreground"
                placeholder="jdoe"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mot de passe</Label>
              <div className="relative">
                <Input
                  name="password"
                  type={showPwd ? "text" : "password"}
                  required
                  minLength={6}
                  value={pwd1}
                  onChange={(e) => setPwd1(e.target.value)}
                  className="h-11 bg-surface border-border focus-visible:border-indigo-500/50 focus-visible:ring-0 text-foreground rounded-lg pr-10 placeholder:text-muted-foreground"
                  placeholder="••••••"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Confirmation</Label>
              <Input
                type={showPwd ? "text" : "password"}
                required
                value={pwd2}
                onChange={(e) => setPwd2(e.target.value)}
                className={`h-11 bg-surface border-border focus-visible:ring-0 text-foreground rounded-lg placeholder:text-muted-foreground ${pwd2 && pwd1 !== pwd2 ? "border-red-500/50" : "focus-visible:border-indigo-500/50"}`}
                placeholder="••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !isValid}
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Configuration..." : "Valider l'inscription"}
            </button>
          </form>

          <div className="text-center pt-2">
            <p className="text-xs text-muted-foreground">
              Déjà enregistré ?{" "}
              <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-indigo-400 hover:text-indigo-300 hover:underline underline-offset-4">
                Se connecter
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}