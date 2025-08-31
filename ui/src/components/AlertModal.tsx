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
import { useRouter } from "next/navigation";

type Props = {
  open: boolean;
  onClose: () => void;
  defaultValues?: Partial<Alerts.Alert["query"]>;
  editAlert?: Alerts.Alert;
};

function ModalContent({ open, onClose, defaultValues, editAlert }: Props) {
  const router = useRouter();
  const [isLogged, setIsLogged] = useState<boolean | null>(null);

  // Vérifie l’authentification
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/me", { credentials: "include", cache: "no-store" });
        const j = r.ok ? await r.json().catch(() => null) : null;
        if (alive) setIsLogged(Boolean(j?.user || j?.authenticated));
      } catch {
        if (alive) setIsLogged(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Redirection si pas connecté
  useEffect(() => {
    if (isLogged === false) {
      router.push(`/login?next=/inbox`);
      onClose();
    }
  }, [isLogged, router, onClose]);

  // --- États du formulaire ---
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
    setCategories(defaultValues?.categories ?? editAlert?.query.categories ?? []);
    setContractTypes(defaultValues?.contractTypes ?? editAlert?.query.contractTypes ?? []);
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

  if (!open || isLogged === false) return null;

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
          {/* ... le reste de ton formulaire inchangé ... */}

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
