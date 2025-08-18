"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2 } from "lucide-react";

type ContactPayload = {
  name: string;
  email: string;
  company?: string;
  subject: string;
  message: string;
  // anti-bot simple (input caché côté UI)
  website?: string;
  // utile pour savoir d'où vient la demande
  path?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  presetSubject?: string;
};

function ModalContent({ open, onClose, presetSubject }: Props) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(presetSubject || "Partenariat école");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<null | "ok" | "ko">(null);
  const [error, setError] = useState<string | null>(null);

  // hydrate / reset quand on ouvre
  useEffect(() => {
    if (!open) return;
    setName("");
    setCompany("");
    setEmail("");
    setSubject(presetSubject || "Partenariat école");
    setMessage("");
    setWebsite("");
    setLoading(false);
    setSent(null);
    setError(null);
  }, [open, presetSubject]);

  // lock scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [open]);

  // ESC pour fermer
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSend = emailOk && message.trim().length >= 10 && !loading;

  async function submit() {
    if (!canSend) return;
    setLoading(true);
    setError(null);

    const payload: ContactPayload = {
      name: name.trim() || "—",
      email: email.trim(),
      company: company.trim() || undefined,
      subject: subject.trim(),
      message: message.trim(),
      website, // si rempli → bot
      path: typeof window !== "undefined" ? window.location.pathname : undefined,
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());
      setSent("ok");
    } catch (e: any) {
      setSent("ko");
      setError(e?.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[998] bg-black/55 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Container */}
          <motion.div
            className="fixed inset-0 z-[999] p-4 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Shell */}
            <motion.div
              className="w-full max-w-xl rounded-2xl border border-border bg-surface
                         shadow-[0_30px_120px_-40px_rgba(187,154,247,.35)]
                         max-h-[88vh] flex flex-col overflow-hidden"
              initial={{ scale: 0.94 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.94 }}
              transition={{ duration: 0.18 }}
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Contact</div>
                  <div className="text-lg font-semibold neon-title">
                    Envoyer un message
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="h-9 w-9 grid place-items-center hover:bg-muted/30 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Contenu */}
              <div className="px-5 py-4 overflow-auto">
                {sent === "ok" ? (
                  <div className="flex flex-col items-center text-center py-6 gap-3">
                    <CheckCircle2 className="w-10 h-10 text-success" />
                    <div className="text-lg font-semibold">Message envoyé ✅</div>
                    <p className="text-sm text-muted-foreground">
                      Merci&nbsp;! Je reviens vers toi rapidement.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {/* honeypot (masqué via CSS inline) */}
                    <input
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="hidden"
                      tabIndex={-1}
                      aria-hidden
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm text-muted-foreground">Nom</label>
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Prénom Nom"
                          className="mt-1 w-full rounded-lg bg-card border border-border px-3 h-10"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Société / École</label>
                        <input
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          placeholder="EDHEC, Alumneye, …"
                          className="mt-1 w-full rounded-lg bg-card border border-border px-3 h-10"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm text-muted-foreground">Email</label>
                      <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="prenom.nom@email.com"
                        className={`mt-1 w-full rounded-lg bg-card border px-3 h-10 ${
                          email && !emailOk ? "border-danger/70" : "border-border"
                        }`}
                      />
                    </div>

                    <div>
                      <label className="text-sm text-muted-foreground">Sujet</label>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        {[
                          "Partenariat école",
                          "Programme d’accompagnement",
                          "Démonstration",
                          "Autre",
                        ].map((s) => (
                          <button
                            key={s}
                            onClick={() => setSubject(s)}
                            className={`px-3 h-10 rounded-lg border text-sm ${
                              subject === s
                                ? "border-primary/70 bg-primary/15"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm text-muted-foreground">Message</label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Explique-moi rapidement votre contexte / besoin…"
                        rows={6}
                        className={`mt-1 w-full rounded-lg bg-card border px-3 py-2 ${
                          message && message.trim().length < 10
                            ? "border-danger/70"
                            : "border-border"
                        }`}
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        {Math.max(0, 10 - (message.trim().length || 0))} caractère(s) min.
                      </div>
                    </div>

                    {!!error && (
                      <div className="text-sm text-danger">
                        Erreur d’envoi : {error}. Tu peux aussi écrire à{" "}
                        <a className="underline" href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact@example.com"}`}>
                          {process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact@example.com"}
                        </a>
                        .
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-border/60 flex justify-end gap-2">
                {sent === "ok" ? (
                  <button onClick={onClose} className="h-10 px-4 rounded-lg btn">
                    Fermer
                  </button>
                ) : (
                  <>
                    <button
                      onClick={onClose}
                      className="h-10 px-4 rounded-lg border border-border"
                      disabled={loading}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={submit}
                      disabled={!canSend}
                      className="h-10 px-4 rounded-lg btn disabled:opacity-50"
                    >
                      {loading ? "Envoi…" : "Envoyer"}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function ContactModal(props: Props) {
  if (typeof document === "undefined") return null;
  return createPortal(<ModalContent {...props} />, document.body);
}
