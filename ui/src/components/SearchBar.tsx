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
import { AnimatePresence, motion } from "framer-motion";

import { BANKS_LIST } from "@/config/banks";
import { CATEGORY_GROUPS, CATEGORY_LEAVES } from "@/config/categories";
import { CONTRACT_TYPE_LIST } from "@/config/contractTypes";

/* ----------------------------------------------
   Localisation data
------------------------------------------------- */
const COUNTRY_LABELS: Record<string, string> = {
  AE:"Émirats arabes unis", AR:"Argentine", AT:"Autriche", AU:"Australie",
  BD:"Bangladesh", BE:"Belgique", BG:"Bulgarie", BH:"Bahreïn", BM:"Bermudes",
  BR:"Brésil", BY:"Biélorussie", CA:"Canada", CD:"RDC", CH:"Suisse",
  CL:"Chili", CN:"Chine", CO:"Colombie", CR:"Costa Rica", CU:"Cuba",
  CZ:"Tchéquie", DE:"Allemagne", DK:"Danemark", DZ:"Algérie", EE:"Estonie",
  EG:"Égypte", ES:"Espagne", FI:"Finlande", FR:"France", GB:"Royaume-Uni",
  GR:"Grèce", HK:"Hong Kong", HN:"Honduras", HR:"Croatie", HU:"Hongrie",
  ID:"Indonésie", IE:"Irlande", IL:"Israël", IM:"Île de Man", IN:"Inde",
  IS:"Islande", IT:"Italie", JE:"Jersey", JP:"Japon", KE:"Kenya",
  KR:"Corée du Sud", KW:"Koweït", KZ:"Kazakhstan", LK:"Sri Lanka",
  LT:"Lituanie", LU:"Luxembourg", LV:"Lettonie", MA:"Maroc", MO:"Macao",
  MX:"Mexique", MY:"Malaisie", MU:"Maurice", NG:"Nigéria", NL:"Pays-Bas",
  NO:"Norvège", NZ:"Nouvelle-Zélande", OM:"Oman", PE:"Pérou", PH:"Philippines",
  PK:"Pakistan", PL:"Pologne", PT:"Portugal", QA:"Qatar", RO:"Roumanie",
  RS:"Serbie", RU:"Russie", SA:"Arabie saoudite", SE:"Suède", SG:"Singapour",
  SI:"Slovénie", SK:"Slovaquie", TH:"Thaïlande", TR:"Turquie", TW:"Taïwan",
  UA:"Ukraine", UY:"Uruguay", US:"États-Unis", VE:"Venezuela",
  VN:"Vietnam", ZA:"Afrique du Sud",
};

const CONTINENTS: { id: string; name: string; countries: string[] }[] = [
  { id:"europe", name:"Europe", countries:[
    "FR","GB","IE","ES","PT","IT","DE","AT","CH","BE","NL","LU",
    "DK","NO","SE","FI","PL","CZ","SK","HU","RO","BG","GR","HR","SI",
    "LT","LV","EE","IS","RS","JE","IM"
  ]},
  { id:"north-america", name:"Amérique du Nord", countries:["US","CA","MX","BM","CR","CU","HN"] },
  { id:"south-america", name:"Amérique du Sud", countries:["AR","BR","CL","CO","PE","UY","VE"] },
  { id:"asia", name:"Asie", countries:["AE","QA","SA","TR","IL","IN","LK","VN","TH","SG","MY","ID","PH","HK","KR","JP","CN","TW","KZ","KW","BD"] },
  { id:"africa", name:"Afrique", countries:["DZ","MA","EG","NG","ZA","CD","MU"] },
  { id:"oceania", name:"Océanie", countries:["AU","NZ"] },
];

/* ----------------------------------------------
   Types d’organisation (Banques)
----------------------------------------------- */
const ORG_TYPE_ORDER = [
  "banks","broker","idb","prop_mm","buy_side","private_bank","exchange",
  "trading_house","corporate","insurer","vendor","agency","shipbroker","other",
] as const;

const ORG_LABELS: Record<string, string> = {
  banks:"Banques / IB",
  broker:"Brokers / Dealers",
  idb:"Interdealer Brokers",
  prop_mm:"Prop / Market Makers",
  buy_side:"Buy Side (AM / HF)",
  private_bank:"Banques privées / WM",
  exchange:"Exchanges / Venues",
  trading_house:"Trading Houses (Commos)",
  corporate:"Corporate Finance",
  insurer:"Assureurs / Réassureurs",
  vendor:"Data / Tech / Vendors",
  agency:"Agences / Dev Banks",
  shipbroker:"Shipbrokers",
  other:"Autres",
};

