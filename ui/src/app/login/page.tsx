// src/app/login/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useState, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const sp = useSearchParams();
  const next = sp.get("next") || "/";
  const errorCode = sp.get("error");

  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const errorMsg = useMemo(() => {
    if (!errorCode) return null;
    if (errorCode === "db_error") return "Base de données indisponible.";
    if (errorCode === "no_user") return "Utilisateur introuvable.";
    if (errorCode === "creds") return "Identifiants invalides.";
    return `Erreur d'accès: ${errorCode}`;
  }, [errorCode]);

  const onSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    if (loading) { e.preventDefault(); return; }
    setLoading(true);
  }, [loading]);

  return (
    // CORRECTION: bg-[#050505] -> bg-background, text-slate-200 -> text-foreground
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
      
      {/* Grille de fond : adaptation de la couleur pour light mode */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-20" />
      
      {/* Effet vignettage adapté */}
      <div className="absolute inset-0 z-0 bg-radial-gradient from-transparent to-background opacity-80 pointer-events-none" />

      {/* bg-[#0A0A0A] -> bg-card, border-white/10 -> border-border */}
      <Card className="relative z-10 w-full max-w-[400px] bg-card border border-border shadow-2xl rounded-xl overflow-hidden">
        {/* Liseré haut inchangé (gradient) */}
        <div className="h-1 w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600" />
        
        <CardContent className="p-8 space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-surface-muted border border-border mb-4">
              <Lock className="w-5 h-5 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Connexion</h1>
            <p className="text-sm text-muted-foreground">Accédez à votre terminal JobAlert.</p>
          </div>

          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm text-center">
              {errorMsg}
            </div>
          )}

          <form method="POST" action="/api/login" onSubmit={onSubmit} className="space-y-5">
            <input type="hidden" name="next" value={next} />

            <div className="space-y-2">
              <Label htmlFor="username" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Identifiant</Label>
              <Input
                id="username"
                name="username"
                required
                autoFocus
                className="h-11 bg-surface border-border focus-visible:border-indigo-500/50 focus-visible:ring-0 text-foreground rounded-lg transition-colors placeholder:text-muted-foreground"
                placeholder="nom d'utilisateur"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mot de passe</Label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPwd ? "text" : "password"}
                  required
                  className="h-11 bg-surface border-border focus-visible:border-indigo-500/50 focus-visible:ring-0 text-foreground rounded-lg pr-10 placeholder:text-muted-foreground"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Connexion..." : <>Accéder au système <ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="text-center pt-2">
            <p className="text-xs text-muted-foreground">
              Pas de compte ?{" "}
              <Link href={`/register?next=${encodeURIComponent(next)}`} className="text-indigo-400 hover:text-indigo-300 hover:underline underline-offset-4">
                Créer un accès
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}