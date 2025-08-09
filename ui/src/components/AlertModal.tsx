// ui/src/components/AlertModal.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Alerts from "@/lib/alerts";
import { BANKS_LIST } from "@/config/banks";
import { CATEGORY_LIST } from "@/config/categories";
import { CONTRACT_TYPE_LIST } from "@/config/contractTypes";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  defaultValues?: Partial<Alerts.Alert["query"]>;
};

export default function AlertModal({ open, onClose, defaultValues }: Props) {
  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState<string[]>(
    defaultValues?.keywords ?? []
  );
  const [kwInput, setKwInput] = useState("");
  const [banks, setBanks] = useState<string[]>(defaultValues?.banks ?? []);
  const [categories, setCategories] = useState<string[]>(
    defaultValues?.categories ?? []
  );
  const [contractTypes, setContractTypes] = useState<string[]>(
    defaultValues?.contractTypes ?? []
  );
  const [frequency, setFrequency] = useState<"instant" | "daily">("instant");

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const addKw = (raw: string) => {
    const parts = raw
      .split(/[,\n]/g)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    const next = Array.from(new Set([...keywords, ...parts]));
    setKeywords(next);
    setKwInput("");
  };

  const handleKwKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addKw(kwInput);
    }
    if (e.key === "Backspace" && !kwInput && keywords.length) {
      setKeywords(keywords.slice(0, -1));
    }
  };

  const save = () => {
    if (!name.trim()) return;
    Alerts.create({
      name: name.trim(),
      frequency,
      query: {
        keywords: keywords.length ? keywords : undefined,
        banks,
        categories,
        contractTypes,
      },
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[98]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed z-[99] left-1/2 top-1/2 w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2
                       rounded-2xl border border-border bg-surface p-5 shadow-[0_30px_120px_-40px_rgba(187,154,247,.35)]"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.18 }}
          >
            <h3 className="text-xl font-semibold mb-2 neon-title">
              Nouvelle alerte
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Ajoute des mots-clés, choisis des banques, métiers et contrats.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">Nom</label>
                <input
                  className="mt-1 w-full rounded-lg bg-card border border-border px-3 h-10"
                  placeholder="Ex: Markets Paris CDI"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Keywords tags */}
              <div>
                <label className="text-sm text-muted-foreground">
                  Mots-clés (appuie sur Entrée ou ,)
                </label>
                <div className="mt-1 rounded-lg bg-card border border-border px-2 py-2">
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((k) => (
                      <span
                        key={k}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-card/70 px-2 py-1 text-sm"
                      >
                        {k}
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
                      className="flex-1 min-w-[120px] bg-transparent outline-none h-7 px-1"
                      placeholder={keywords.length ? "" : "ex: structuring, C++"}
                      value={kwInput}
                      onChange={(e) => setKwInput(e.target.value)}
                      onKeyDown={handleKwKey}
                      onBlur={() => addKw(kwInput)}
                    />
                  </div>
                </div>
              </div>

              {/* Banks */}
              <div>
                <label className="text-sm text-muted-foreground">Banques</label>
                <div className="mt-2 grid grid-cols-2 gap-2 max-h-36 overflow-auto rounded-lg border border-border p-2">
                  {BANKS_LIST.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBanks((prev) => toggle(prev, b.id))}
                      className={`text-sm px-2 py-1 rounded border ${
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

              {/* Categories */}
              <div>
                <label className="text-sm text-muted-foreground">Métiers</label>
                <div className="mt-2 grid grid-cols-2 gap-2 max-h-36 overflow-auto rounded-lg border border-border p-2">
                  {CATEGORY_LIST.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        setCategories((prev) => toggle(prev, c.name))
                      }
                      className={`text-sm px-2 py-1 rounded border ${
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

              {/* Contract types */}
              <div>
                <label className="text-sm text-muted-foreground">
                  Type de contrat
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2 max-h-36 overflow-auto rounded-lg border border-border p-2">
                  {CONTRACT_TYPE_LIST.map((ct) => (
                    <button
                      key={ct.id}
                      type="button"
                      onClick={() =>
                        setContractTypes((prev) => toggle(prev, ct.id))
                      }
                      className={`text-sm px-2 py-1 rounded border ${
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

              {/* Frequency */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
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
                  type="button"
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

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="h-10 px-4 rounded-lg border border-border"
              >
                Annuler
              </button>
              <button onClick={save} className="h-10 px-4 rounded-lg btn">
                Créer l’alerte
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
