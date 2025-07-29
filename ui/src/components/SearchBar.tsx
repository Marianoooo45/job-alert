// Fichier: src/components/SearchBar.tsx

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";

import { BANKS_LIST } from "@/config/banks";
import { CATEGORY_LIST } from "@/config/categories";
import { CONTRACT_TYPE_LIST } from "@/config/contractTypes";

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [keyword, setKeyword] = useState(searchParams.get("keyword") || "");
  const [selectedBanks, setSelectedBanks] = useState<string[]>(searchParams.getAll("bank"));
  const [selectedCategories, setSelectedCategories] = useState<string[]>(searchParams.getAll("category"));
  const [selectedContractTypes, setSelectedContractTypes] = useState<string[]>(searchParams.getAll("contractType"));

  const toggleSelection = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setter((prev) => prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]);
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword) params.set("keyword", keyword);
    selectedBanks.forEach((b) => params.append("bank", b));
    selectedCategories.forEach((c) => params.append("category", c));
    selectedContractTypes.forEach((ct) => params.append("contractType", ct));
    params.set("page", "1");
    router.push(`/?${params.toString()}`);
  };

  const resetFilters = () => {
    setKeyword("");
    setSelectedBanks([]);
    setSelectedCategories([]);
    setSelectedContractTypes([]);
    router.push("/?page=1");
  };

  return (
    <form onSubmit={handleSearch} className="w-full max-w-5xl flex flex-col sm:flex-row flex-wrap gap-2 items-center p-2 bg-card rounded-lg border">
      <Input
        type="text"
        placeholder="Mot-clé (ex: Data Scientist...)"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        className="flex-1 text-base min-w-[200px]"
      />

      {/* Filtre Banques */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full sm:w-[180px] justify-between text-base">
            {/* ✨ CORRECTION ICI ✨ */}
            <span className={`flex-1 text-left truncate ${selectedBanks.length === 0 ? "text-muted-foreground" : ""}`}>{selectedBanks.length > 0 ? `${selectedBanks.length} banque(s)` : "Toutes les banques"}</span>
            <span className="ml-1">▾</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[180px] p-0"><ScrollArea className="h-56 px-2"><div className="py-2">{BANKS_LIST.map((bank) => (<Label key={bank.id} className="flex items-center space-x-2 py-1 px-2 rounded hover:bg-muted cursor-pointer"><Checkbox checked={selectedBanks.includes(bank.id)} onCheckedChange={() => toggleSelection(setSelectedBanks, bank.id)} /><span className="text-sm font-medium">{bank.name}</span></Label>))}</div></ScrollArea></PopoverContent>
      </Popover>

      {/* Filtre Métiers */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full sm:w-[220px] justify-between text-base">
            {/* ✨ CORRECTION ICI ✨ */}
            <span className={`flex-1 text-left truncate ${selectedCategories.length === 0 ? "text-muted-foreground" : ""}`}>{selectedCategories.length > 0 ? `${selectedCategories.length} métier(s)` : "Tous les métiers"}</span>
            <span className="ml-1">▾</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0"><ScrollArea className="h-56 px-2"><div className="py-2">{CATEGORY_LIST.map((cat) => (<Label key={cat.id} className="flex items-center space-x-2 py-1 px-2 rounded hover:bg-muted cursor-pointer"><Checkbox checked={selectedCategories.includes(cat.name)} onCheckedChange={() => toggleSelection(setSelectedCategories, cat.name)} /><span className="text-sm font-medium">{cat.name}</span></Label>))}</div></ScrollArea></PopoverContent>
      </Popover>
      
      {/* Filtre Type de Contrat */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full sm:w-[180px] justify-between text-base">
            {/* ✨ CORRECTION ICI ✨ */}
            <span className={`flex-1 text-left truncate ${selectedContractTypes.length === 0 ? "text-muted-foreground" : ""}`}>{selectedContractTypes.length > 0 ? `${selectedContractTypes.length} contrat(s)` : "Type de contrat"}</span>
            <span className="ml-1">▾</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[180px] p-0"><ScrollArea className="h-56 px-2"><div className="py-2">{CONTRACT_TYPE_LIST.map((contract) => (<Label key={contract.id} className="flex items-center space-x-2 py-1 px-2 rounded hover:bg-muted cursor-pointer"><Checkbox checked={selectedContractTypes.includes(contract.id)} onCheckedChange={() => toggleSelection(setSelectedContractTypes, contract.id)} /><span className="text-sm font-medium">{contract.name}</span></Label>))}</div></ScrollArea></PopoverContent>
      </Popover>

      <Button type="submit" className="w-full sm:w-auto">Rechercher</Button>
      <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-green-500" onClick={resetFilters} title="Réinitialiser les filtres">
        <X className="w-5 h-5 text-green-500" />
      </Button>
    </form>
  );
}