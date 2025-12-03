"use client";

import { useEffect, useState, useMemo } from "react";
import { Settings, Shield, Bell, Layout, Download, Trash2, Save } from "lucide-react";

type Toast = { id: number; msg: string; type: "ok" | "err" };
function useToasts() {
  const [list, setList] = useState<Toast[]>([]);
  const push = (msg: string, type: "ok" | "err" = "ok") => {
    const id = Date.now(); setList(l => [...l, { id, msg, type }]);
    setTimeout(() => setList(l => l.filter(t => t.id !== id)), 3000);
  };
  return { list, push };
}

/* UI Components */
function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-xl overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-border flex items-center gap-2 bg-surface-muted/30">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">{title}</h2>
      </div>
      <div className="p-6 space-y-6">{children}</div>
    </section>
  );
}
function Field({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 py-2">
      <div className="md:col-span-1">
        <label className="text-sm font-medium text-foreground block">{label}</label>
        {desc && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>}
      </div>
      <div className="md:col-span-2">{children}</div>
    </div>
  );
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="w-full h-10 bg-background border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground" />;
}

export default function SettingsPage() {
  const { list: toasts, push } = useToasts();
  const [email, setEmail] = useState("");
  const [webhook, setWebhook] = useState("");
  const [qhStart, setQhStart] = useState("22:00");
  const [qhEnd, setQhEnd] = useState("08:00");
  const [rows, setRows] = useState(25);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [pRes, cRes, prRes] = await Promise.all([fetch("/api/account/profile"), fetch("/api/account/channels"), fetch("/api/account/prefs")]);
        if (pRes.ok) { const d = await pRes.json(); setEmail(d.profile?.email || ""); }
        if (cRes.ok) { const d = await cRes.json(); setWebhook(d.channels?.discordWebhookUrl || ""); setQhStart(d.channels?.quietHoursStart||"22:00"); setQhEnd(d.channels?.quietHoursEnd||"08:00"); }
        if (prRes.ok) { const d = await prRes.json(); setRows(Number(d.prefs?.rowsPerPage)||25); setCompact(!!d.prefs?.compactMode); }
      } catch {}
    })();
  }, []);

  const saveChannels = async () => {
    const r = await fetch("/api/account/channels", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ discordWebhookUrl: webhook, quietHoursStart: qhStart, quietHoursEnd: qhEnd }) });
    push(r.ok?"Sauvegardé.":"Erreur.", r.ok?"ok":"err");
  };
  const savePrefs = async () => {
    const r = await fetch("/api/account/prefs", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rowsPerPage: rows, compactMode: compact }) });
    push(r.ok?"Préférences sauvegardées.":"Erreur.", r.ok?"ok":"err");
  };
  const exportData = async () => {
    const r = await fetch("/api/account/export"); if(!r.ok) return push("Erreur export.","err");
    const blob = await r.blob(); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href=url; a.download="data.json"; a.click(); push("Téléchargé.");
  };

  return (
    <main className="min-h-screen px-6 pt-32 pb-20">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-2">Configuration</h1>
          <p className="text-muted-foreground">Gérez vos paramètres système.</p>
        </header>

        <Section title="Sécurité" icon={Shield}>
          <Field label="Email" desc="Récupération uniquement."><Input value={email} onChange={e=>setEmail(e.target.value)} disabled className="opacity-50 cursor-not-allowed" /></Field>
          <Field label="Mot de passe"><button className="h-9 px-4 rounded-lg bg-surface-muted border border-border hover:bg-surface-muted/80 text-sm text-foreground">Changer</button></Field>
        </Section>

        <Section title="Canaux" icon={Bell}>
          <Field label="Discord Webhook"><Input value={webhook} onChange={e=>setWebhook(e.target.value)} placeholder="https://discord.com/api/webhooks/..." /></Field>
          <Field label="Mode Silence"><div className="flex gap-4"><Input type="time" value={qhStart} onChange={e=>setQhStart(e.target.value)} className="w-32"/><span className="self-center text-muted-foreground">à</span><Input type="time" value={qhEnd} onChange={e=>setQhEnd(e.target.value)} className="w-32"/></div></Field>
          <div className="flex justify-end pt-2"><button onClick={saveChannels} className="h-9 px-4 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 flex items-center gap-2"><Save size={14}/> Sauvegarder</button></div>
        </Section>

        <Section title="Interface" icon={Layout}>
          <Field label="Lignes par page"><select value={rows} onChange={e=>setRows(+e.target.value)} className="h-10 bg-background border border-border rounded-lg px-3 text-sm w-32 focus:outline-none text-foreground"><option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="100">100</option></select></Field>
          <div className="flex justify-end pt-2"><button onClick={savePrefs} className="h-9 px-4 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 flex items-center gap-2"><Save size={14}/> Sauvegarder</button></div>
        </Section>

        <Section title="Zone Danger" icon={Settings}>
          <div className="flex gap-4">
            <button onClick={exportData} className="h-9 px-4 border border-border rounded-lg text-sm hover:bg-surface-muted flex items-center gap-2 text-foreground"><Download size={14}/> Exporter données</button>
            <button className="h-9 px-4 border border-red-500/30 bg-red-500/10 text-red-500 rounded-lg text-sm hover:bg-red-500/20 flex items-center gap-2"><Trash2 size={14}/> Supprimer compte</button>
          </div>
        </Section>
      </div>

      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-3 rounded-lg border text-sm shadow-xl ${t.type==='ok'?'bg-card border-emerald-500/20 text-emerald-500':'bg-card border-red-500/20 text-red-500'}`}>{t.msg}</div>
        ))}
      </div>
    </main>
  );
}