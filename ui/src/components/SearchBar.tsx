"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Search, ChevronRight } from "lucide-react";

import { BANKS_LIST } from "@/config/banks";
import { CATEGORY_GROUPS, CATEGORY_LEAVES } from "@/config/categories";
import { CONTRACT_TYPE_LIST } from "@/config/contractTypes";

/* ----------------------------------------------
   Localisation data (continents → ISO2 country list)
   -> codes alignés avec _COUNTRY_CANON de ton classifier
------------------------------------------------- */
const COUNTRY_LABELS: Record<string, string> = {
  AE: "Émirats arabes unis", AR: "Argentine", AT: "Autriche", AU: "Australie",
  BD: "Bangladesh", BE: "Belgique", BG: "Bulgarie", BH: "Bahreïn", BM: "Bermudes",
  BR: "Brésil", BY: "Biélorussie", CA: "Canada", CD: "RDC", CH: "Suisse",
  CL: "Chili", CN: "Chine", CO: "Colombie", CR: "Costa Rica", CU: "Cuba",
  CZ: "Tchéquie", DE: "Allemagne", DK: "Danemark", DZ: "Algérie", EE: "Estonie",
  EG: "Égypte", ES: "Espagne", FI: "Finlande", FR: "France", GB: "Royaume-Uni",
  GR: "Grèce", HK: "Hong Kong", HN: "Honduras", HR: "Croatie", HU: "Hongrie",
  ID: "Indonésie", IE: "Irlande", IL: "Israël", IM: "Île de Man", IN: "Inde",
  IS: "Islande", IT: "Italie", JE: "Jersey", JP: "Japon", KE: "Kenya",
  KR: "Corée du Sud", KW: "Koweït", KZ: "Kazakhstan", LK: "Sri Lanka",
  LT: "Lituanie", LU: "Luxembourg", LV: "Lettonie", MA: "Maroc", MO: "Macao",
  MX: "Mexique", MY: "Malaisie", MU: "Maurice", NG: "Nigéria", NL: "Pays-Bas",
  NO: "Norvège", NZ: "Nouvelle-Zélande", OM: "Oman", PE: "Pérou", PH: "Philippines",
  PK: "Pakistan", PL: "Pologne", PT: "Portugal", QA: "Qatar", RO: "Roumanie",
  RS: "Serbie", RU: "Russie", SA: "Arabie saoudite", SE: "Suède", SG: "Singapour",
  SI: "Slovénie", SK: "Slovaquie", TH: "Thaïlande", TR: "Turquie", TW: "Taïwan",
  UA: "Ukraine", UY: "Uruguay", US: "États-Unis", VE: "Venezuela",
  VN: "Vietnam", ZA: "Afrique du Sud",
};

const CONTINENTS: { id: string; name: string; countries: string[] }[] = [
  {
    id: "europe",
    name: "Europe",
    countries: [
      "FR","GB","IE","ES","PT","IT","DE","AT","CH","BE","NL","LU",
      "DK","NO","SE","FI","PL","CZ","SK","HU","RO","BG","GR","HR","SI","LT","LV","EE","IS","RS","JE","IM"
    ],
  },
  { id: "north-america", name: "Amérique du Nord", countries: ["US","CA","MX","BM","CR","CU","HN"] },
  { id: "south-america", name: "Amérique du Sud", countries: ["AR","BR","CL","CO","PE","UY","VE"] },
  {
    id: "asia",
    name: "Asie",
    countries: ["AE","QA","SA","TR","IL","IN","LK","VN","TH","SG","MY","ID","PH","HK","KR","JP","CN","TW","KZ","KW","BD"],
  },
  { id: "africa", name: "Afrique", countries: ["DZ","MA","EG","NG","ZA","CD","MU"] },
  { id: "oceania", name: "Océanie", countries: ["AU","NZ"] },
];

/* ----------------------------------------------
   Types d’organisation (gauche du popover Banques)
----------------------------------------------- */
const ORG_TYPE_ORDER = [
  "banks",
  "broker",
  "idb",
  "prop_mm",
  "buy_side",
  "private_bank",
  "exchange",
  "trading_house",
  "corporate",
  "insurer",
  "vendor",
  "agency",
  "shipbroker",
  "other",
] as const;

