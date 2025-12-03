"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X, Send } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  presetSubject?: string;
};

export default function ContactModal({ open, onClose, presetSubject }: Props) {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if(open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    await new Promise(r => setTimeout(r, 1000)); 
    setSending(false);
    setSent(true);
    setTimeout(() => {
      setSent(false); onClose(); setEmail(""); setMsg("");
    }, 2000);
  };

  if (!mounted || !open) return null;

  return createPortal(
    <>
      <motion.div className="fixed inset-0 z-[998] bg-black/70 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />
      <div className="fixed inset-0 z-[999] p-4 flex items-center justify-center pointer-events-none">
        <motion.div
          className="w-full max-w-md bg-surface border border-border rounded-xl shadow-2xl flex flex-col pointer-events-auto"
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.15 }}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-muted/50">
            <h2 className="text-lg font-bold text-foreground">Nous Contacter</h2>
            <button onClick={onClose} className="p-2 hover:bg-foreground/5 rounded text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6">
            {sent ? (
              <div className="h-48 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <Send className="w-6 h-6" />
                </div>
                <p className="text-foreground font-medium">Message envoyé !</p>
                <p className="text-sm text-muted-foreground">Nous reviendrons vers vous sous 24h.</p>
              </div>
            ) : (
              <form onSubmit={send} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Votre Email</label>
                  <input 
                    required type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full h-10 bg-surface-muted border border-border rounded-lg px-3 text-foreground placeholder:text-muted-foreground focus:border-indigo-500/50 outline-none"
                    placeholder="nom@ecole.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Message</label>
                  <textarea 
                    required rows={4} value={msg} onChange={e => setMsg(e.target.value)}
                    className="w-full bg-surface-muted border border-border rounded-lg p-3 text-foreground placeholder:text-muted-foreground focus:border-indigo-500/50 outline-none resize-none"
                    placeholder={presetSubject ? `Sujet : ${presetSubject}...` : "Comment pouvons-nous vous aider ?"}
                  />
                </div>
                <div className="pt-2">
                  <button type="submit" disabled={sending}
                    className="w-full h-11 bg-foreground text-background font-bold rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {sending ? "Envoi..." : "Envoyer le message"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </>,
    document.body
  );
}