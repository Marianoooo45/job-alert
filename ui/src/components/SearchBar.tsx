// ui/src/components/SearchBar.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

type Props = {
  keyword: string;
  onKeywordChange: (value: string) => void;
  banks: string[];
  onBanksChange: (banks: string[]) => void;
  categories: string[];
  onCategoriesChange: (categories: string[]) => void;
  contractTypes: string[];
  onContractTypesChange: (types: string[]) => void;
  allBanks: string[];
  allCategories: string[];
  allContractTypes: string[];
};

export default function SearchBar({
  keyword,
  onKeywordChange,
  banks,
  onBanksChange,
  categories,
  onCategoriesChange,
  contractTypes,
  onContractTypesChange,
  allBanks,
  allCategories,
  allContractTypes,
}: Props) {
  const [showFilters, setShowFilters] = useState(false);

  const toggleBank = (bank: string) => {
    if (banks.includes(bank)) {
      onBanksChange(banks.filter((b) => b !== bank));
    } else {
      onBanksChange([...banks, bank]);
    }
  };

  const toggleCategory = (cat: string) => {
    if (categories.includes(cat)) {
      onCategoriesChange(categories.filter((c) => c !== cat));
    } else {
      onCategoriesChange([...categories, cat]);
    }
  };

  const toggleContractType = (type: string) => {
    if (contractTypes.includes(type)) {
      onContractTypesChange(contractTypes.filter((t) => t !== type));
    } else {
      onContractTypesChange([...contractTypes, type]);
    }
  };

  const clearKeyword = () => onKeywordChange("");

  return (
    <div className="glass-card rounded-2xl border border-border p-4 mb-6">
      {/* Barre principale */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            placeholder="Rechercher un poste, une banque..."
            className="w-full rounded-lg bg-card border border-border px-3 py-2 pr-8"
          />
          {keyword && (
            <button
              onClick={clearKeyword}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="h-10 px-3 rounded-lg border border-border hover:border-primary transition"
        >
          {showFilters ? "Masquer les filtres" : "Filtres"}
        </button>
      </div>

      {/* Filtres déroulants */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mt-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Banques */}
              <div>
                <div className="text-sm font-medium mb-2">Banques</div>
                <div className="flex flex-wrap gap-2">
                  {allBanks.map((bank) => (
                    <button
                      key={bank}
                      onClick={() => toggleBank(bank)}
                      className={`px-2 py-1 rounded border text-sm ${
                        banks.includes(bank)
                          ? "border-primary/70 bg-primary/15"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {bank}
                    </button>
                  ))}
                </div>
              </div>

              {/* Catégories */}
              <div>
                <div className="text-sm font-medium mb-2">Métiers</div>
                <div className="flex flex-wrap gap-2">
                  {allCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`px-2 py-1 rounded border text-sm ${
                        categories.includes(cat)
                          ? "border-primary/70 bg-primary/15"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Types de contrat */}
              <div>
                <div className="text-sm font-medium mb-2">Contrats</div>
                <div className="flex flex-wrap gap-2">
                  {allContractTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => toggleContractType(type)}
                      className={`px-2 py-1 rounded border text-sm ${
                        contractTypes.includes(type)
                          ? "border-primary/70 bg-primary/15"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