/* ---------- Fallback orgType ---------- */
type BankItem = { id: string; name: string; orgType?: string };
const GUESSERS: Array<[RegExp, string]> = [
  [/\b(tp\s?icap|bgc|gfi)\b/i, "idb"],
  [/\b(optiver|imc|susquehanna|jane\s*street|flow\s*traders)\b/i, "prop_mm"],
  [/\b(marex|stifel|kepler|kepler\s*cheuvreux)\b/i, "broker"],
  [/\b(blackrock|amundi|pimco|wellington|dnca|lfde|sycomore|fidelity|axa\s*im)\b/i, "buy_side"],
  [/\b(pictet|lombard\s*odier|mirabaud|julius\s*baer|vontobel|edmond\s*de\s*rothschild)\b/i, "private_bank"],
  [/\b(euronext|lseg|six|cme)\b/i, "exchange"],
  [/\b(bloomberg|murex)\b/i, "vendor"],
  [/\b(trafigura|vitol|glencore|gunvor|mercuria|mabanaft|louis\s*dreyfus|ldc|cargill|bunge|shell|edf|engie|total)\b/i, "trading_house"],
  [/\b(ag2r|generali|scor)\b/i, "insurer"],
  [/\b(air\s*liquide|airbus|lvmh|sanofi)\b/i, "corporate"],
];
const inferOrgType = (b: BankItem): string => {
  if (b.orgType) return b.orgType;
  const hay = `${b.id} ${b.name}`; for (const [re, t] of GUESSERS) if (re.test(hay)) return t;
  return "banks";
};

/* ---------- Regroupement banques ---------- */
const BANKS_BY_ORG: Record<string, { id: string; name: string }[]> = {};
(BANKS_LIST as BankItem[]).forEach((b) => {
  const t = inferOrgType(b);
  (BANKS_BY_ORG[t] ||= []).push({ id: b.id, name: b.name });
});
Object.values(BANKS_BY_ORG).forEach(arr => arr.sort((a,b)=>a.name.localeCompare(b.name,"fr",{sensitivity:"base"})));

/* ---------- Teintes UI ---------- */
const ORG_TINT: Record<string, string> = {
  banks:"hsl(259 94% 75%)", broker:"hsl(199 89% 70%)", idb:"hsl(197 94% 61%)",
  prop_mm:"hsl(162 84% 62%)", buy_side:"hsl(141 73% 62%)", private_bank:"hsl(27 96% 71%)",
  exchange:"hsl(280 71% 70%)", trading_house:"hsl(16 94% 66%)", corporate:"hsl(221 83% 53%)",
  insurer:"hsl(48 95% 60%)", vendor:"hsl(330 81% 72%)", agency:"hsl(210 80% 72%)",
  shipbroker:"hsl(183 80% 62%)", other:"hsl(0 0% 68%)",
};

/* Europe = ORANGE pour matcher le bouton, puis palette cohérente */
const CONT_TINT: Record<string, string> = {
  europe:"hsl(27 96% 71%)",              // <- orange (comme le bouton)
  "north-america":"hsl(259 94% 75%)",
  "south-america":"hsl(162 84% 62%)",
  asia:"hsl(221 83% 53%)",
  africa:"hsl(16 94% 66%)",
  oceania:"hsl(210 80% 72%)",
};

/* ---------- Teintes par groupe Métiers (Markets = ROUGE) ---------- */
const CAT_GROUP_TINT: Record<string, string> = {
  markets: "hsla(0, 97%, 59%, 1.00)",
  "investment-banking": "hsl(221 83% 53%)",
  "corporate-transaction-banking": "hsl(199 89% 70%)",
  "buy-side": "hsl(141 73% 62%)",
  "wealth-private-banking": "hsl(27 96% 71%)",
  "real-assets": "hsl(280 71% 70%)",
  operations: "hsl(210 80% 72%)",
  "risk-compliance": "hsl(48 95% 60%)",
  "treasury-alm": "hsl(259 94% 75%)",
  "it-tech": "hsl(197 94% 61%)",
  "data-quant": "hsl(330 81% 72%)",
  "product-project-biz": "hsl(210 80% 72%)",
  "strategy-consulting": "hsl(221 83% 53%)",
  "design-marketing-comms": "hsl(183 80% 62%)",
  "finance-control-audit": "hsl(16 94% 66%)",
  "hr": "hsl(141 73% 62%)",
  "retail-banking": "hsl(259 94% 75%)",
  legal: "hsl(221 83% 53%)",
  "admin-exec": "hsl(0 0% 68%)",
};

