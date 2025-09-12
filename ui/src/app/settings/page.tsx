"use client";

import { useEffect, useMemo, useState } from "react";

/** ===== Banner images (light / dark) ===== */
const HERO_IMG_LIGHT =
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1600&auto=format&fit=crop"; // desk / dashboard clair
const HERO_IMG_DARK =
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1600&auto=format&fit=crop"; // rack / serveur néon

/* ----------------------- Aurora backdrop dynamique (light only) ----------------------- */
function AuroraBackdrop() {
  return (
    <>
      <div className="aurora-dyn" aria-hidden="true" />
      <style jsx global>{`
        /* cacher en dark */
        html.dark .aurora-dyn { display: none; }

        /* conteneur global */
        html:not(.dark) .aurora-dyn {
          position: fixed;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          background: transparent;
          overflow: hidden;
        }

        /* halos radiaux */
        html:not(.dark) .aurora-dyn::before {
          content: "";
          position: absolute;
          inset: -12% -12% -12% -12%;
          background:
            radial-gradient(1000px 700px at 50% 68%, rgba(244,114,182,.22), transparent 65%),
            radial-gradient(1400px 900px at 50% 52%, rgba(59,130,246,.30), transparent 75%),
            radial-gradient(900px 900px at 0% 0%,    rgba(59,130,246,.42), transparent 70%),
            radial-gradient(900px 900px at 100% 0%,  rgba(59,130,246,.40), transparent 70%),
            radial-gradient(900px 900px at 0% 100%,  rgba(34,211,238,.42), transparent 70%),
            radial-gradient(900px 900px at 100% 100%,rgba(34,211,238,.40), transparent 70%);
          background-repeat: no-repeat;
          background-attachment: fixed;
          background-blend-mode: screen;
          opacity: .95;
          filter: saturate(1.25) brightness(1.05);
          animation: auroraDrift 26s ease-in-out infinite alternate,
                     auroraPulse 12s ease-in-out infinite;
        }

        /* voiles coniques */
        html:not(.dark) .aurora-dyn::after {
          content: "";
          position: absolute;
          inset: -15% -15% -15% -15%;
          background:
            conic-gradient(from 210deg at 30% 40%, rgba(56,189,248,.16), rgba(216,180,254,.12), transparent 60%),
            conic-gradient(from  60deg at 70% 60%, rgba(147,197,253,.14), rgba(244,114,182,.12), transparent 62%);
          mix-blend-mode: screen;
          animation: auroraSweep 20s ease-in-out infinite alternate,
                     auroraTilt 32s ease-in-out infinite;
        }

        @keyframes auroraDrift {
          50% {
            background-position:
              52% 70%, 50% 54%, 0% 2%, 98% 0%, 2% 98%, 98% 98%;
            filter: hue-rotate(12deg) saturate(1.2) brightness(1.08);
            transform: translateY(-1%) scale(1.015);
          }
        }
        @keyframes auroraPulse {
          0%,100% { opacity: .9; }
          50%     { opacity: .99; }
        }
        @keyframes auroraSweep {
          0%   { background-position: 0% 0%, 100% 100%; opacity: .55; }
          50%  { background-position: 20% 10%, 80% 85%; opacity: .75; }
          100% { background-position: 0% 0%, 100% 100%; opacity: .60; }
        }
        @keyframes auroraTilt {
          0%   { transform: rotate(-0.8deg); }
          50%  { transform: rotate(0.9deg) translateY(-1%); }
          100% { transform: rotate(-0.8deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          html:not(.dark) .aurora-dyn::before,
          html:not(.dark) .aurora-dyn::after {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>
    </>
  );
}


/* ----------------------- Tiny toast system ----------------------- */
type Toast = { id: number; msg: string; tone?: "ok" | "warn" | "err" };
function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  function push(msg: string, tone: Toast["tone"] = "ok") {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }
  return { toasts, push, remove: (id: number) => setToasts((t) => t.filter((x) => x.id !== id)) };
}

/* --------------------------------- UI atoms --------------------------------- */
function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="panel neon-hover neon-outline">
      <header className="flex items-start justify-between gap-3 px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
      </header>
      <div className="px-5 pb-5 sm:px-6 sm:pb-6">{children}</div>
    </section>
  );
}
function Field({ id, label, children, hint }: { id?: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm text-muted-foreground">{label}</label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground/90">{hint}</p> : null}
    </div>
  );
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input
      {...rest}
      className={[
        "w-full h-10 px-3 rounded-xl",
        "bg-card border border-border",
        "focus:outline-none focus:ring-2",
        "focus:ring-[color-mix(in_oklab,var(--color-primary)_30%,transparent)]",
        "focus:border-[color-mix(in_oklab,var(--color-primary)_45%,var(--color-border))]",
        className || "",
      ].join(" ")}
    />
  );
}
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, ...rest } = props;
  return (
    <select
      {...rest}
      className={[
        "w-full h-10 px-3 rounded-xl",
        "bg-card border border-border",
        "focus:outline-none focus:ring-2",
        "focus:ring-[color-mix(in_oklab,var(--color-primary)_30%,transparent)]",
        "focus:border-[color-mix(in_oklab,var(--color-primary)_45%,var(--color-border))]",
        className || "",
      ].join(" ")}
    />
  );
}
function Pill({ tone = "default", children }: { tone?: "default" | "ok" | "warn" | "err"; children: React.ReactNode }) {
  const toneCls =
    tone === "ok"
      ? "border-[color-mix(in_oklab,var(--color-success)_45%,var(--color-border))] text-[color-mix(in_oklab,var(--color-success)_85%,#fff)]"
      : tone === "warn"
      ? "border-[color-mix(in_oklab,var(--color-warning)_45%,var(--color-border))] text-[color-mix(in_oklab,var(--color-warning)_85%,#000)]"
      : tone === "err"
      ? "border-[color-mix(in_oklab,var(--destructive)_45%,var(--color-border))] text-[color-mix(in_oklab,var(--destructive)_85%,#000)]"
      : "border-border text-muted-foreground";
  return <span className={["inline-flex items-center text-xs px-2 py-0.5 rounded-full border", toneCls].join(" ")}>{children}</span>;
}
function DangerButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, ...rest } = props;
  return (
    <button
      {...rest}
      className={[
        "inline-flex items-center justify-center whitespace-nowrap px-3 py-2 rounded-xl",
        "border transition",
        "bg-[color-mix(in_oklab,var(--destructive)_12%,var(--color-surface))]",
        "text-[color-mix(in_oklab,var(--destructive)_80%,var(--foreground))]",
        "border-[color-mix(in_oklab,var(--destructive)_45%,var(--color-border))]",
        "hover:brightness-110 active:brightness-105",
        className || "",
      ].join(" ")}
    />
  );
}

/* ----------------------------------- Page ----------------------------------- */
type AlertsResponse = { ok: boolean; alerts: any[] };

export default function SettingsPage() {
  const { toasts, push, remove } = useToasts();

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
  const [showPwd, setShowPwd] = useState(false);
  const rowsOptions = useMemo(() => [10, 25, 50, 100], []);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const p = await fetch("/api/account/profile", { cache: "no-store" }).then((r) => r.json());
      if (!cancel && p?.ok) { setEmail(p.profile?.email || ""); setEmailVerified(!!p.profile?.emailVerified); }

      const c = await fetch("/api/account/channels", { cache: "no-store" }).then((r) => r.json());
      if (!cancel && c?.ok) {
        setWebhook(c.channels.discordWebhookUrl || "");
        setQhStart(c.channels.quietHoursStart || "22:00");
        setQhEnd(c.channels.quietHoursEnd || "08:00");
        setTz(c.channels.timezone || "Europe/Paris");
        setSelectedAlertId(c.channels.selectedAlertId || "");
      }

      try {
        const a: AlertsResponse = await fetch("/api/user/alerts", { cache: "no-store" }).then((r) => r.json());
        if (!cancel && a?.ok && Array.isArray(a.alerts)) setAlerts(a.alerts);
      } catch {}

      const pr = await fetch("/api/account/prefs", { cache: "no-store" }).then((r) => r.json());
      if (!cancel && pr?.ok) {
        const preset = [10, 25, 50, 100].includes(+pr.prefs.rowsPerPage) ? +pr.prefs.rowsPerPage : 25;
        setRows(preset); setCompact(!!pr.prefs.compactMode); setDefaultCountry(pr.prefs.defaultCountry || "FR");
      }
      if (!cancel) setLoading(false);
    })();
    return () => { cancel = true; };
  }, []);

  async function saveChannels() {
    const r = await fetch("/api/account/channels", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discordWebhookUrl: webhook, quietHoursStart: qhStart, quietHoursEnd: qhEnd, timezone: tz, selectedAlertId }),
    });
    push(r.ok ? "Canaux d'alerte enregistrés." : "Erreur d'enregistrement des canaux.", r.ok ? "ok" : "err");
  }
  async function savePrefs() {
    const r = await fetch("/api/account/prefs", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rowsPerPage: rows, compactMode: compact, defaultCountry }),
    });
    push(r.ok ? "Préférences enregistrées." : "Erreur d'enregistrement des préférences.", r.ok ? "ok" : "err");
  }
  async function exportData() {
    const r = await fetch("/api/account/export");
    if (!r.ok) return void push("Export impossible.", "err");
    const blob = await r.blob(); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = r.headers.get("Content-Disposition")?.split("filename=")[1] || "export.json";
    a.click(); URL.revokeObjectURL(url);
    push("Export prêt au téléchargement.");
  }
  async function deleteAccount() {
    const confirmName = prompt("Pour confirmer, retape ton username :");
    if (!confirmName) return;
    const r = await fetch("/api/account/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: confirmName }) });
    if (r.ok) { push("Compte supprimé.", "ok"); window.location.href = "/login"; } else { push("Suppression refusée.", "err"); }
  }

  return (
    <main className="relative container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <AuroraBackdrop />

      {/* ---------- HERO (image encastrée pour laisser respirer le contour) ---------- */}
<section className="panel-xl neon-outline mb-8 relative p-3">
  {/* Cadre interne pour l'image, afin de laisser le liseré dégradé visible autour */}
  <div className="rounded-xl overflow-hidden border border-border/70">
    <div className="hero-media relative h-[160px] sm:h-[200px] md:h-[220px]">
      {/* Light / Dark */}
      <img
        src={HERO_IMG_LIGHT}
        alt=""
        className="media-light w-full h-full object-cover object-center"
      />
      <img
        src={HERO_IMG_DARK}
        alt=""
        className="media-dark w-full h-full object-cover object-center"
      />
      {/* Scrim doux pour la lisibilité */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[color-mix(in_oklab,var(--background)_86%,transparent)] via-transparent to-transparent" />
    </div>
  </div>

  {/* Texte sous l’image, à l’intérieur de la même carte */}
  <div className="relative px-4 sm:px-6 py-5">
    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
      <span className="text-[color-mix(in_oklab,var(--color-accent)_80%,#7dd3fc)]">Réglages</span>{" "}
      <span className="neon-title"> du compte</span>
    </h1>
    <p className="mt-2 text-sm text-muted-foreground">
      Gère la sécurité, les canaux d’alerte et tes préférences d’affichage.
    </p>
    {loading && <p className="mt-3 text-xs text-muted-foreground">Chargement…</p>}
  </div>
</section>


      {/* GRID */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sécurité */}
        <SectionCard title="Sécurité">
          <div className="grid gap-4">
            <Field id="email" label="Email">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemple.com" />
                <button disabled className="btn-ghost min-w-[160px] h-10 whitespace-nowrap rounded-xl cursor-not-allowed" title="Bientôt disponible">
                  Enregistrer (bientôt)
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs mt-1">
                <Pill tone={emailVerified ? "ok" : "warn"}>{emailVerified ? "Email vérifié" : "Email non vérifié"}</Pill>
                {!emailVerified ? <span className="text-muted-foreground">La vérification arrive bientôt.</span> : null}
              </div>
            </Field>

            <div className="pt-1">
              <button onClick={() => setShowPwd(true)} className="btn h-10 rounded-xl">Changer le mot de passe</button>
            </div>
          </div>
        </SectionCard>

        {/* Canaux d’alerte */}
        <SectionCard title="Canaux d’alerte" subtitle="Choisis où et quand tu reçois les notifications.">
          <div className="grid gap-4">
            <Field id="wh" label="Discord Webhook (optionnel)" hint="Laisse vide si tu ne souhaites pas recevoir d’alertes Discord.">
              <Input id="wh" value={webhook} onChange={(e) => setWebhook(e.target.value)} placeholder="https://discord.com/api/webhooks/…" />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field id="qhstart" label="Heure début"><Input id="qhstart" type="time" value={qhStart} onChange={(e) => setQhStart(e.target.value)} /></Field>
              <Field id="qhend"  label="Heure fin"><Input id="qhend"  type="time" value={qhEnd}   onChange={(e) => setQhEnd(e.target.value)} /></Field>
              <Field id="tz"      label="Fuseau horaire"><Input id="tz" value={tz} onChange={(e) => setTz(e.target.value)} placeholder="Europe/Paris" /></Field>
            </div>

            <Field id="alertId" label="Alerte cible (n’envoie que les offres de cette alerte)">
              <Select id="alertId" value={selectedAlertId} onChange={(e) => setSelectedAlertId(e.target.value)}>
                <option value="">— Aucune (désactivé) —</option>
                {alerts.map((a, i) => (
                  <option key={(a.id ?? i).toString()} value={(a.id ?? "").toString()}>
                    {a.name || a.title || `Alerte #${i + 1}`}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="pt-1">
              <button onClick={saveChannels} className="btn h-10 rounded-xl">Enregistrer</button>
            </div>
          </div>
        </SectionCard>

        {/* Préférences */}
        <SectionCard title="Préférences d’affichage">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <Field id="rows" label="Lignes / page">
              <Select id="rows" value={rows} onChange={(e) => setRows(+e.target.value)}>
                {rowsOptions.map((v) => (<option key={v} value={v}>{v}</option>))}
              </Select>
            </Field>

            <div className="flex items-center gap-2 sm:mt-6">
              <input id="cmp" type="checkbox" checked={compact} onChange={(e) => setCompact(e.target.checked)} className="h-4 w-4 rounded border-border bg-card" />
              <label htmlFor="cmp" className="text-sm">
                Mode compact <span className="text-xs text-muted-foreground ml-2">(réduit la hauteur des lignes des tableaux)</span>
              </label>
            </div>

            <Field id="country" label="Pays par défaut">
              <Input id="country" value={defaultCountry} onChange={(e) => setDefaultCountry(e.target.value)} placeholder="FR" />
            </Field>
          </div>

          <div className="pt-4">
            <button onClick={savePrefs} className="btn h-10 rounded-xl">Enregistrer</button>
          </div>
        </SectionCard>

        {/* Données */}
        <SectionCard title="Données & confidentialité">
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={exportData} className="btn-ghost h-10 rounded-xl">Exporter mes données</button>
            <DangerButton onClick={deleteAccount}>Supprimer mon compte</DangerButton>
          </div>
        </SectionCard>
      </div>

      {/* Password modal */}
      {showPwd ? <PasswordModal onClose={() => setShowPwd(false)} onSaved={(m) => push(m, "ok")} /> : null}

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-[60] space-y-2" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            onClick={() => remove(t.id)}
            className={[
              "min-w-[220px] max-w-[360px] cursor-pointer select-none",
              "rounded-xl border px-3 py-2 shadow-md backdrop-blur",
              "bg-[color-mix(in_oklab,var(--background)_92%,transparent)]",
              "transition hover:-translate-y-0.5 hover:shadow-lg",
              t.tone === "ok"
                ? "border-[color-mix(in_oklab,var(--color-success)_40%,var(--color-border))] text-[color-mix(in_oklab,var(--color-success)_80%,var(--foreground))]"
                : t.tone === "warn"
                ? "border-[color-mix(in_oklab,var(--color-warning)_40%,var(--color-border))] text-[color-mix(in_oklab,var(--color-warning)_80%,var(--foreground))]"
                : "border-[color-mix(in_oklab,var(--destructive)_40%,var(--color-border))] text-[color-mix(in_oklab,var(--destructive)_80%,var(--foreground))]",
            ].join(" ")}
          >
            {t.msg}
          </div>
        ))}
      </div>

      {/* Signature outline (contours dégradés) */}
      <style jsx global>{`
        .neon-outline{ position:relative; border-radius:var(--pro-radius); background:var(--color-surface); border:1px solid var(--color-border); overflow:clip; }
        .neon-outline::before{
          content:""; position:absolute; inset:0; border-radius:inherit; padding:1px;
          background:linear-gradient(135deg, var(--color-accent), var(--color-primary), var(--destructive));
          -webkit-mask:linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite:xor; mask-composite:exclude; pointer-events:none; opacity:.85;
        }
        .neon-outline > header { border-bottom:1px solid color-mix(in oklab, var(--color-border) 70%, transparent); }
        .neon-outline > header::after{
          content:""; display:block; height:2px; margin-top:-1px;
          background:linear-gradient(90deg, var(--color-accent), var(--color-primary), transparent);
          opacity:.15;
        }
      `}</style>
    </main>
  );
}