const ORG_LABELS: Record<string, string> = {
  banks: "Banques / IB",
  broker: "Brokers / Dealers",
  idb: "Interdealer Brokers",
  prop_mm: "Prop / Market Makers",
  buy_side: "Buy Side (AM / HF)",
  private_bank: "Banques privées / WM",
  exchange: "Exchanges / Venues",
  trading_house: "Trading Houses (Commos)",
  corporate: "Corporate Finance",
  insurer: "Assureurs / Réassureurs",
  vendor: "Data / Tech / Vendors",
  agency: "Agences / Dev Banks",
  shipbroker: "Shipbrokers",
  other: "Autres",
};

/* ---------- Fallback pour classer si orgType est manquant ---------- */
type BankItem = { id: string; name: string; orgType?: string };

const GUESSERS: Array<[RegExp, string]> = [
  // IDBs & voice brokers
  [/\b(tp\s?icap|bgc|gfi)\b/i, "idb"],
  // Prop / MM
  [/\b(optiver|imc|susquehanna|jane\s*street|flow\s*traders)\b/i, "prop_mm"],
  // Brokers/Dealers
  [/\b(marex|stifel|kepler|kepler\s*cheuvreux)\b/i, "broker"],
  // Buy-side
  [/\b(blackrock|amundi|pimco|wellington|dnca|lfde|sycomore|fidelity|axa\s*im)\b/i, "buy_side"],
  // Private banks / WM
  [/\b(pictet|lombard\s*odier|mirabaud|julius\s*baer|vontobel|edmond\s*de\s*rothschild)\b/i, "private_bank"],
  // Exchanges / venues / vendors
  [/\b(euronext|lseg|six|cme)\b/i, "exchange"],
  [/\b(bloomberg|murex)\b/i, "vendor"],
  // Trading houses / commo
  [/\b(trafigura|vitol|glencore|gunvor|mercuria|mabanaft|louis\s*dreyfus|ldc|cargill|bunge|shell|edf|engie|total)\b/i, "trading_house"],
  // Insurers
  [/\b(ag2r|generali|scor)\b/i, "insurer"],
  // Corporates finance entities
  [/\b(air\s*liquide|airbus|lvmh|sanofi)\b/i, "corporate"],
];

const inferOrgType = (b: BankItem): string => {
  if (b.orgType) return b.orgType;
  const hay = `${b.id} ${b.name}`;
  for (const [re, t] of GUESSERS) if (re.test(hay)) return t;
  // par défaut, on bascule en "banks"
  return "banks";
};

/* ---------- Regroupement: type -> banques ---------- */
const BANKS_BY_ORG: Record<string, { id: string; name: string }[]> = {};
(BANKS_LIST as BankItem[]).forEach((b) => {
  const t = inferOrgType(b);
  (BANKS_BY_ORG[t] ||= []).push({ id: b.id, name: b.name });
});
Object.values(BANKS_BY_ORG).forEach((arr) =>
  arr.sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }))
);

// options affichées = uniquement les types présents, dans l’ordre voulu
const ORG_TYPE_OPTIONS: { id: string; label: string }[] = [
  ...ORG_TYPE_ORDER
    .filter((t) => (BANKS_BY_ORG[t] || []).length > 0)
    .map((id) => ({ id, label: ORG_LABELS[id] ?? id })),
  // au cas où un type non listé apparaîtrait
  ...Object.keys(BANKS_BY_ORG)
    .filter((t) => !(ORG_TYPE_ORDER as readonly string[]).includes(t))
    .map((id) => ({ id, label: ORG_LABELS[id] ?? id })),
];

