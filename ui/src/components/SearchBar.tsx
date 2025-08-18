"use client";

import { useEffect, useRef, useState } from "react";
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

type Suggest =
  | { type: "title"; label: string }
  | { type: "bank"; label: string; id: string }
  | { type: "category"; label: string };

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [keyword, setKeyword] = useState(searchParams.get("keyword") || "");
  const [selectedBanks, setSelectedBanks] = useState<string[]>(searchParams.getAll("bank"));
  const [selectedCategories, setSelectedCategories] = useState<string[]>(searchParams.getAll("category"));
  const [selectedContractTypes, setSelectedContractTypes] = useState<string[]>(searchParams.getAll("contractType"));

  // garder tri actuel
  const sortBy = searchParams.get("sortBy") || undefined;
  const sortDir = searchParams.get("sortDir") || undefined;

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
    if (sortBy) params.set("sortBy", sortBy);
    if (sortDir) params.set("sortDir", sortDir);

    router.push(`/offers?${params.toString()}`);

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
    const params = new URLSearchParams();
    params.set("page", "1");
    if (sortBy) params.set("sortBy", sortBy);
    if (sortDir) params.set("sortDir", sortDir);
    router.push(`/offers?${params.toString()}`);
  };

  const hasFilters =
    (keyword && keyword.trim().length > 0) ||
    selectedBanks.length > 0 ||
    selectedCategories.length > 0 ||
    selectedContractTypes.length > 0;

  /* ---- Recherche prédictive (respecte les filtres actifs) ---- */
  const [openSuggest, setOpenSuggest] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggest[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const debounceRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(debounceRef.current);
    if (!keyword || keyword.trim().length < 2) {
      setSuggestions([]);
      setOpenSuggest(false);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          keyword,
          limit: "8",
          offset: "0",
          sortBy: "posted",
          sortDir: "desc",
        });
        selectedBanks.forEach((b) => params.append("bank", b));
        selectedCategories.forEach((c) => params.append("category", c));
        selectedContractTypes.forEach((ct) => params.append("contractType", ct));

        const res = await fetch(`/api/jobs?${params.toString()}`, { cache: "no-store" });
        const jobs = (await res.json()) as Array<{ title: string }>;

        const titles: Suggest[] = Array.from(new Set(jobs.map((j) => j.title).filter(Boolean)))
          .slice(0, 6)
          .map((t) => ({ type: "title", label: t }));

        const banks: Suggest[] = BANKS_LIST.filter((b) =>
          b.name.toLowerCase().includes(keyword.toLowerCase())
        )
          .slice(0, 4)
          .map((b) => ({ type: "bank", label: b.name, id: b.id }));

        const cats: Suggest[] = CATEGORY_LIST.filter((c) =>
          c.name.toLowerCase().includes(keyword.toLowerCase())
        )
          .slice(0, 4)
          .map((c) => ({ type: "category", label: c.name }));

        const merged = [...titles, ...banks, ...cats].slice(0, 10);
        setSuggestions(merged);
        setActiveIdx(0);
        setOpenSuggest(merged.length > 0);
      } catch {
        setOpenSuggest(false);
      }
    }, 200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, selectedBanks, selectedCategories, selectedContractTypes]);

  function onSelectSuggest(s: Suggest) {
    if (s.type === "title") {
      apply({ keyword: s.label });
    } else if (s.type === "bank") {
      const next = selectedBanks.includes(s.id) ? selectedBanks : [...selectedBanks, s.id];
      apply({ banks: next });
    } else if (s.type === "category") {
      const next = selectedCategories.includes(s.label)
        ? selectedCategories
        : [...selectedCategories, s.label];
      apply({ categories: next });
    }
    setOpenSuggest(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!openSuggest || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      onSelectSuggest(suggestions[activeIdx]);
    } else if (e.key === "Escape") {
      setOpenSuggest(false);
    }
  }

  return (
    <form onSubmit={handleSearch} className="w-full space-y-3 relative">
      {/* Ligne principale */}
      <div className="flex flex-col lg:flex-row items-stretch gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher un intitulé, une compétence…"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setOpenSuggest(true);
            }}
            onKeyDown={onKeyDown}
            onBlur={() => setTimeout(() => setOpenSuggest(false), 120)}
            onFocus={() => keyword.trim().length >= 2 && setOpenSuggest(true)}
            className="pl-9 text-base h-11 bg-card border border-border focus-visible:ring-0 focus-visible:border-primary"
          />

          {/* Suggestions : z-50 pour rester au-dessus du tableau */}
          {openSuggest && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 z-50 rounded-xl border border-border bg-card p-2 neon-dropdown pop-anim shadow-[var(--glow-weak)]">
              <ul className="max-h-64 overflow-auto">
                {suggestions.map((s, idx) => (
                  <li
                    key={`${s.type}-${s.label}-${idx}`}
                    className={`px-3 py-2 rounded-lg cursor-pointer flex items-center gap-2 ${
                      idx === activeIdx ? "bg-muted/60" : "hover:bg-muted/40"
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onSelectSuggest(s);
                    }}
                  >
                    <span className="text-xs px-2 py-0.5 rounded-full border border-border bg-surface/70 shrink-0">
                      {s.type === "title" ? "Titre" : s.type === "bank" ? "Banque" : "Métier"}
                    </span>
                    <span className="truncate">{s.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Banques */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="h-11 rounded-full px-4 pill-btn">
                <span className={`flex-1 text-left truncate ${selectedBanks.length === 0 ? "text-muted-foreground" : ""}`}>
                  {selectedBanks.length > 0 ? `${selectedBanks.length} banque(s)` : "Toutes les banques"}
                </span>
                <span className="ml-2">▾</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent sideOffset={8} className="w-[240px] p-0 pop-anim neon-dropdown">
              <ScrollArea className="h-56 px-2 py-2">
                {BANKS_LIST.map((bank) => (
                  <Label key={bank.id} className="menu-item flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted cursor-pointer">
                    <Checkbox checked={selectedBanks.includes(bank.id)} onCheckedChange={() => toggleSelection(setSelectedBanks, bank.id)} />
                    <span className="text-sm">{bank.name}</span>
                  </Label>
                ))}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          {/* Métiers */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="h-11 rounded-full px-4 pill-btn">
                <span className={`flex-1 text-left truncate ${selectedCategories.length === 0 ? "text-muted-foreground" : ""}`}>
                  {selectedCategories.length > 0 ? `${selectedCategories.length} métier(s)` : "Tous les métiers"}
                </span>
                <span className="ml-2">▾</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent sideOffset={8} className="w-[260px] p-0 pop-anim neon-dropdown">
              <ScrollArea className="h-56 px-2 py-2">
                {CATEGORY_LIST.map((cat) => (
                  <Label key={cat.id} className="menu-item flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted cursor-pointer">
                    <Checkbox checked={selectedCategories.includes(cat.name)} onCheckedChange={() => toggleSelection(setSelectedCategories, cat.name)} />
                    <span className="text-sm">{cat.name}</span>
                  </Label>
                ))}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          {/* Contrats */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="h-11 rounded-full px-4 pill-btn">
                <span className={`flex-1 text-left truncate ${selectedContractTypes.length === 0 ? "text-muted-foreground" : ""}`}>
                  {selectedContractTypes.length > 0 ? `${selectedContractTypes.length} contrat(s)` : "Type de contrat"}
                </span>
                <span className="ml-2">▾</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent sideOffset={8} className="w-[220px] p-0 pop-anim neon-dropdown">
              <ScrollArea className="h-56 px-2 py-2">
                {CONTRACT_TYPE_LIST.map((contract) => (
                  <Label key={contract.id} className="menu-item flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted cursor-pointer">
                    <Checkbox checked={selectedContractTypes.includes(contract.id)} onCheckedChange={() => toggleSelection(setSelectedContractTypes, contract.id)} />
                    <span className="text-sm">{contract.name}</span>
                  </Label>
                ))}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          <Button type="submit" className="h-11 rounded-xl px-5 btn">Rechercher</Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-xl text-muted-foreground hover:text-accent"
            onClick={resetFilters}
            title="Réinitialiser les filtres"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Chips */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {keyword && keyword.trim().length > 0 && (
            <Chip label={`Mot-clé: ${keyword}`} onRemove={() => apply({ keyword: "" })} />
          )}
          {selectedBanks.map((id) => (
            <Chip key={`bank-${id}`} label={`Banque: ${bankName(id)}`} onRemove={() => apply({ banks: selectedBanks.filter((b) => b !== id) })} />
          ))}
          {selectedCategories.map((name) => (
            <Chip key={`cat-${name}`} label={`Métier: ${name}`} onRemove={() => apply({ categories: selectedCategories.filter((c) => c !== name) })} />
          ))}
          {selectedContractTypes.map((id) => (
            <Chip key={`ct-${id}`} label={`Contrat: ${contractName(id)}`} onRemove={() => apply({ contractTypes: selectedContractTypes.filter((ct) => ct !== id) })} />
          ))}
        </div>
      )}
    </form>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 h-8 rounded-full border border-border bg-card/70 px-3 text-sm text-muted-foreground hover:border-primary/60 transition">
      <span className="truncate max-w-[240px]">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 grid place-items-center rounded-full p-0.5 hover:bg-primary/15 text-muted-foreground hover:text-primary"
        aria-label={`Supprimer ${label}`}
        title="Supprimer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </span>
  );
}
