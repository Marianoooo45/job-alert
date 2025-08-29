"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Eye, EyeOff, User, CheckCircle2, AlertTriangle } from "lucide-react";

/** Fond animé partagé avec login */
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
          background:
            radial-gradient(circle at 20% 30%, rgba(34,211,238,.30), transparent 70%),
            radial-gradient(circle at 80% 20%, rgba(244,114,182,.25), transparent 70%),
            radial-gradient(circle at 50% 80%, rgba(236,72,153,.20), transparent 70%);
          background-blend-mode: screen;
          animation: auroraMove 25s ease-in-out infinite alternate;
        }
        @keyframes auroraMove {
          50% {
            background-position: 10% 20%, 85% 25%, 45% 85%;
            filter: hue-rotate(25deg) saturate(1.2);
          }
        }
        html.dark body, html.light body { background: transparent !important; }

        /* Carte glass avec halo néon (identique login) */
        .glass {
          position: relative;
          border-radius: 26px;
          background: color-mix(in oklab, var(--background) 74%, transparent);
          backdrop-filter: blur(20px) saturate(120%);
          -webkit-backdrop-filter: blur(20px) saturate(120%);
          border: 1px solid rgba(255,255,255,.10);
          box-shadow: 0 14px 60px -14px rgba(0,0,0,.55);
        }
        .glass::before {
          content: "";
          position: absolute;
          inset: 0;
          padding: 1px;
          border-radius: inherit;
          background: linear-gradient(135deg, #22d3ee, #f472b6);
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          opacity: .85;
        }
      `}</style>
    </>
  );
}

export default function RegisterPage() {
  const sp = useSearchParams();
  const next = sp.get("next") || "/";
  const code = sp.get("error"); // "invalid" | "exists" | "server" | null

  const [loading, setLoading] = useState(false);
  const [showPwd1, setShowPwd1] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [pwd1, setPwd1] = useState("");
  const [pwd2, setPwd2] = useState("");

  const message = useMemo(() => {
    switch (code) {
      case "invalid": return "Vérifie les champs (nom ≥ 3 caractères, mot de passe ≥ 6).";
      case "exists":  return "Utilisateur déjà existant. Choisis un autre identifiant.";
      case "server":  return "Erreur serveur. Réessaie dans un instant.";
      default:        return null;
    }
  }, [code]);

  const mismatch = pwd2.length > 0 && pwd1 !== pwd2;
  const tooShort = pwd1.length > 0 && pwd1.length < 6;
  const canSubmit = !loading && !mismatch && !tooShort && pwd1.length >= 6 && pwd2.length >= 6;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!canSubmit) {
      e.preventDefault();
      return;
    }
    setLoading(true);
  }

  return (
    <div className="relative z-[1] min-h-screen flex items-center justify-center p-6 bg-transparent text-foreground">
      <AuroraBackdrop />

      <Card className="glass w-full max-w-lg">
        <CardContent className="p-8 md:p-10 space-y-8">
          {/* Brand */}
          <div className="text-center">
            <Link href="/" className="inline-flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight">
                <span className="text-cyan-300">Job</span>{" "}
                <span className="text-pink-400 neon-title">Alert</span>
              </span>
            </Link>
            <h1 className="mt-3 text-2xl font-semibold">Créer un compte</h1>
            <p className="mt-1 text-sm text-muted-foreground">Connexion sécurisée 🔒</p>
          </div>

          {/* Error serveur / exists */}
          {message && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {message}
            </div>
          )}

          {/* Form */}
          <form method="POST" action="/api/register" onSubmit={onSubmit} className="space-y-6">
            <input type="hidden" name="next" value={next} />

            <div className="space-y-2">
              <Label htmlFor="username">Utilisateur</Label>
              <div className="relative">
                <Input
                  id="username"
                  name="username"
                  placeholder="nouvel identifiant"
                  minLength={3}
                  required
                  className="pl-10 h-11 rounded-xl bg-white/5 border-white/10 focus-visible:ring-2 focus-visible:ring-cyan-300/60 focus-visible:border-cyan-300/70"
                />
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
              </div>
            </div>

            {/* Mot de passe */}
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPwd1 ? "text" : "password"}
                  minLength={6}
                  required
                  value={pwd1}
                  onChange={(e) => setPwd1(e.target.value)}
                  className="pr-12 h-11 rounded-xl bg-white/5 border-white/10 focus-visible:ring-2 focus-visible:ring-cyan-300/60 focus-visible:border-cyan-300/70"
                  aria-invalid={tooShort ? true : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd1((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 hover:bg-white/10"
                  aria-label={showPwd1 ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPwd1 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Au moins 6 caractères.</p>
            </div>

            {/* Confirmation */}
            <div className="space-y-2">
              <Label htmlFor="password2">Confirme le mot de passe</Label>
              <div className="relative">
                <Input
                  id="password2"
                  type={showPwd2 ? "text" : "password"}
                  minLength={6}
                  required
                  value={pwd2}
                  onChange={(e) => setPwd2(e.target.value)}
                  className={`pr-12 h-11 rounded-xl bg-white/5 border-white/10 focus-visible:ring-2 focus-visible:ring-cyan-300/60 focus-visible:border-cyan-300/70
                    ${mismatch ? "border-red-500/50 focus-visible:ring-red-400/60 focus-visible:border-red-400/70" : ""}`}
                  aria-invalid={mismatch ? true : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd2((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 hover:bg-white/10"
                  aria-label={showPwd2 ? "Masquer la confirmation" : "Afficher la confirmation"}
                >
                  {showPwd2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Feedback live */}
              {mismatch ? (
                <div className="flex items-center gap-2 text-sm text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  Les mots de passe ne correspondent pas.
                </div>
              ) : pwd2.length >= 6 && pwd1.length >= 6 ? (
                <div className="flex items-center gap-2 text-sm text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Parfait, ça matche.
                </div>
              ) : null}
            </div>

            {/* Bouton gradient + voile noir (désactivé si mismatch) */}
            <button
              type="submit"
              disabled={!canSubmit}
              className="relative w-full h-12 rounded-2xl text-base font-medium overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="absolute inset-0 bg-black/30" />
              <span className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-rose-400 opacity-95" />
              <span className="relative flex items-center justify-center">
                <UserPlus className="mr-2 h-4 w-4" />
                {loading ? "Création..." : "Créer mon compte"}
              </span>
            </button>
          </form>

          {/* Footer */}
          <p className="text-sm text-center text-muted-foreground">
            Déjà un compte ?{" "}
            <Link href={`/login?next=${encodeURIComponent(next)}`} className="underline hover:text-foreground">
              Se connecter
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