/* --------------------------- Password modal --------------------------- */
function PasswordModal({ onClose, onSaved }: { onClose: () => void; onSaved: (m: string) => void }) {
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [newPwd2, setNewPwd2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSave = oldPwd.length > 0 && newPwd.length >= 6 && newPwd === newPwd2;

  async function save() {
    setErr(null);
    if (!canSave) return setErr("Vérifie les champs.");
    setLoading(true);
    const r = await fetch("/api/account/security/password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd }),
    });
    setLoading(false);
    if (r.ok) { onSaved("Mot de passe modifié."); onClose(); }
    else setErr("Échec : ancien mot de passe invalide.");
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="panel neon-outline w-full max-w-md">
        <div className="px-5 py-5 sm:px-6 sm:py-6">
          <h3 className="text-lg font-semibold mb-4">Changer le mot de passe</h3>
          <div className="space-y-3">
            <Field id="old" label="Ancien mot de passe"><Input id="old" type="password" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} /></Field>
            <Field id="new" label="Nouveau mot de passe"><Input id="new" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} /></Field>
            <Field id="new2" label="Confirmer le nouveau mot de passe"><Input id="new2" type="password" value={newPwd2} onChange={(e) => setNewPwd2(e.target.value)} /></Field>
            {err ? <p className="text-sm text-[color-mix(in_oklab,var(--destructive)_80%,var(--foreground))]">{err}</p> : null}
          </div>

          <div className="flex justify-end gap-2 mt-5">
            <button onClick={onClose} className="btn-ghost h-10 rounded-xl">Annuler</button>
            <button onClick={save} disabled={!canSave || loading} className="btn h-10 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? "…" : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