/* ------------- Types ------------- */
type Suggest =
  | { type: "title"; label: string }
  | { type: "bank"; label: string; id: string }
  | { type: "category"; label: string };

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [keyword, setKeyword] = useState(searchParams.get("keyword") || "");
  const [selectedBanks, setSelectedBanks] = useState<string[]>(searchParams.getAll("bank"));
  const [selectedCategories, setSelectedCategories] = useState<string[]>(searchParams.getAll("category"));
  const [selectedContractTypes, setSelectedContractTypes] = useState<string[]>(searchParams.getAll("contractType"));
  const [selectedCountries, setSelectedCountries] = useState<string[]>(searchParams.getAll("country"));

  // garder tri actuel
  const sortBy = searchParams.get("sortBy") || undefined;
  const sortDir = searchParams.get("sortDir") || undefined;

  const toggleSelection = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setter((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const bankName = (id: string) => (BANKS_LIST as BankItem[]).find((b) => b.id === id)?.name ?? id;
  const contractName = (id: string) => CONTRACT_TYPE_LIST.find((c) => c.id === id)?.name ?? id;
  const countryLabel = (iso: string) => COUNTRY_LABELS[iso] ?? iso;

  const apply = (next?: {
    keyword?: string;
    banks?: string[];
    categories?: string[];
    contractTypes?: string[];
    countries?: string[];
  }) => {
    const kw = next?.keyword !== undefined ? next.keyword : keyword;
    const banks = next?.banks ?? selectedBanks;
    const cats = next?.categories ?? selectedCategories;
    const cts = next?.contractTypes ?? selectedContractTypes;
    const ctys = next?.countries ?? selectedCountries;

    const params = new URLSearchParams();
    if (kw) params.set("keyword", kw);
    banks.forEach((b) => params.append("bank", b));
    cats.forEach((c) => params.append("category", c));
    cts.forEach((ct) => params.append("contractType", ct));
    ctys.forEach((co) => params.append("country", co));
    params.set("page", "1");
    if (sortBy) params.set("sortBy", sortBy);
    if (sortDir) params.set("sortDir", sortDir);

    router.push(`/offers?${params.toString()}`);

    if (next?.keyword !== undefined) setKeyword(next.keyword);
    if (next?.banks) setSelectedBanks(next.banks);
    if (next?.categories) setSelectedCategories(next.categories);
    if (next?.contractTypes) setSelectedContractTypes(next.contractTypes);
    if (next?.countries) setSelectedCountries(next.countries);
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
    setSelectedCountries([]);
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
    selectedContractTypes.length > 0 ||
    selectedCountries.length > 0;

  /* ---- Recherche prédictive ---- */
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
        selectedCountries.forEach((co) => params.append("country", co));

        const res = await fetch(`/api/jobs?${params.toString()}`, { cache: "no-store" });
        const jobs = (await res.json()) as Array<{ title: string }>;

        const titles: Suggest[] = Array.from(new Set(jobs.map((j) => j.title).filter(Boolean)))
          .slice(0, 6)
          .map((t) => ({ type: "title", label: t }));

        const banks: Suggest[] = (BANKS_LIST as BankItem[])
          .filter((b) => b.name.toLowerCase().includes(keyword.toLowerCase()))
          .slice(0, 4)
          .map((b) => ({ type: "bank", label: b.name, id: b.id }));

        const cats: Suggest[] = CATEGORY_LEAVES.filter((c) =>
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
  }, [keyword, selectedBanks, selectedCategories, selectedContractTypes, selectedCountries]);

  function onSelectSuggest(s: Suggest) {
    if (s.type === "title") {
      apply({ keyword: s.label });
    } else if (s.type === "bank") {
      const next = selectedBanks.includes(s.id) ? selectedBanks : [...selectedBanks, s.id];
      setSelectedBanks(next); // on ne pousse pas l’URL ici (comme avant)
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

  /* ---------- Métiers (groupes repliables) ---------- */
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const toggleGroupOpen = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const parentCheckState = (childrenNames: string[]): boolean | "indeterminate" => {
    const selectedCount = childrenNames.filter((n) => selectedCategories.includes(n)).length;
    if (selectedCount === 0) return false;
    if (selectedCount === childrenNames.length) return true;
    return "indeterminate";
  };
  const toggleParentSelection = (childrenNames: string[]) => {
    const allSelected = childrenNames.every((n) => selectedCategories.includes(n));
    if (allSelected) {
      apply({ categories: selectedCategories.filter((n) => !childrenNames.includes(n)) });
    } else {
      const merged = Array.from(new Set([...selectedCategories, ...childrenNames]));
      apply({ categories: merged });
    }
  };

  /* ---------- Localisation (continents → pays) ---------- */
  const [openLocation, setOpenLocation] = useState(false);
  const [activeContinent, setActiveContinent] = useState<string>(CONTINENTS[0]?.id ?? "europe");

  const continentCheckState = (ctyList: string[]): boolean | "indeterminate" => {
    const cnt = ctyList.filter((c) => selectedCountries.includes(c)).length;
    if (cnt === 0) return false;
    if (cnt === ctyList.length) return true;
    return "indeterminate";
  };

  const toggleContinent = (ctyList: string[]) => {
    const allSelected = ctyList.every((c) => selectedCountries.includes(c));
    if (allSelected) {
      apply({ countries: selectedCountries.filter((c) => !ctyList.includes(c)) });
    } else {
      const merged = Array.from(new Set([...selectedCountries, ...ctyList]));
      apply({ countries: merged });
    }
  };

  /* ---------- Popover Banques (Types ←→ Entreprises) ---------- */
  const [openBanks, setOpenBanks] = useState(false);
  const [activeOrg, setActiveOrg] = useState<string>(ORG_TYPE_OPTIONS[0]?.id ?? "banks");

  const orgTypeCheckState = (orgId: string): boolean | "indeterminate" => {
    const banks = BANKS_BY_ORG[orgId] || [];
    if (banks.length === 0) return false;
    const cnt = banks.filter((b) => selectedBanks.includes(b.id)).length;
    if (cnt === 0) return false;
    if (cnt === banks.length) return true;
    return "indeterminate";
  };

  const toggleOrgTypeLocal = (orgId: string) => {
    const ids = (BANKS_BY_ORG[orgId] || []).map((b) => b.id);
    setSelectedBanks((prev) => {
      const allSelected = ids.every((id) => prev.includes(id));
      if (allSelected) return prev.filter((id) => !ids.includes(id));
      return Array.from(new Set([...prev, ...ids]));
    });
  };

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

          {/* Suggestions */}
          {openSuggest && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 z-50 rounded-xl border border-border bg-card p-2 neon-dropdown pop-anim shadow-[var(--glow-weak)]">
              <ul className="max-h-64 overflow-auto">
                {suggestions.map((s, idx) => (
                  <li
                    key={`${s.type}-${s.label}-${idx}`}
                    className={`px-3 py-2 rounded-lg cursor-pointer flex items-center gap-2 ${idx === activeIdx ? "bg-muted/60" : "hover:bg-muted/40"}`}
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
          {/* Banques — Types ←→ Entreprises */}
          <Popover open={openBanks} onOpenChange={setOpenBanks}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="h-11 rounded-full px-4 pill-btn">
                <span className={`flex-1 text-left truncate ${selectedBanks.length === 0 ? "text-muted-foreground" : ""}`}>
                  {selectedBanks.length > 0 ? `${selectedBanks.length} banque(s)` : "Toutes les banques"}
                </span>
                <span className="ml-2">▾</span>
              </Button>
            </PopoverTrigger>

            <PopoverContent sideOffset={8} className="w-[560px] p-0 pop-anim neon-dropdown">
              <div className="flex">
                {/* Colonne gauche: types */}
                <div className="w-64 border-r border-border/60">
                  <ScrollArea className="h-72">
                    {ORG_TYPE_OPTIONS.map((t) => {
                      const cState = orgTypeCheckState(t.id);
                      const active = activeOrg === t.id;
                      const sz = (BANKS_BY_ORG[t.id] || []).length;
                      const selectedCount = (BANKS_BY_ORG[t.id] || []).filter((b) => selectedBanks.includes(b.id)).length;

                      return (
                        <div
                          key={t.id}
                          role="button"
                          tabIndex={0}
                          className={`menu-item flex items-center gap-2 py-2 px-2 rounded-lg cursor-pointer transition-colors
                            ${active ? "bg-muted/60 border border-border/60" : "hover:bg-muted"}`}
                          onClick={() => setActiveOrg(t.id)}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveOrg(t.id); } }}
                        >
                          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Checkbox checked={cState} onCheckedChange={() => toggleOrgTypeLocal(t.id)} />
                          </div>
                          <span className="text-sm font-medium truncate">{t.label}</span>
                          <span className="ml-auto text-xs text-muted-foreground">{sz}</span>
                          {selectedCount > 0 && (
                            <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                              {selectedCount}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </ScrollArea>
                </div>

                {/* Colonne droite: banques du type actif */}
                <div className="flex-1">
                  <ScrollArea className="h-72 px-2 py-2">
                    {(BANKS_BY_ORG[activeOrg] || []).map((bank) => (
                      <Label key={bank.id} className="menu-item flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted cursor-pointer">
                        <Checkbox
                          checked={selectedBanks.includes(bank.id)}
                          onCheckedChange={() => toggleSelection(setSelectedBanks, bank.id)}
                        />
                        <span className="text-sm">{bank.name}</span>
                        <span className="ml-auto text-xs text-muted-foreground">{bank.id}</span>
                      </Label>
                    ))}
                    {(!BANKS_BY_ORG[activeOrg] || BANKS_BY_ORG[activeOrg].length === 0) && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">Aucune entreprise dans ce groupe.</div>
                    )}
                  </ScrollArea>
                </div>
              </div>

              <div className="p-2 flex justify-end gap-2 border-t border-border/60">
                <Button type="button" variant="ghost" onClick={() => setSelectedBanks([])} className="rounded-lg">
                  Effacer
                </Button>
                <Button type="button" onClick={() => setOpenBanks(false)} className="rounded-lg">
                  Fermer
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Métiers (groupes repliables) */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="h-11 rounded-full px-4 pill-btn">
                <span className={`flex-1 text-left truncate ${selectedCategories.length === 0 ? "text-muted-foreground" : ""}`}>
                  {selectedCategories.length > 0 ? `${selectedCategories.length} métier(s)` : "Tous les métiers"}
                </span>
                <span className="ml-2">▾</span>
              </Button>
            </PopoverTrigger>

            <PopoverContent sideOffset={8} className="w-[360px] p-0 pop-anim neon-dropdown">
              <ScrollArea className="h-72 px-2 py-2">
                {CATEGORY_GROUPS.map((group) => {
                  const children = group.children ?? [{ id: group.id, name: group.name }];
                  const childNames = children.map((c) => c.name);
                  const pState = parentCheckState(childNames);
                  const opened = expandedGroups.has(group.id);
                  const hasChildren = (group.children?.length ?? 0) > 0;

                  return (
                    <div key={group.id} className="mt-2 pt-2 first:mt-0 first:pt-0 border-t border-border/30">
                      {/* Ligne parent */}
                      <div
                        role="button"
                        aria-expanded={opened}
                        tabIndex={0}
                        onClick={() => hasChildren && toggleGroupOpen(group.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            hasChildren && toggleGroupOpen(group.id);
                          }
                        }}
                        className="menu-item flex items-center gap-2 py-2 px-2 rounded-lg cursor-pointer transition hover:bg-muted hover:shadow-[var(--glow-weak)]"
                      >
                        {hasChildren ? (
                          <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${opened ? "rotate-90" : ""}`} />
                        ) : (
                          <span className="w-4" />
                        )}

                        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={pState} onCheckedChange={() => toggleParentSelection(childNames)} />
                        </div>

                        <span className="text-sm font-semibold tracking-wide select-none">{group.name}</span>
                      </div>

                      {/* Sous-catégories */}
                      {hasChildren && opened && (
                        <div className="ml-7 mt-1 pl-3 border-l border-border/60 space-y-1">
                          {children.map((cat) => (
                            <Label
                              key={cat.id}
                              className="menu-item flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer text-[13px] text-muted-foreground hover:text-foreground transition hover:bg-muted hover:shadow-[var(--glow-weak)]"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-border" aria-hidden />
                              <Checkbox
                                className="scale-90"
                                checked={selectedCategories.includes(cat.name)}
                                onCheckedChange={() => {
                                  const next = selectedCategories.includes(cat.name)
                                    ? selectedCategories.filter((c) => c !== cat.name)
                                    : [...selectedCategories, cat.name];
                                  apply({ categories: next });
                                }}
                              />
                              <span className="truncate">{cat.name}</span>
                            </Label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          {/* Localisation (Continents → Pays) */}
          <Popover open={openLocation} onOpenChange={setOpenLocation}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="h-11 rounded-full px-4 pill-btn">
                <span className={`flex-1 text-left truncate ${selectedCountries.length === 0 ? "text-muted-foreground" : ""}`}>
                  {selectedCountries.length > 0 ? `${selectedCountries.length} localisation(s)` : "Localisation"}
                </span>
                <span className="ml-2">▾</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent sideOffset={8} className="w-[560px] p-0 pop-anim neon-dropdown">
              <div className="flex">
                {/* Colonne continents */}
                <div className="w-64 border-r border-border/60">
                  <ScrollArea className="h-72">
                    {CONTINENTS.map((c) => {
                      const cState = continentCheckState(c.countries);
                      const active = activeContinent === c.id;
                      const selectedCount = c.countries.filter((co) => selectedCountries.includes(co)).length;

                      return (
                        <div
                          key={c.id}
                          role="button"
                          tabIndex={0}
                          className={`menu-item flex items-center gap-2 py-2 px-2 rounded-lg cursor-pointer transition-colors
                            ${active ? "bg-muted/60 border border-border/60" : "hover:bg-muted"}
                            focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none`}
                          onClick={() => setActiveContinent(c.id)}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveContinent(c.id); } }}
                        >
                          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Checkbox className="focus-visible:ring-0 focus-visible:outline-none" checked={cState} onCheckedChange={() => toggleContinent(c.countries)} />
                          </div>

                          <span className="text-sm font-medium truncate">{c.name}</span>

                          {selectedCount > 0 && (
                            <span className="ml-1 text-[11px] px-1.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                              {selectedCount}/{c.countries.length}
                            </span>
                          )}

                          <ChevronRight className={`ml-auto h-4 w-4 opacity-60 transition-transform ${active ? "translate-x-0.5" : ""}`} aria-hidden />
                        </div>
                      );
                    })}
                  </ScrollArea>
                </div>

                {/* Colonne pays */}
                <div className="flex-1">
                  <ScrollArea className="h-72 px-2 py-2">
                    {CONTINENTS.find((c) => c.id === activeContinent)?.countries
                      .map((iso) => ({ iso, name: countryLabel(iso) }))
                      .sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base", numeric: true }))
                      .map(({ iso, name }) => (
                        <Label key={iso} className="menu-item flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted cursor-pointer">
                          <Checkbox
                            checked={selectedCountries.includes(iso)}
                            onCheckedChange={() =>
                              apply({
                                countries: selectedCountries.includes(iso)
                                  ? selectedCountries.filter((c) => c !== iso)
                                  : [...selectedCountries, iso],
                              })
                            }
                          />
                          <span className="text-sm">{name}</span>
                          <span className="ml-auto text-xs text-muted-foreground">{iso}</span>
                        </Label>
                      ))}
                  </ScrollArea>
                </div>
              </div>

              <div className="p-2 flex justify-end gap-2 border-t border-border/60">
                <Button type="button" variant="ghost" onClick={() => apply({ countries: [] })} className="rounded-lg">
                  Effacer
                </Button>
                <Button type="button" onClick={() => setOpenLocation(false)} className="rounded-lg">
                  Fermer
                </Button>
              </div>
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
                    <Checkbox
                      checked={selectedContractTypes.includes(contract.id)}
                      onCheckedChange={() => toggleSelection(setSelectedContractTypes, contract.id)}
                    />
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
          {selectedCountries.map((iso) => (
            <Chip key={`country-${iso}`} label={`Pays: ${countryLabel(iso)}`} onRemove={() => apply({ countries: selectedCountries.filter((c) => c !== iso) })} />
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
