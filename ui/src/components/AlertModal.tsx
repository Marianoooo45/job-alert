"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { addAlert } from "@/lib/alerts";

export default function AlertModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [bank, setBank] = useState("");
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");
  const [frequency, setFrequency] = useState<"instant" | "daily">("instant");

  const handleSave = () => {
    addAlert({ bank, keyword, category, frequency });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Fond noir flouté */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Boîte de dialogue */}
          <motion.div
            className="fixed z-50 top-1/2 left-1/2 w-full max-w-md p-6 rounded-xl bg-neutral-900 shadow-lg border border-primary/30"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            style={{ transform: "translate(-50%, -50%)" }}
          >
            <h2 className="text-xl font-semibold mb-4 text-primary">Nouvelle alerte</h2>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Banque (facultatif)"
                className="w-full p-2 rounded bg-neutral-800"
                value={bank}
                onChange={(e) => setBank(e.target.value)}
              />
              <input
                type="text"
                placeholder="Mot-clé (facultatif)"
                className="w-full p-2 rounded bg-neutral-800"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
              <input
                type="text"
                placeholder="Catégorie (facultatif)"
                className="w-full p-2 rounded bg-neutral-800"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />

              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as "instant" | "daily")}
                className="w-full p-2 rounded bg-neutral-800"
              >
                <option value="instant">Notification instantanée</option>
                <option value="daily">Résumé quotidien</option>
              </select>
            </div>

            <div className="flex justify-end mt-6 gap-3">
              <button onClick={onClose} className="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600">
                Annuler
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded bg-primary hover:bg-primary/80 text-black font-semibold"
              >
                Créer
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
