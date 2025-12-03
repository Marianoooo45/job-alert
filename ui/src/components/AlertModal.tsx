"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import * as Alerts from "@/lib/alerts";
import { BANKS_LIST } from "@/config/banks";
import { CATEGORY_LIST } from "@/config/categories";
import { CONTRACT_TYPE_LIST } from "@/config/contractTypes";
import { X, Bell, Hash } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  defaultValues?: Partial<Alerts.Alert["query"]>;
  editAlert?: Alerts.Alert;
};

function ModalContent({ open, onClose, defaultValues, editAlert }: Props) {
  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [kwInput, setKwInput] = useState("");
  const [banks, setBanks] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [contractTypes, setContractTypes] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<"instant" | "daily">("instant");

  useEffect(() => {
    if (!open) return;
    setName(editAlert?.name ?? "");
    setKeywords(Alerts.normalizeKeywords(defaultValues?.keywords ?? editAlert?.query.keywords) ?? []);
    setBanks(defaultValues?.banks ?? editAlert?.query.banks ?? []);
    setCategories(defaultValues?.categories ?? editAlert?.query.categories ?? []);
    setContractTypes(defaultValues?.contractTypes ?? editAlert?.query.contractTypes ?? []);
    setFrequency(editAlert?.frequency ?? "instant");
  }, [open, defaultValues, editAlert]);

  useEffect(() => {
    if(!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const toggle = (arr: string[], v: string) => arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const addKw = (raw: string) => {
    const parts = raw.split(/[,\n]/g).map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    setKeywords((prev) => Array.from(new Set([...prev, ...Alerts.normalizeKeywords(parts) ?? []])));
    setKwInput("");
  };

  const save = () => {
    const safeName = name.trim() || (keywords.length ? `#${keywords[0]}...` : "Alerte sans nom");
    const payload = {
      name: safeName, frequency,
      query: { keywords: keywords, banks: banks.length ? banks : undefined, categories: categories.length ? categories : undefined, contractTypes: contractTypes.length ? contractTypes : undefined }
    };
    if (editAlert) Alerts.upsert({ ...editAlert, ...payload });
    else Alerts.create(payload as any);
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <motion.div className="fixed inset-0 z-[998] bg-black/70 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />
      
      <div className="fixed inset-0 z-[999] p-4 flex items-center justify-center pointer-events-none">
        <motion.div
          className="w-full max-w-2xl bg-surface border border-border rounded-xl shadow-2xl flex flex-col max-h-[90vh] pointer-events-auto"
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.15 }}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-muted/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <Bell className="w-4 h-4 text-indigo-400" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">{editAlert ? "Modifier Alerte" : "Nouvelle Surveillance"}</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-foreground/5 rounded text-muted-foreground hover:text-foreground transition-colors"><X className="w-4 h-4" /></button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scroll">
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Nom de l'alerte</label>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex: M&A Paris" className="w-full h-10 bg-surface-muted border border-border rounded-lg px-3 text-foreground placeholder:text-muted-foreground focus:border-indigo-500/50 outline-none" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Mots-clés</label>
              <div className="flex flex-wrap gap-2 p-2 bg-surface-muted border border-border rounded-lg min-h-[42px]">
                {keywords.map(k => (
                  <span key={k} className="inline-flex items-center gap-1 px-2 py-1 bg-background/50 border border-border/50 rounded text-sm text-foreground shadow-sm">
                    <Hash className="w-3 h-3 opacity-50" /> {k}
                    <button onClick={()=>setKeywords(kk=>kk.filter(x=>x!==k))} className="hover:text-red-400 ml-1"><X className="w-3 h-3" /></button>
                  </span>
                ))}
                <input 
                  value={kwInput} 
                  onChange={e=>setKwInput(e.target.value)} 
                  onKeyDown={e => { if(e.key==="Enter"||e.key===","){ e.preventDefault(); addKw(kwInput); } if(e.key==="Backspace" && !kwInput) setKeywords(k => k.slice(0,-1)); }}
                  placeholder={keywords.length ? "" : "Ajouter un mot-clé..."}
                  className="bg-transparent outline-none flex-1 min-w-[120px] text-sm text-foreground placeholder:text-muted-foreground" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Filtres Rapides</label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Type de contrat</div>
                  <div className="flex flex-wrap gap-2">
                    {CONTRACT_TYPE_LIST.map(ct => (
                      <button key={ct.id} onClick={()=>setContractTypes(prev=>toggle(prev, ct.id))} className={`px-3 py-1.5 rounded text-xs font-medium border transition-all ${contractTypes.includes(ct.id) ? "bg-foreground text-background border-foreground" : "bg-surface-muted text-muted-foreground border-border hover:border-foreground/30"}`}>
                        {ct.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Secteurs</div>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_LIST.slice(0, 6).map(c => (
                      <button key={c.id} onClick={()=>setCategories(prev=>toggle(prev, c.name))} className={`px-3 py-1.5 rounded text-xs font-medium border transition-all ${categories.includes(c.name) ? "bg-foreground text-background border-foreground" : "bg-surface-muted text-muted-foreground border-border hover:border-foreground/30"}`}>
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Fréquence</label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={()=>setFrequency("instant")} className={`h-10 rounded-lg border text-sm font-medium transition-all ${frequency==="instant" ? "bg-indigo-600 border-indigo-500 text-white" : "bg-surface-muted border-border text-muted-foreground hover:border-foreground/30"}`}>Temps Réel</button>
                <button onClick={()=>setFrequency("daily")} className={`h-10 rounded-lg border text-sm font-medium transition-all ${frequency==="daily" ? "bg-indigo-600 border-indigo-500 text-white" : "bg-surface-muted border-border text-muted-foreground hover:border-foreground/30"}`}>Digest Quotidien</button>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border flex justify-end gap-3 bg-surface-muted/50">
            <button onClick={onClose} className="px-4 h-10 rounded-lg border border-border text-muted-foreground text-sm font-medium hover:bg-foreground/5 transition-colors">Annuler</button>
            <button onClick={save} className="px-6 h-10 rounded-lg bg-foreground text-background text-sm font-bold hover:opacity-90 transition-colors">Confirmer</button>
          </div>
        </motion.div>
      </div>
    </>
  );
}

export default function AlertModal(props: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(<ModalContent {...props} />, document.body);
}