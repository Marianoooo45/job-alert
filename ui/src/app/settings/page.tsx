// =============================
// ui/src/app/settings/page.tsx  (UX + style + modal + select alert + rows preset)
// =============================
"use client";
import { useEffect, useMemo, useState } from "react";

type AlertsResponse = { ok: boolean; alerts: any[] };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "px-3 py-2 rounded-md w-full",
        "bg-white/5 border border-white/15",
        "outline-none focus:ring-2 focus:ring-pink-400/40 focus:border-white/20",
        props.className || "",
      ].join(" ")}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={[
        "px-3 py-2 rounded-md w-full",
        "bg-white/5 border border-white/15",
        "outline-none focus:ring-2 focus:ring-pink-400/40 focus:border-white/20",
        props.className || "",
      ].join(" ")}
    />
  );
}

export default function SettingsPage() {
  // profile
  const [email, setEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState<boolean>(false);

  // channels
  const [webhook, setWebhook] = useState("");
  const [qhStart, setQhStart] = useState("22:00");
  const [qhEnd, setQhEnd] = useState("08:00");
  const [tz, setTz] = useState("Europe/Paris");
  const [selectedAlertId, setSelectedAlertId] = useState("");
  const [alerts, setAlerts] = useState<{ id?: string; name?: string; title?: string }[]>([]);

  // prefs
  const [rows, setRows] = useState(25);
  const [compact, setCompact] = useState(false);
  const [defaultCountry, setDefaultCountry] = useState("FR");

  // ui
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const rowsOptions = useMemo(() => [10, 25, 50, 100], []);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const p = await fetch("/api/account/profile", { cache:"no-store" }).then(r=>r.json());
      if (!cancel && p?.ok) { setEmail(p.profile?.email || ""); setEmailVerified(!!p.profile?.emailVerified); }

      const c = await fetch("/api/account/channels", { cache:"no-store" }).then(r=>r.json());
      if (!cancel && c?.ok) {
        setWebhook(c.channels.discordWebhookUrl || "");
        setQhStart(c.channels.quietHoursStart||"22:00");
        setQhEnd(c.channels.quietHoursEnd||"08:00");
        setTz(c.channels.timezone||"Europe/Paris");
        setSelectedAlertId(c.channels.selectedAlertId || "");
      }

      // récupère les alertes existantes pour peupler le select
      try {
        const a: AlertsResponse = await fetch("/api/user/alerts", { cache: "no-store" }).then(r=>r.json());
        if (!cancel && a?.ok && Array.isArray(a.alerts)) {
          setAlerts(a.alerts);
        }
      } catch {}

      const pr = await fetch("/api/account/prefs", { cache:"no-store" }).then(r=>r.json());
      if (!cancel && pr?.ok) {
        const preset = [10,25,50,100].includes(+pr.prefs.rowsPerPage) ? +pr.prefs.rowsPerPage : 25;
        setRows(preset);
        setCompact(!!pr.prefs.compactMode);
        setDefaultCountry(pr.prefs.defaultCountry||"FR");
      }

      if (!cancel) setLoading(false);
    })();
    return ()=>{ cancel = true; };
  }, []);

  async function saveChannels() {
    setMsg(null);
    const r = await fetch("/api/account/channels", {
      method:"PUT",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        discordWebhookUrl: webhook,
        quietHoursStart: qhStart,
        quietHoursEnd: qhEnd,
        timezone: tz,
        selectedAlertId, // 👈 envoi de l’alerte cible
      }),
    });
    setMsg(r.ok ? "Canaux d'alerte enregistrés." : "Erreur d'enregistrement des canaux.");
  }

  async function savePrefs() {
    setMsg(null);
    const r = await fetch("/api/account/prefs", {
      method:"PUT",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        rowsPerPage: rows,
        compactMode: compact,
        defaultCountry,
      }),
    });
    setMsg(r.ok ? "Préférences enregistrées." : "Erreur d'enregistrement des préférences.");
  }

  async function exportData() {
    const r = await fetch("/api/account/export");
    if (!r.ok) { setMsg("Export impossible."); return; }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = r.headers.get("Content-Disposition")?.split("filename=")[1] || "export.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function deleteAccount() {
    const confirmName = prompt("Pour confirmer, retape ton username :");
    if (!confirmName) return;
    const r = await fetch("/api/account/delete", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ confirm: confirmName }) });
    if (r.ok) window.location.href = "/login"; else setMsg("Suppression refusée.");
  }

  return (
    <main className="page-shell container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero */}
      <section className="panel rounded-3xl mb-8 border border-border">
        <div className="p-6 sm:p-8">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Réglages <span className="neon-title">compte</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Gère la sécurité, les canaux d’alerte et tes préférences d’affichage.
          </p>
          {loading && <p className="mt-3 text-xs text-muted-foreground">Chargement…</p>}
          {msg && <p className="mt-3 text-sm text-foreground/90">{msg}</p>}
        </div>
      </section>

      {/* Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sécurité */}
        <section className="panel rounded-2xl p-5 sm:p-6 border border-border">
          <h2 className="text-lg font-medium mb-4">Sécurité</h2>

          <div className="grid gap-3">
            <Field label="Email">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="email@exemple.com" />
                <button disabled className="px-3 py-2 rounded-md bg-white/10 text-foreground/60 cursor-not-allowed">
                  Enregistrer (bientôt)
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs mt-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full border ${emailVerified ? "border-emerald-500/30 text-emerald-300" : "border-amber-500/30 text-amber-300"}`}>
                  {emailVerified ? "Email vérifié" : "Email non vérifié"}
                </span>
                {!emailVerified && <span className="text-muted-foreground">La vérification sera activée prochainement.</span>}
              </div>
            </Field>

            <div className="pt-2">
              <button onClick={()=>setShowPwd(true)} className="px-3 py-2 rounded-md bg-white/10 hover:bg-white/15 transition">
                Changer le mot de passe
              </button>
            </div>
          </div>
        </section>

        {/* Canaux d'alerte */}
        <section className="panel rounded-2xl p-5 sm:p-6 border border-border">
          <h2 className="text-lg font-medium mb-4">Canaux d’alerte</h2>

          <div className="grid gap-4">
            <Field label="Discord Webhook (optionnel)">
              <Input value={webhook} onChange={(e)=>setWebhook(e.target.value)} placeholder="https://discord.com/api/webhooks/…" />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Heure début"><Input value={qhStart} onChange={(e)=>setQhStart(e.target.value)} /></Field>
              <Field label="Heure fin"><Input value={qhEnd} onChange={(e)=>setQhEnd(e.target.value)} /></Field>
              <Field label="Fuseau horaire"><Input value={tz} onChange={(e)=>setTz(e.target.value)} /></Field>
            </div>

            <Field label="Alerte cible (envoi uniquement les offres de cette alerte)">
              <Select value={selectedAlertId} onChange={(e)=>setSelectedAlertId(e.target.value)}>
                <option value="">— Aucune (désactivé) —</option>
                {alerts.map((a, i) => (
                  <option key={(a.id ?? i).toString()} value={(a.id ?? "").toString()}>
                    {a.name || a.title || `Alerte #${i+1}`}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="pt-1">
              <button onClick={saveChannels} className="px-3 py-2 rounded-md bg-white/10 hover:bg-white/15 transition">
                Enregistrer
              </button>
            </div>
          </div>
        </section>

        {/* Préférences */}
        <section className="panel rounded-2xl p-5 sm:p-6 border border-border">
          <h2 className="text-lg font-medium mb-4">Préférences d’affichage</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <Field label="Lignes / page">
              <Select value={rows} onChange={(e)=>setRows(+e.target.value)}>
                {[10,25,50,100].map(v => <option key={v} value={v}>{v}</option>)}
              </Select>
            </Field>

            <div className="flex items-center gap-2 sm:mt-6">
              <input
                id="cmp"
                type="checkbox"
                checked={compact}
                onChange={(e)=>setCompact(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/5"
              />
              <label htmlFor="cmp" className="text-sm">
                Mode compact
                <span className="text-xs text-muted-foreground ml-2">(réduit la hauteur des lignes des tableaux)</span>
              </label>
            </div>

            <Field label="Pays par défaut">
              <Input value={defaultCountry} onChange={(e)=>setDefaultCountry(e.target.value)} placeholder="FR" />
            </Field>
          </div>

          <div className="pt-4">
            <button onClick={savePrefs} className="px-3 py-2 rounded-md bg-white/10 hover:bg-white/15 transition">
              Enregistrer
            </button>
          </div>
        </section>

        {/* Données */}
        <section className="panel rounded-2xl p-5 sm:p-6 border border-border">
          <h2 className="text-lg font-medium mb-4">Données & confidentialité</h2>

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={exportData} className="px-3 py-2 rounded-md bg-white/10 hover:bg-white/15 transition">
              Exporter mes données
            </button>
            <button onClick={deleteAccount} className="px-3 py-2 rounded-md bg-red-600/20 hover:bg-red-600/30 text-red-300 transition">
              Supprimer mon compte
            </button>
          </div>
        </section>
      </div>

      {/* Modal Changer mot de passe */}
      {showPwd && <PasswordModal onClose={()=>setShowPwd(false)} onSaved={(m)=>setMsg(m)} />}
    </main>
  );
}

function PasswordModal({ onClose, onSaved }: { onClose: ()=>void; onSaved:(m:string)=>void }) {
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [newPwd2, setNewPwd2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSave = oldPwd.length > 0 && newPwd.length >= 6 && newPwd === newPwd2;

  async function save() {
    setErr(null);
    if (!canSave) { setErr("Vérifie les champs."); return; }
    setLoading(true);
    const r = await fetch("/api/account/security/password", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd }),
    });
    setLoading(false);
    if (r.ok) { onSaved("Mot de passe modifié."); onClose(); }
    else setErr("Échec : ancien mot de passe invalide.");
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl panel border border-border p-5 sm:p-6 bg-background">
        <h3 className="text-lg font-medium mb-4">Changer le mot de passe</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Ancien mot de passe</label>
            <input type="password" value={oldPwd} onChange={(e)=>setOldPwd(e.target.value)}
              className="px-3 py-2 rounded-md w-full bg-white/5 border border-white/15 outline-none focus:ring-2 focus:ring-pink-400/40" />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Nouveau mot de passe</label>
            <input type="password" value={newPwd} onChange={(e)=>setNewPwd(e.target.value)}
              className="px-3 py-2 rounded-md w-full bg-white/5 border border-white/15 outline-none focus:ring-2 focus:ring-pink-400/40" />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Confirmer le nouveau mot de passe</label>
            <input type="password" value={newPwd2} onChange={(e)=>setNewPwd2(e.target.value)}
              className="px-3 py-2 rounded-md w-full bg-white/5 border border-white/15 outline-none focus:ring-2 focus:ring-pink-400/40" />
          </div>
          {err && <p className="text-sm text-red-300">{err}</p>}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-3 py-2 rounded-md bg-white/5 hover:bg-white/10">Annuler</button>
          <button onClick={save} disabled={!canSave || loading}
            className={`px-3 py-2 rounded-md ${canSave && !loading ? "bg-white/10 hover:bg-white/15" : "bg-white/5 opacity-50 cursor-not-allowed"}`}>
            {loading ? "…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