/* ---------- Types ---------- */
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

  const sortBy = searchParams.get("sortBy") || undefined;
  const sortDir = searchParams.get("sortDir") || undefined;

  const toggleSelection = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setter((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const bankName = (id: string) => (BANKS_LIST as BankItem[]).find((b) => b.id === id)?.name ?? id;
  const contractName = (id: string) => CONTRACT_TYPE_LIST.find((c) => c.id === id)?.name ?? id;
  const countryLabel = (iso: string) => COUNTRY_LABELS[iso] ?? iso;

  /* ===== Apply / Reset ===== */
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
    setKeyword(""); setSelectedBanks([]); setSelectedCategories([]); setSelectedContractTypes([]); setSelectedCountries([]);
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

  /* ===== Suggest ===== */
  const [openSuggest, setOpenSuggest] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggest[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const debounceRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(debounceRef.current);
    if (!keyword || keyword.trim().length < 2) {
      setSuggestions([]); setOpenSuggest(false); return;
    }
    debounceRef.current = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ keyword, limit:"8", offset:"0", sortBy:"posted", sortDir:"desc" });
        selectedBanks.forEach((b) => params.append("bank", b));
        selectedCategories.forEach((c) => params.append("category", c));
        selectedContractTypes.forEach((ct) => params.append("contractType", ct));
        selectedCountries.forEach((co) => params.append("country", co));
        const res = await fetch(`/api/jobs?${params.toString()}`, { cache: "no-store" });
        const jobs = (await res.json()) as Array<{ title: string }>;

        const titles: Suggest[] = Array.from(new Set(jobs.map((j) => j.title).filter(Boolean)))
          .slice(0, 6).map((t) => ({ type:"title", label:t }));

        const banks: Suggest[] = (BANKS_LIST as BankItem[])
          .filter((b) => b.name.toLowerCase().includes(keyword.toLowerCase()))
          .slice(0, 4).map((b) => ({ type:"bank", label:b.name, id:b.id }));

        const cats: Suggest[] = CATEGORY_LEAVES
          .filter((c) => c.name.toLowerCase().includes(keyword.toLowerCase()))
          .slice(0, 4).map((c) => ({ type:"category", label:c.name }));

        const merged = [...titles, ...banks, ...cats].slice(0, 10);
        setSuggestions(merged); setActiveIdx(0); setOpenSuggest(merged.length > 0);
      } catch { setOpenSuggest(false); }
    }, 200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, selectedBanks, selectedCategories, selectedContractTypes, selectedCountries]);

  function onSelectSuggest(s: Suggest) {
    if (s.type === "title") apply({ keyword: s.label });
    else if (s.type === "bank") setSelectedBanks(prev => (prev.includes(s.id) ? prev : [...prev, s.id]));
    else if (s.type === "category") apply({ categories: selectedCategories.includes(s.label) ? selectedCategories : [...selectedCategories, s.label] });
    setOpenSuggest(false);
  }
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!openSuggest || suggestions.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => (i + 1) % suggestions.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx(i => (i - 1 + suggestions.length) % suggestions.length); }
    else if (e.key === "Enter") { e.preventDefault(); onSelectSuggest(suggestions[activeIdx]); }
    else if (e.key === "Escape") setOpenSuggest(false);
  }

  /* ===== Localisation ===== */
  const [openLocation, setOpenLocation] = useState(false);
  const [activeContinent, setActiveContinent] = useState<string>(CONTINENTS[0]?.id ?? "europe");
  const [countryQuery, setCountryQuery] = useState("");

  const continentCheckState = (ctyList: string[]): boolean | "indeterminate" => {
    const cnt = ctyList.filter((c) => selectedCountries.includes(c)).length;
    if (cnt === 0) return false; if (cnt === ctyList.length) return true; return "indeterminate";
  };
  const toggleContinent = (ctyList: string[]) => {
    const allSelected = ctyList.every((c) => selectedCountries.includes(c));
    if (allSelected) { apply({ countries: selectedCountries.filter((c) => !ctyList.includes(c)) }); }
    else { const merged = Array.from(new Set([...selectedCountries, ...ctyList])); apply({ countries: merged }); }
  };

  /* ===== Banques ===== */
  const [openBanks, setOpenBanks] = useState(false);
  const [activeOrg, setActiveOrg] = useState<string>(ORG_TYPE_ORDER[0]);
  const [bankQuery, setBankQuery] = useState("");

  const orgTypeCheckState = (orgId: string): boolean | "indeterminate" => {
    const banks = BANKS_BY_ORG[orgId] || [];
    if (banks.length === 0) return false;
    const cnt = banks.filter((b) => selectedBanks.includes(b.id)).length;
    if (cnt === 0) return false; if (cnt === banks.length) return true; return "indeterminate";
  };
  const toggleOrgTypeLocal = (orgId: string) => {
    const ids = (BANKS_BY_ORG[orgId] || []).map((b) => b.id);
    setSelectedBanks((prev) => {
      const allSelected = ids.every((id) => prev.includes(id));
      if (allSelected) return prev.filter((id) => !ids.includes(id));
      return Array.from(new Set([...prev, ...ids]));
    });
  };

  /* ===== Métiers (2 colonnes avec teinte dynamique & hauteur max) ===== */
  const [openCategories, setOpenCategories] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string>(CATEGORY_GROUPS[0]?.id ?? "markets");
  const [categoryQuery, setCategoryQuery] = useState("");

  const groupCheckState = (groupId: string): boolean | "indeterminate" => {
    const children = (CATEGORY_GROUPS.find(g => g.id === groupId)?.children
      ?? [{ id: groupId, name: CATEGORY_GROUPS.find(g => g.id === groupId)?.name ?? groupId }]);
    const cnt = children.filter(c => selectedCategories.includes(c.name)).length;
    if (cnt === 0) return false; if (cnt === children.length) return true; return "indeterminate";
  };
  const toggleGroupLocal = (groupId: string) => {
    const children = (CATEGORY_GROUPS.find(g => g.id === groupId)?.children
      ?? [{ id: groupId, name: CATEGORY_GROUPS.find(g => g.id === groupId)?.name ?? groupId }]);
    const names = children.map(c => c.name);
    const allSelected = names.every(n => selectedCategories.includes(n));
    if (allSelected) apply({ categories: selectedCategories.filter(n => !names.includes(n)) });
    else apply({ categories: Array.from(new Set([...selectedCategories, ...names])) });
  };

  /* =================== RENDER =================== */
  return (
    <form onSubmit={handleSearch} className="w-full space-y-3 relative">
      <StyleBoost />

      {/* Ligne principale */}
      <div className="flex flex-col lg:flex-row items-stretch gap-2">
        {/* Barre de recherche */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher un intitulé, une compétence…"
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setOpenSuggest(true); }}
            onKeyDown={onKeyDown}
            onBlur={() => setTimeout(() => setOpenSuggest(false), 120)}
            onFocus={() => keyword.trim().length >= 2 && setOpenSuggest(true)}
            className="pl-9 text-base h-11 bg-card border border-border focus-visible:ring-0 focus-visible:border-primary"
          />

          {/* Suggestions */}
          <AnimatePresence>
            {openSuggest && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity:0, y:4, scale:.98 }}
                animate={{ opacity:1, y:0, scale:1 }}
                exit={{ opacity:0, y:4, scale:.98 }}
                transition={{ duration:.18 }}
                className="absolute left-0 right-0 mt-2 z-50 rounded-xl border border-border bg-card p-2 neon-dropdown pop-anim shadow-[var(--glow-weak)]"
              >
                <ul className="max-h-64 overflow-auto">
                  {suggestions.map((s, idx) => (
                    <li
                      key={`${s.type}-${s.label}-${idx}`}
                      className={`px-3 py-2 rounded-lg cursor-pointer flex items-center gap-2 transition-all menu-row ${idx === activeIdx ? "is-active" : ""}`}
                      onMouseDown={(e) => { e.preventDefault(); onSelectSuggest(s); }}
                    >
                      <span className="text-[11px] px-2 py-0.5 rounded-full border border-border bg-surface/70 shrink-0">
                        {s.type === "title" ? "Titre" : s.type === "bank" ? "Banque" : "Métier"}
                      </span>
                      <span className="truncate">{s.label}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* === Banques === */}
          <Popover open={openBanks} onOpenChange={(o) => { setOpenBanks(o); if (o) setBankQuery(""); }}>
            <PopoverTrigger asChild>
              <Button
                variant="outline" role="combobox"
                className="h-11 rounded-full px-4 pill-btn"
                style={{ ["--tint" as any]: "hsl(259 94% 75%)" }}
                aria-expanded={openBanks}
              >
                <span className={`flex-1 text-left truncate ${selectedBanks.length === 0 ? "text-muted-foreground" : ""}`}>
                  {selectedBanks.length > 0 ? `${selectedBanks.length} banque(s)` : "Toutes les banques"}
                </span>
                <ChevronRight className={`ml-1 h-4 w-4 transition-transform ${openBanks ? "rotate-90" : ""}`} />
              </Button>
            </PopoverTrigger>

            <PopoverContent sideOffset={8} className="w-[600px] max-h-[80vh] overflow-auto p-0 pop-anim neon-dropdown">
              <FilterPanel
                title="Banques"
                tint="hsl(259 94% 75%)"
                onClear={() => setSelectedBanks([])}
                onClose={() => setOpenBanks(false)}
              >
                <div className="flex divide-x divide-border/60" style={{ ["--panel-h" as any]: "320px" }}>
                  {/* Colonne gauche: types */}
                  <div className="w-64">
                    <ScrollArea className="h-[var(--panel-h)]">
                      {ORG_TYPE_ORDER.filter((t) => (BANKS_BY_ORG[t] || []).length > 0).map((t) => {
                        const cState = orgTypeCheckState(t);
                        const active = activeOrg === t;
                        const sz = (BANKS_BY_ORG[t] || []).length;
                        const selectedCount = (BANKS_BY_ORG[t] || []).filter((b) => selectedBanks.includes(b.id)).length;
                        const tint = ORG_TINT[t] || "hsl(0 0% 68%)";

                        return (
                          <div
                            key={t} role="button" tabIndex={0}
                            className={`menu-item tinted flex items-center gap-2 py-2 px-2 rounded-lg cursor-pointer ${active ? "tinted-active" : ""}`}
                            style={{ ["--tint" as any]: tint, borderLeftWidth: "3px", borderColor: "transparent" }}
                            onClick={() => setActiveOrg(t)}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveOrg(t); } }}
                          >
                            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                              <Checkbox checked={cState} onCheckedChange={() => toggleOrgTypeLocal(t)} />
                            </div>
                            <span className="text-sm font-medium truncate">{ORG_LABELS[t]}</span>
                            <span className="ml-auto text-xs text-muted-foreground">{sz}</span>
                            {selectedCount > 0 && (
                              <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded-full border"
                                style={{ background:"color-mix(in oklab, var(--tint) 12%, transparent)", borderColor:"color-mix(in oklab, var(--tint) 42%, transparent)" }}>
                                {selectedCount}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </ScrollArea>
                  </div>

                  {/* Colonne droite: banques */}
                  <div className="flex-1">
                    {/* Champ recherche supprimé → comme demandé précédemment */}
                    <ScrollArea className="h-[var(--panel-h)] px-2 py-2">
                      {(BANKS_BY_ORG[activeOrg] || [])
                        .filter((b) => (bankQuery ? (b.name + b.id).toLowerCase().includes(bankQuery.toLowerCase()) : true))
                        .map((bank) => (
                          <Label
                            key={bank.id}
                            className="menu-item flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer tinted hover:shadow-[var(--glow-weak)]"
                            style={{ ["--tint" as any]: ORG_TINT[activeOrg] || "hsl(0 0% 68%)" }}
                          >
                            <Checkbox
                              checked={selectedBanks.includes(bank.id)}
                              onCheckedChange={() => toggleSelection(setSelectedBanks, bank.id)}
                            />
                            <span className="text-sm truncate">{bank.name}</span>
                            <span className="ml-auto text-xs text-muted-foreground">{bank.id}</span>
                          </Label>
                        ))}
                      {(!BANKS_BY_ORG[activeOrg] || BANKS_BY_ORG[activeOrg].length === 0) && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">Aucune entreprise dans ce groupe.</div>
                      )}
                    </ScrollArea>
                  </div>
                </div>
              </FilterPanel>
            </PopoverContent>
          </Popover>

          {/* === Métiers (2 colonnes) === */}
          <Popover open={openCategories} onOpenChange={(o) => { setOpenCategories(o); setCategoryQuery(""); }}>
            <PopoverTrigger asChild>
              <Button
                variant="outline" role="combobox"
                className="h-11 rounded-full px-4 pill-btn"
                style={{ ["--tint" as any]: "hsl(221 83% 53%)" }}
                aria-expanded={openCategories}
              >
                <span className={`flex-1 text-left truncate ${selectedCategories.length === 0 ? "text-muted-foreground" : ""}`}>
                  {selectedCategories.length > 0 ? `${selectedCategories.length} métier(s)` : "Tous les métiers"}
                </span>
                <ChevronRight className={`ml-1 h-4 w-4 transition-transform ${openCategories ? "rotate-90" : ""}`} />
              </Button>
            </PopoverTrigger>

            <PopoverContent sideOffset={8} className="w-[600px] max-h-[80vh] overflow-auto p-0 pop-anim neon-dropdown">
              <FilterPanel
                title="Métiers"
                tint={CAT_GROUP_TINT[activeGroup] ?? "hsla(0, 97%, 59%, 1.00)"}  // <- teinte dynamique, Markets = rouge
                onClear={() => apply({ categories: [] })}
                onClose={() => setOpenCategories(false)}
              >
                <div className="flex divide-x divide-border/60" style={{ ["--panel-h" as any]: "320px" }}>
                  {/* Colonne gauche: groupes */}
                  <div className="w-64">
                    <ScrollArea className="h-[var(--panel-h)]">
                      {CATEGORY_GROUPS.map((g) => {
                        const cState = groupCheckState(g.id);
                        const active = activeGroup === g.id;
                        const children = (g.children ?? [{ id: g.id, name: g.name }]);
                        const selectedCount = children.filter(c => selectedCategories.includes(c.name)).length;
                        const tint = CAT_GROUP_TINT[g.id] ?? "hsl(221 83% 53%)";

                        return (
                          <div
                            key={g.id} role="button" tabIndex={0}
                            className={`menu-item tinted flex items-center gap-2 py-2 px-2 rounded-lg cursor-pointer ${active ? "tinted-active" : ""}`}
                            style={{ ["--tint" as any]: tint, borderLeftWidth: "3px", borderColor: "transparent" }}
                            onClick={() => setActiveGroup(g.id)}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveGroup(g.id); } }}
                          >
                            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                              <Checkbox checked={cState} onCheckedChange={() => toggleGroupLocal(g.id)} />
                            </div>
                            <span className="text-sm font-medium truncate">{g.name}</span>
                            <span className="ml-auto text-xs text-muted-foreground">{children.length}</span>
                            {selectedCount > 0 && (
                              <span
                                className="ml-2 text-[11px] px-1.5 py-0.5 rounded-full border"
                                style={{ background:"color-mix(in oklab, var(--tint) 12%, transparent)", borderColor:"color-mix(in oklab, var(--tint) 42%, transparent)" }}
                              >
                                {selectedCount}
                              </span>
                            )}
                            <ChevronRight className="ml-1 h-4 w-4 opacity-70" />
                          </div>
                        );
                      })}
                    </ScrollArea>
                  </div>

                  {/* Colonne droite: sous-métiers */}
                  <div className="flex-1">
                    <ScrollArea className="h-[var(--panel-h)] px-2 py-2">
                      {(CATEGORY_GROUPS.find(g => g.id === activeGroup)?.children
                        ?? [{ id: activeGroup, name: CATEGORY_GROUPS.find(g => g.id === activeGroup)?.name ?? activeGroup }])
                        .filter(c => categoryQuery ? c.name.toLowerCase().includes(categoryQuery.toLowerCase()) : true)
                        .map((cat) => (
                          <Label
                            key={cat.id}
                            className="menu-item flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer tinted hover:shadow-[var(--glow-weak)]"
                            style={{ ["--tint" as any]: CAT_GROUP_TINT[activeGroup] ?? "hsla(0, 97%, 59%, 1.00)" }}
                          >
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
                            <span className="text-sm truncate">{cat.name}</span>
                          </Label>
                        ))}
                    </ScrollArea>
                  </div>
                </div>
              </FilterPanel>
            </PopoverContent>
          </Popover>

          {/* === Localisation === */}
          <Popover open={openLocation} onOpenChange={(o) => { setOpenLocation(o); if (o) setCountryQuery(""); }}>
            <PopoverTrigger asChild>
              <Button
                variant="outline" role="combobox"
                className="h-11 rounded-full px-4 pill-btn"
                style={{ ["--tint" as any]: "hsl(27 96% 71%)" }}
                aria-expanded={openLocation}
              >
                <span className={`flex-1 text-left truncate ${selectedCountries.length === 0 ? "text-muted-foreground" : ""}`}>
                  {selectedCountries.length > 0 ? `${selectedCountries.length} localisation(s)` : "Localisation"}
                </span>
                <ChevronRight className={`ml-1 h-4 w-4 transition-transform ${openLocation ? "rotate-90" : ""}`} />
              </Button>
            </PopoverTrigger>

            <PopoverContent sideOffset={8} className="w-[600px] max-h-[80vh] overflow-auto p-0 pop-anim neon-dropdown">
              <FilterPanel
                title="Localisation"
                tint="hsl(27 96% 71%)"
                onClear={() => apply({ countries: [] })}
                onClose={() => setOpenLocation(false)}
              >
                <div className="flex divide-x divide-border/60" style={{ ["--panel-h" as any]: "320px" }}>
                  {/* Continents */}
                  <div className="w-64">
                    <ScrollArea className="h-[var(--panel-h)]">
                      {CONTINENTS.map((c) => {
                        const cState = continentCheckState(c.countries);
                        const active = activeContinent === c.id;
                        const selectedCount = c.countries.filter((co) => selectedCountries.includes(co)).length;
                        const tint = CONT_TINT[c.id] || "hsl(0 0% 68%)";

                        return (
                          <div
                            key={c.id} role="button" tabIndex={0}
                            className={`menu-item tinted flex items-center gap-2 py-2 px-2 rounded-lg cursor-pointer ${active ? "tinted-active" : ""}`}
                            style={{ ["--tint" as any]: tint, borderLeftWidth: "3px", borderColor: "transparent" }}
                            onClick={() => setActiveContinent(c.id)}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveContinent(c.id); } }}
                          >
                            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                              <Checkbox checked={cState} onCheckedChange={() => toggleContinent(c.countries)} />
                            </div>
                            <span className="text-sm font-medium truncate">{c.name}</span>
                            {selectedCount > 0 && (
                              <span
                                className="ml-1 text-[11px] px-1.5 py-0.5 rounded-full border"
                                style={{ background:"color-mix(in oklab, var(--tint) 12%, transparent)", borderColor:"color-mix(in oklab, var(--tint) 42%, transparent)" }}
                              >
                                {selectedCount}/{c.countries.length}
                              </span>
                            )}
                            <ChevronRight className="ml-auto h-4 w-4 opacity-60" />
                          </div>
                        );
                      })}
                    </ScrollArea>
                  </div>

                  {/* Pays */}
                  <div className="flex-1">
                    <ScrollArea className="h-[var(--panel-h)] px-2 py-2">
                      {CONTINENTS.find((c) => c.id === activeContinent)?.countries
                        .map((iso) => ({ iso, name: countryLabel(iso) }))
                        .filter(({ name, iso }) => (countryQuery ? (name + iso).toLowerCase().includes(countryQuery.toLowerCase()) : true))
                        .sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base", numeric: true }))
                        .map(({ iso, name }) => (
                          <Label
                            key={iso}
                            className="menu-item flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer tinted hover:shadow-[var(--glow-weak)]"
                            style={{ ["--tint" as any]: CONT_TINT[activeContinent] || "hsl(0 0% 68%)" }}
                          >
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
                            <span className="text-sm truncate">{name}</span>
                            <span className="ml-auto text-xs text-muted-foreground">{iso}</span>
                          </Label>
                        ))}
                    </ScrollArea>
                  </div>
                </div>
              </FilterPanel>
            </PopoverContent>
          </Popover>

          {/* === Contrats (sans Effacer/Fermer) === */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline" role="combobox"
                className="h-11 rounded-full px-4 pill-btn"
                style={{ ["--tint" as any]: "hsl(330 81% 72%)" }}
              >
                <span className={`flex-1 text-left truncate ${selectedContractTypes.length === 0 ? "text-muted-foreground" : ""}`}>
                  {selectedContractTypes.length > 0 ? `${selectedContractTypes.length} contrat(s)` : "Type de contrat"}
                </span>
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent sideOffset={8} className="w-[240px] max-h-[80vh] overflow-auto p-0 pop-anim neon-dropdown">
              <FilterPanel title="Type de contrat" tint="hsl(330 81% 72%)">
                <ScrollArea className="max-h-[320px] px-2 py-2">
                  {CONTRACT_TYPE_LIST.map((contract) => (
                    <Label
                      key={contract.id}
                      className="menu-item flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer tinted"
                      style={{ ["--tint" as any]: "hsl(330 81% 72%)" }}
                    >
                      <Checkbox
                        checked={selectedContractTypes.includes(contract.id)}
                        onCheckedChange={() => toggleSelection(setSelectedContractTypes, contract.id)}
                      />
                      <span className="text-sm truncate">{contract.name}</span>
                    </Label>
                  ))}
                </ScrollArea>
              </FilterPanel>
            </PopoverContent>
          </Popover>

          {/* Actions */}
          <Button type="submit" className="h-11 rounded-xl px-5 btn">Rechercher</Button>
          <Button
            type="button" variant="ghost" size="icon"
            className="h-11 w-11 rounded-xl text-muted-foreground hover:text-accent"
            onClick={resetFilters} title="Réinitialiser les filtres"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Chips */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {keyword && keyword.trim().length > 0 && (
            <Chip label={`Mot-clé: ${keyword}`} onRemove={() => apply({ keyword: "" })} variant="keyword" />
          )}
          {selectedBanks.map((id) => (
            <Chip key={`bank-${id}`} label={`Banque: ${bankName(id)}`} onRemove={() => apply({ banks: selectedBanks.filter((b) => b !== id) })} variant="bank" />
          ))}
          {selectedCategories.map((name) => (
            <Chip key={`cat-${name}`} label={`Métier: ${name}`} onRemove={() => apply({ categories: selectedCategories.filter((c) => c !== name) })} variant="category" />
          ))}
          {selectedContractTypes.map((id) => (
            <Chip key={`ct-${id}`} label={`Contrat: ${contractName(id)}`} onRemove={() => apply({ contractTypes: selectedContractTypes.filter((ct) => ct !== id) })} variant="contract" />
          ))}
          {selectedCountries.map((iso) => (
            <Chip key={`country-${iso}`} label={`Pays: ${countryLabel(iso)}`} onRemove={() => apply({ countries: selectedCountries.filter((c) => c !== iso) })} variant="country" />
          ))}
        </div>
      )}
    </form>
  );
}

