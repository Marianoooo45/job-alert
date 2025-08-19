// ui/src/components/AlertModal.tsx
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import * as Alerts from "@/lib/alerts";
import { BANKS_LIST } from "@/config/banks";
import { CATEGORY_LIST } from "@/config/categories";
import { CONTRACT_TYPE_LIST } from "@/config/contractTypes";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  defaultValues?: Partial<Alerts.Alert["query"]>;
  editAlert?: Alerts.Alert;
};

function ModalContent({ open, onClose, defaultValues, editAlert }: Props) {
  // state
  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [kwInput, setKwInput] = useState("");
  const [banks, setBanks] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [contractTypes, setContractTypes] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<"instant" | "daily">("instant");

  // hydrate
  useEffect(() => {
    if (!open) return;
    setName(editAlert?.name ?? "");
    setKeywords(
      Alerts.normalizeKeywords(
        defaultValues?.keywords ?? editAlert?.query.keywords
      ) ?? []
    );
    setKwInput("");
    setBanks(defaultValues?.banks ?? editAlert?.query.banks ?? []);
    setCategories(
      defaultValues?.categories ?? editAlert?.query.categories ?? []
    );
    setContractTypes(
      defaultValues?.contractTypes ?? editAlert?.query.contractTypes ?? []
    );
    setFrequency(editAlert?.frequency ?? "instant");
  }, [open, defaultValues, editAlert]);

  // lock scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [open]);

  // close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  // keywords
  const addKw = (raw: string) => {
    const parts = raw
      .split(/[,\n]/g)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    const normalized = Alerts.normalizeKeywords(parts) ?? [];
    setKeywords((prev) => Array.from(new Set([...prev, ...normalized])));
    setKwInput("");
  };
  const onKwKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addKw(kwInput);
    }
    if (e.key === "Backspace" && !kwInput && keywords.length) {
      setKeywords((arr) => arr.slice(0, -1));
    }
  };

  const save = () => {
    const safeName =
      name.trim() || (keywords.length ? `#${keywords[0]} …` : "Alerte personnalisée");
    const normalizedKeywords = Alerts.normalizeKeywords(keywords);
    const payload = {
      name: safeName,
      frequency,
      query: {
        keywords: normalizedKeywords,
        banks: banks.length ? banks : undefined,
        categories: categories.length ? categories : undefined,
        contractTypes: contractTypes.length ? contractTypes : undefined,
      },
    };
    if (editAlert) {
      Alerts.upsert({ ...editAlert, ...payload });
    } else {
      Alerts.create(payload as any);
    }
    onClose();
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-[998] bg-black/55 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      />
      {/* Container */}
      <motion.div
        className="fixed inset-0 z-[999] p-4 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Shell */}
        <motion.div
          className="alert-modal-shell w-full max-w-2xl rounded-2xl border border-border bg-surface
                     shadow-[0_30px_120px_-40px_rgba(187,154,247,.35)]
                     max-h-[88vh] flex flex-col overflow-hidden"
          initial={{ scale: 0.94 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.18 }}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Notifications</div>
              <div className="text-lg font-semibold neon-title">
                {editAlert ? "Modifier l’alerte" : "Nouvelle alerte"}
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-9 w-9 grid place-items-center hover:bg-muted/30 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="px-5 py-4 overflow-auto space-y-5">
            {/* Nom */}
            <div>
              <label className="text-sm text-muted-foreground">Nom de l’alerte</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Markets Paris CDI"
                className="mt-1 w-full rounded-lg bg-card border border-border px-3 h-10"
              />
            </div>

            {/* Keywords */}
            <div>
              <label className="text-sm text-muted-foreground">
                Mots-clés (Entrée ou ,)
              </label>
              <div className="mt-1 rounded-lg bg-card border border-border px-2 py-2">
                <div className="flex flex-wrap gap-2">
                  {keywords.map((k) => (
                    <span
                      key={k}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-card/70 px-2 py-1 text-sm"
                    >
                      #{k}
                      <button
                        onClick={() =>
                          setKeywords((arr) => arr.filter((x) => x !== k))
                        }
                        className="hover:text-danger"
                        aria-label={`Supprimer ${k}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    value={kwInput}
                    onChange={(e) => setKwInput(e.target.value)}
                    onKeyDown={onKwKey}
                    onBlur={() => addKw(kwInput)}
                    placeholder={keywords.length ? "" : "ex: structuring, python, credit"}
                    className="flex-1 min-w-[160px] bg-transparent outline-none h-7 px-1"
                  />
                </div>
              </div>
            </div>

            {/* Métiers */}
            <div>
              <div className="text-sm text-muted-foreground mb-2">Métiers</div>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORY_LIST.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategories((prev) => toggle(prev, c.name))}
                    className={`px-3 h-10 rounded-lg border text-sm ${
                      categories.includes(c.name)
                        ? "border-primary/70 bg-primary/15"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Contrats */}
            <div>
              <div className="text-sm text-muted-foreground mb-2">Type de contrat</div>
              <div className="grid grid-cols-2 gap-2">
                {CONTRACT_TYPE_LIST.map((ct) => (
                  <button
                    key={ct.id}
                    onClick={() => setContractTypes((prev) => toggle(prev, ct.id))}
                    className={`px-3 h-10 rounded-lg border text-sm ${
                      contractTypes.includes(ct.id)
                        ? "border-primary/70 bg-primary/15"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {ct.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Banques */}
            <div>
              <div className="text-sm text-muted-foreground mb-2">Banques</div>
              <div className="grid grid-cols-2 gap-2">
                {BANKS_LIST.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setBanks((prev) => toggle(prev, b.id))}
                    className={`px-3 h-10 rounded-lg border text-sm ${
                      banks.includes(b.id)
                        ? "border-primary/70 bg-primary/15"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Fréquence */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setFrequency("instant")}
                className={`h-10 rounded-lg border text-sm ${
                  frequency === "instant"
                    ? "border-primary/70 bg-primary/15"
                    : "border-border hover:border-primary/50"
                }`}
              >
                Notif instantanée
              </button>
              <button
                onClick={() => setFrequency("daily")}
                className={`h-10 rounded-lg border text-sm ${
                  frequency === "daily"
                    ? "border-primary/70 bg-primary/15"
                    : "border-border hover:border-primary/50"
                }`}
              >
                Résumé quotidien
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-border/60 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="h-10 px-4 rounded-lg border border-border"
            >
              Annuler
            </button>
            <button onClick={save} className="h-10 px-4 rounded-lg btn">
              {editAlert ? "Enregistrer" : "Créer l’alerte"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}

export default function AlertModal(props: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(<ModalContent {...props} />, document.body);
}
