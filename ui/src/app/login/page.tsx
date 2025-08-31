"use client";

import { useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, LogIn } from "lucide-react";

/** Fond animé léger et fluide */
function AuroraBackdrop() {
  return (
    <>
      <div className="aurora" />
      <style jsx global>{`
        .aurora {
          position: fixed;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          background: radial-gradient(
              circle at 20% 30%,
              rgba(34, 211, 238, 0.3),
              transparent 70%
            ),
            radial-gradient(
              circle at 80% 20%,
              rgba(244, 114, 182, 0.25),
              transparent 70%
            ),
            radial-gradient(
              circle at 50% 80%,
              rgba(236, 72, 153, 0.2),
              transparent 70%
            );
          background-blend-mode: screen;
          animation: auroraMove 25s ease-in-out infinite alternate;
        }
        @keyframes auroraMove {
          50% {
            background-position: 10% 20%, 85% 25%, 45% 85%;
            filter: hue-rotate(25deg) saturate(1.2);
          }
        }
        html.dark body,
        html.light body {
          background: transparent !important;
        }
        /* Carte glass avec halo néon */
        .glass {
          position: relative;
          border-radius: 26px;
          background: color-mix(in oklab, var(--background) 74%, transparent);
          backdrop-filter: blur(20px) saturate(120%);
          -webkit-backdrop-filter: blur(20px) saturate(120%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 14px 60px -14px rgba(0, 0, 0, 0.55);
        }
        .glass::before {
          content: "";
          position: absolute;
          inset: 0;
          padding: 1px;
          border-radius: inherit;
          background: linear-gradient(135deg, #22d3ee, #f472b6);
          -webkit-mask: linear-gradient(#000 0 0) content-box,
            linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          opacity: 0.85;
        }
      `}</style>
    </>
  );
}

export default function LoginPage() {
  const sp = useSearchParams();
  const next = sp.get("next") || "/";
  const error = sp.get("error");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const onSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    if (loading) {
      e.preventDefault(); // anti double-submit
      return;
    }
    setLoading(true);
  }, [loading]);

  return (
    <div className="relative z-[1] min-h-screen flex items-center justify-center p-6 bg-transparent text-foreground">
      <AuroraBackdrop />

      <Card className="glass w-full max-w-lg">
        <CardContent className="p-8 md:p-10 space-y-8">
          <div className="text-center">
            <div className="text-3xl font-extrabold tracking-tight">
              <span className="text-cyan-300">Job</span>{" "}
              <span className="text-pink-400 neon-title">Alert</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Connexion sécurisée 🔒
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              Identifiants invalides. Réessaie.
            </div>
          )}

          <form
            method="POST"
            action="/api/login"
            onSubmit={onSubmit}
            className="space-y-6"
            noValidate
          >
            <input type="hidden" name="next" value={next} />

            <div className="space-y-2">
              <Label htmlFor="username">Utilisateur</Label>
              <Input
                id="username"
                name="username"
                placeholder="ton identifiant"
                required
                autoComplete="username"
                autoFocus
                enterKeyHint="next"
                className="h-11 rounded-xl bg-white/5 border-white/10 focus-visible:ring-2 focus-visible:ring-cyan-300/60 focus-visible:border-cyan-300/70"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPwd ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  enterKeyHint="go"
                  className="h-11 rounded-xl bg-white/5 border-white/10 pr-12 focus-visible:ring-2 focus-visible:ring-cyan-300/60 focus-visible:border-cyan-300/70"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 hover:bg-white/10"
                  aria-label={showPwd ? "Masquer" : "Afficher"}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Bouton gradient + voile noir */}
            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="relative w-full h-12 rounded-2xl text-base font-medium overflow-hidden disabled:opacity-60"
            >
              <span className="absolute inset-0 bg-black/30" />
              <span className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-rose-400 opacity-95" />
              <span className="relative flex items-center justify-center">
                <LogIn className="mr-2 h-5 w-5" />
                {loading ? "Connexion..." : "Se connecter"}
              </span>
            </button>
          </form>

          <p className="text-sm text-center text-muted-foreground">
            Pas encore de compte ?{" "}
            <a
              href={`/register?next=${encodeURIComponent(next)}`}
              className="underline hover:text-foreground"
            >
              Créer un compte
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