/* ===== Panneau générique ===== */
function FilterPanel({
  title, tint, onClear, onClose, children,
}: { title: string; tint: string; onClear?: () => void; onClose?: () => void; children: React.ReactNode; }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-[0_30px_120px_-40px_rgba(187,154,247,.25)]">
      {/* Bandeau */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-3 py-2 border-b border-border/60 backdrop-blur supports-[backdrop-filter]:backdrop-blur-md"
        style={{ background: `linear-gradient(0deg, color-mix(in oklab, ${tint} 16%, transparent), color-mix(in oklab, ${tint} 8%, transparent))` }}
      >
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full border"
                style={{ background:`color-mix(in oklab, ${tint} 70%, transparent)`, borderColor:`color-mix(in oklab, ${tint} 60%, transparent)` }} />
          <span className="text-sm font-semibold">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {onClear && (
            <Button type="button" variant="ghost" onClick={onClear} className="h-8 rounded-lg btn-ghost-anim">
              Effacer
            </Button>
          )}
          {onClose && (
            <Button type="button" variant="ghost" onClick={onClose} className="h-8 rounded-lg btn-ghost-anim">
              Fermer
            </Button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

/* ===== Chip colorée ===== */
function Chip({ label, onRemove, variant }:{
  label: string; onRemove: () => void;
  variant: "bank" | "category" | "contract" | "country" | "keyword";
}) {
  const tint =
    variant === "bank" ? "hsl(259 94% 75%)" :
    variant === "category" ? "hsl(221 83% 53%)" :
    variant === "contract" ? "hsl(330 81% 72%)" :
    variant === "country" ? "hsl(27 96% 71%)" :
    "hsl(199 89% 70%)";

  return (
    <span
      className="inline-flex items-center gap-1.5 h-8 rounded-full border px-3 text-sm transition chip"
      style={{
        ["--tint" as any]: tint,
        borderColor: "color-mix(in oklab, var(--tint) 50%, var(--color-border))",
        background: "color-mix(in oklab, var(--tint) 12%, transparent)",
      }}
    >
      <span className="truncate max-w-[240px]">{label}</span>
      <button
        type="button" onClick={onRemove}
        className="ml-0.5 grid place-items-center rounded-full p-0.5 chip-x"
        aria-label={`Supprimer ${label}`} title="Supprimer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </span>
  );
}

/* ===== Styles (hover / anim boutons / var hauteur) ===== */
function StyleBoost() {
  return (
    <style jsx global>{`
      .pill-btn {
        transition: transform .16s ease, box-shadow .22s ease, border-color .18s ease, background .18s ease;
        border-color: var(--color-border);
        background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.02));
      }
      .pill-btn:hover,
      .pill-btn[aria-expanded="true"] {
        transform: translateY(-1px);
        border-color: color-mix(in oklab, var(--tint, hsl(var(--primary))) 48%, var(--color-border));
        background: color-mix(in oklab, var(--tint, hsl(var(--primary))) 16%, transparent);
        box-shadow: 0 8px 24px -16px rgba(0,0,0,.35), 0 0 0 2px color-mix(in oklab, var(--tint, hsl(var(--primary))) 38%, transparent) inset;
      }
      .pill-btn:focus-visible {
        outline: none;
        box-shadow: 0 0 0 2px color-mix(in oklab, var(--tint, hsl(var(--primary))) 50%, transparent) inset,
                    0 0 0 3px color-mix(in oklab, var(--tint, hsl(var(--primary))) 28%, transparent);
      }

      .menu-item { transition: background .16s ease, border-color .16s ease, transform .12s ease, box-shadow .2s ease; }
      .menu-row:hover, .menu-item:hover { transform: translateY(-1px); box-shadow: 0 10px 28px -20px rgba(0,0,0,.35); }
      .menu-row.is-active { background: color-mix(in oklab, hsl(221 83% 53%) 18%, transparent); }

      .tinted:hover { background: color-mix(in oklab, var(--tint) 18%, transparent); }
      .tinted-active { background: color-mix(in oklab, var(--tint) 22%, transparent); border-left-color: var(--tint) !important; }

      .chip { color: color-mix(in oklab, var(--tint) 65%, var(--color-foreground)); }
      .chip-x { color: color-mix(in oklab, var(--tint) 65%, var(--color-foreground)); }
      .chip-x:hover { background: color-mix(in oklab, var(--tint) 18%, transparent); color: color-mix(in oklab, var(--tint) 85%, white); }

      .neon-dropdown { box-shadow: 0 30px 120px -40px rgba(187,154,247,.25); }
      .neon-dropdown, .neon-dropdown * { scrollbar-width: thin; }
      .neon-dropdown { scrollbar-color: color-mix(in oklab, hsl(223 10% 60%) 70%, transparent) transparent; }
      .neon-dropdown *::-webkit-scrollbar { width: 10px; height: 10px; }
      .neon-dropdown *::-webkit-scrollbar-thumb {
        background: color-mix(in oklab, hsl(223 10% 60%) 70%, transparent);
        border-radius: 8px; border: 2px solid transparent; background-clip: content-box;
      }
      .neon-dropdown *::-webkit-scrollbar-track { background: transparent; }

      /* Anim légère sur Effacer / Fermer */
      .btn-ghost-anim { position: relative; transition: transform .14s ease, color .14s ease; }
      .btn-ghost-anim::after{
        content:""; position:absolute; left:.6rem; right:.6rem; bottom:.35rem; height:2px;
        background: linear-gradient(90deg, var(--color-secondary), var(--color-primary));
        opacity:0; transform: translateY(4px); transition: .18s ease; border-radius:9999px;
      }
      .btn-ghost-anim:hover{ transform: translateY(-1px); }
      .btn-ghost-anim:hover::after{ opacity:.95; transform: translateY(0); }

      /* Light mode tweaks */
      :root[data-theme="light"] .pill-btn:hover,
      :root[data-theme="light"] .pill-btn[aria-expanded="true"]{
        transform: translateY(-1px);
        border-color: color-mix(in oklab, var(--tint, hsl(var(--primary))) 48%, var(--color-border));
        background: color-mix(in oklab, var(--tint, hsl(var(--primary))) 16%, transparent);
        box-shadow: 0 8px 24px -16px rgba(0,0,0,.20), 0 0 0 2px color-mix(in oklab, var(--tint, hsl(var(--primary))) 38%, transparent) inset;
      }
      :root[data-theme="light"] .tinted:hover{ background: color-mix(in oklab, var(--tint) 18%, transparent); }
      :root[data-theme="light"] .tinted-active{
        background: color-mix(in oklab, var(--tint) 22%, transparent); border-left-color: var(--tint) !important;
      }
      :root[data-theme="light"] .pill-btn:focus-visible{
        outline: none;
        box-shadow: 0 0 0 2px color-mix(in oklab, var(--tint, hsl(var(--primary))) 50%, transparent) inset,
                    0 0 0 3px color-mix(in oklab, var(--tint, hsl(var(--primary))) 24%, transparent);
      }
    `}</style>
  );
}
