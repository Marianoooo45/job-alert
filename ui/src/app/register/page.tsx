"use client";

import { useSearchParams } from "next/navigation";
import { useState, useMemo } from "react";

export default function RegisterPage() {
  const sp = useSearchParams();
  const next = sp.get("next") || "/";
  const code = sp.get("error"); // "invalid" | "exists" | "server" | null
  const [loading, setLoading] = useState(false);

  const message = useMemo(() => {
    switch (code) {
      case "invalid":
        return "Vérifie les champs (nom ≥ 3 caractères, mot de passe ≥ 6).";
      case "exists":
        return "Utilisateur déjà existant. Choisis un autre identifiant.";
      case "server":
        return "Erreur serveur. Réessaie dans un instant.";
      default:
        return null;
    }
  }, [code]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl shadow-lg p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Créer un compte</h1>

        {message && <p className="text-sm text-red-500">{message}</p>}

        <form
          method="POST"
          action="/api/register"
          onSubmit={() => setLoading(true)}
          className="space-y-4"
        >
          <input type="hidden" name="next" value={next} />
          <div className="space-y-2">
            <label className="text-sm">Utilisateur</label>
            <input
              name="username"
              className="w-full border rounded-xl p-2"
              placeholder="ton pseudo"
              minLength={3}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm">Mot de passe</label>
            <input
              name="password"
              type="password"
              className="w-full border rounded-xl p-2"
              minLength={6}
              required
            />
          </div>
          <button type="submit" disabled={loading} className="w-full rounded-2xl p-2 shadow">
            {loading ? "Création..." : "Créer mon compte"}
          </button>
        </form>

        <p className="text-xs opacity-70">6+ caractères, unique.</p>
        <p className="text-sm text-center text-muted-foreground">
          Déjà un compte ?{" "}
          <a href={`/login?next=${encodeURIComponent(next)}`} className="underline">
            Se connecter
          </a>
        </p>
      </div>
    </div>
  );
}
