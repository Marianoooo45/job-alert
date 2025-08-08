// ui/src/components/SearchBar.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Search } from "lucide-react";

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
    setter((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const bankName = (id: string) => BANKS_LIST.find((b) => b.id === id)?.name ?? id;
  const contractName = (id: string) => CONTRACT_TYPE_LIST.find((c) => c.id === id)?.name ?? id;

  const apply = (next?: {
    keyword?: string;
    banks?: string[];
    categories?: string[];
    contractTypes?: string[];
  }) => {
    const kw = next?.keyword !== undefined ? next.keyword : keyword;
    const banks = next?.banks ?? selectedBanks;
    const cats = next?.categories ?? selectedCategories;
    const cts = next?.contractTypes ?? selectedContractTypes;

    const params = new URLSearchParams();
    if (kw) params.set("keyword", kw);
    banks.forEach((b) => params.append("bank", b));
    cats.forEach((c) => params.append("category", c));
    cts.forEach((ct) => params.append("contractType", ct));
    params.set("page", "1");

    router.push(`/?${params.toString()}`);

    if (next?.keyword !== undefined) setKeyword(next.keyword);
    if (next?.banks) setSelectedBanks(next.banks);
    if (next?.categories) setSelectedCategories(next.categories);
    if (next?.contractTypes) setSelectedContractTypes(next.contractTypes);
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    apply({});
  };

  const resetFilters = () => {
    setKeyword("");
    setSelectedBanks([]);
    setSelectedCategories([]);
    setSelectedContractTypes([]);
    router.push("/?page=1");
  };

  const hasFilters =
    (keyword && keyword.trim().length > 0) ||
    selectedBanks.length > 0 ||
    selectedCategories.length > 0 ||
    selectedContractTypes.length > 0;

  return (
    <form onSubmit={handleSearch} className="w-full space-y-3">
      {/* Ligne principale */}
      <div className="flex flex-col lg:flex-row items-stretch gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher un intitulé, une compétence…"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="pl-9 text-base h-11 bg-card border border-border focus-visible:ring-0 focus-visible:border-primary"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-11 rounded-full px-4 pill-btn">
                <span className="truncate">{selectedBanks.length > 0 ? `${selectedBanks.length} banque(s)` : "Toutes les banques"}</span>
                <span className="ml-2">▾</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0">
              <ScrollArea className="h-56 px-2 py-2">
                {BANKS_LIST.map((bank) => (
                  <Label key={bank.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted cursor-pointer">
                    <Checkbox checked={selectedBanks.includes(bank.id)} onCheckedChange={() => toggleSelection(setSelectedBanks, bank.id)} />
                    <span className="text-sm">{bank.name}</span>
                  </Label>
                ))}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-11 rounded-full px-4 pill-btn">
                <span className="truncate">{selectedCategories.length > 0 ? `${selectedCategories.length} métier(s)` : "Tous les métiers"}</span>
                <span className="ml-2">▾</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[260px] p-0">
              <ScrollArea className="h-56 px-2 py-2">
                {CATEGORY_LIST.map((cat) => (
                  <Label key={cat.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted cursor-pointer">
                    <Checkbox checked={selectedCategories.includes(cat.name)} onCheckedChange={() => toggleSelection(setSelectedCategories, cat.name)} />
                    <span className="text-sm">{cat.name}</span>
                  </Label>
                ))}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-11 rounded-full px-4 pill-btn">
                <span className="truncate">{selectedContractTypes.length > 0 ? `${selectedContractTypes.length} contrat(s)` : "Type de contrat"}</span>
                <span className="ml-2">▾</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-0">
              <ScrollArea className="h-56 px-2 py-2">
                {CONTRACT_TYPE_LIST.map((contract) => (
                  <Label key={contract.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted cursor-pointer">
                    <Checkbox checked={selectedContractTypes.includes(contract.id)} onCheckedChange={() => toggleSelection(setSelectedContractTypes, contract.id)} />
                    <span className="text-sm">{contract.name}</span>
                  </Label>
                ))}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          <Button type="submit" className="h-11 rounded-xl px-5 btn">Rechercher</Button>
          <Button type="button" variant="ghost" size="icon" className="h-11 w-11 rounded-xl text-muted-foreground hover:text-accent" onClick={resetFilters} title="Réinitialiser">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Chips */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {keyword && keyword.trim().length > 0 && <Chip label={`Mot-clé: ${keyword}`} onRemove={() => apply({ keyword: "" })} />}
          {selectedBanks.map((id) => <Chip key={`bank-${id}`} label={`Banque: ${bankName(id)}`} onRemove={() => apply({ banks: selectedBanks.filter((b) => b !== id) })} />)}
          {selectedCategories.map((name) => <Chip key={`cat-${name}`} label={`Métier: ${name}`} onRemove={() => apply({ categories: selectedCategories.filter((c) => c !== name) })} />)}
          {selectedContractTypes.map((id) => <Chip key={`ct-${id}`} label={`Contrat: ${contractName(id)}`} onRemove={() => apply({ contractTypes: selectedContractTypes.filter((ct) => ct !== id) })} />)}
        </div>
      )}
    </form>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 h-8 rounded-full border border-border bg-card/70 px-3 text-sm text-muted-foreground hover:border-primary/60 transition">
      <span className="truncate max-w-[240px]">{label}</span>
      <button type="button" onClick={onRemove} className="ml-0.5 grid place-items-center rounded-full p-0.5 hover:bg-primary/15 text-muted-foreground hover:text-primary" aria-label={`Supprimer ${label}`} title="Supprimer">
        <X className="w-3.5 h-3.5" />
      </button>
    </span>
  );
}
