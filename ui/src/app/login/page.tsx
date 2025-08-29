"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const sp = useSearchParams();
  const next = sp.get("next") || "/";
  const error = sp.get("error");
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl shadow-lg p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Se connecter</h1>
        {error && (
          <p className="text-sm text-red-500">Identifiants invalides. Réessaie.</p>
        )}
        <form
          method="POST"
          action="/api/login"
          onSubmit={() => setLoading(true)}
          className="space-y-4"
        >
          <input type="hidden" name="next" value={next} />
          <div className="space-y-2">
            <label className="text-sm">Utilisateur</label>
            <input
              name="username"
              className="w-full border rounded-xl p-2"
              placeholder="admin"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm">Mot de passe</label>
            <input
              name="password"
              type="password"
              className="w-full border rounded-xl p-2"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl p-2 shadow"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        {/* 👉 Lien vers inscription */}
        <p className="text-sm text-center text-muted-foreground mt-2">
          Pas encore de compte ?{" "}
          <a
            href={`/register?next=${encodeURIComponent(next)}`}
            className="underline hover:text-foreground"
          >
            Créer un compte
          </a>
        </p>
      </div>
    </div>
  );
}
