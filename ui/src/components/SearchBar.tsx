"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  ChevronRight,
  X,
  Building2,
  Briefcase,
  Globe,
  FileJson,
  Command,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { BANKS_LIST } from "@/config/banks";
import { CATEGORY_GROUPS, CATEGORY_LEAVES } from "@/config/categories";
import { CONTRACT_TYPE_LIST } from "@/config/contractTypes";
import BankAvatar from "@/components/BankAvatar"; // ⬅️ nouveau import

/* ==================================================================================
   CONSTANTES
   ================================================================================== */

const COUNTRY_LABELS: Record<string, string> = {
  AE: "Émirats",
  AR: "Argentine",
  AT: "Autriche",
  AU: "Australie",
  BD: "Bangladesh",
  BE: "Belgique",
  BG: "Bulgarie",
  BH: "Bahreïn",
  BM: "Bermudes",
  BR: "Brésil",
  BY: "Biélorussie",
  CA: "Canada",
  CD: "RDC",
  CH: "Suisse",
  CL: "Chili",
  CN: "Chine",
  CO: "Colombie",
  CR: "Costa Rica",
  CU: "Cuba",
  CZ: "Tchéquie",
  DE: "Allemagne",
  DK: "Danemark",
  DZ: "Algérie",
  EE: "Estonie",
  EG: "Égypte",
  ES: "Espagne",
  FI: "Finlande",
  FR: "France",
  GB: "Royaume-Uni",
  GR: "Grèce",
  HK: "Hong Kong",
  HN: "Honduras",
  HR: "Croatie",
  HU: "Hongrie",
  ID: "Indonésie",
  IE: "Irlande",
  IL: "Israël",
  IM: "Île de Man",
  IN: "Inde",
  IS: "Islande",
  IT: "Italie",
  JE: "Jersey",
  JP: "Japon",
  KE: "Kenya",
  KR: "Corée du Sud",
  KW: "Koweït",
  KZ: "Kazakhstan",
  LK: "Sri Lanka",
  LT: "Lituanie",
  LU: "Luxembourg",
  LV: "Lettonie",
  MA: "Maroc",
  MO: "Macao",
  MX: "Mexique",
  MY: "Malaisie",
  MU: "Maurice",
  NG: "Nigéria",
  NL: "Pays-Bas",
  NO: "Norvège",
  NZ: "Nouvelle-Zélande",
  OM: "Oman",
  PE: "Pérou",
  PH: "Philippines",
  PK: "Pakistan",
  PL: "Pologne",
  PT: "Portugal",
  QA: "Qatar",
  RO: "Roumanie",
  RS: "Serbie",
  RU: "Russie",
  SA: "Arabie saoudite",
  SE: "Suède",
  SG: "Singapour",
  SI: "Slovénie",
  SK: "Slovaquie",
  TH: "Thaïlande",
  TR: "Turquie",
  TW: "Taïwan",
  UA: "Ukraine",
  UY: "Uruguay",
  US: "États-Unis",
  VE: "Venezuela",
  VN: "Vietnam",
  ZA: "Afrique du Sud",
};

const CONTINENTS = [
  {
    id: "europe",
    name: "Europe",
    countries: [
      "FR",
      "GB",
      "IE",
      "ES",
      "PT",
      "IT",
      "DE",
      "AT",
      "CH",
      "BE",
      "NL",
      "LU",
      "DK",
      "NO",
      "SE",
      "FI",
      "PL",
      "CZ",
      "SK",
      "HU",
      "RO",
      "BG",
      "GR",
      "HR",
      "SI",
      "LT",
      "LV",
      "EE",
      "IS",
      "RS",
      "JE",
      "IM",
    ],
  },
  { id: "north-america", name: "Amérique du N.", countries: ["US", "CA", "MX", "BM", "CR", "CU", "HN"] },
  { id: "south-america", name: "Amérique du S.", countries: ["AR", "BR", "CL", "CO", "PE", "UY", "VE"] },
  {
    id: "asia",
    name: "Asie",
    countries: [
      "AE",
      "QA",
      "SA",
      "TR",
      "IL",
      "IN",
      "LK",
      "VN",
      "TH",
      "SG",
      "MY",
      "ID",
      "PH",
      "HK",
      "KR",
      "JP",
      "CN",
      "TW",
      "KZ",
      "KW",
      "BD",
    ],
  },
  { id: "africa", name: "Afrique", countries: ["DZ", "MA", "EG", "NG", "ZA", "CD", "MU"] },
  { id: "oceania", name: "Océanie", countries: ["AU", "NZ"] },
];

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
  broker: "Brokers",
  idb: "Interdealer Brokers",
  prop_mm: "Prop Trading",
  buy_side: "Buy Side",
  private_bank: "Private Banking",
  exchange: "Exchanges",
  trading_house: "Trading Houses",
  corporate: "Corporate",
  insurer: "Assurances",
  vendor: "Vendors / Tech",
  agency: "Agences",
  shipbroker: "Shipbrokers",
  other: "Autres",
};

type BankItem = { id: string; name: string; orgType?: string };

const GUESSERS: Array<[RegExp, string]> = [
  [/\b(tp\s?icap|bgc|gfi)\b/i, "idb"],
  [/\b(optiver|imc|susquehanna|jane\s*street|flow\s*traders)\b/i, "prop_mm"],
  [/\b(marex|stifel|kepler|kepler\s*cheuvreux)\b/i, "broker"],
  [/\b(blackrock|amundi|pimco|wellington|dnca|lfde|sycomore|fidelity|axa\s*im)\b/i, "buy_side"],
  [/\b(pictet|lombard\s*odier|mirabaud|julius\s*baer|vontobel|edmond\s*de\s*rothschild)\b/i, "private_bank"],
  [/\b(euronext|lseg|six|cme)\b/i, "exchange"],
  [/\b(bloomberg|murex)\b/i, "vendor"],
  [
    /\b(trafigura|vitol|glencore|gunvor|mercuria|mabanaft|louis\s*dreyfus|ldc|cargill|bunge|shell|edf|engie|total)\b/i,
    "trading_house",
  ],
  [/\b(ag2r|generali|scor)\b/i, "insurer"],
  [/\b(air\s*liquide|airbus|lvmh|sanofi)\b/i, "corporate"],
];

const inferOrgType = (b: BankItem): string => {
  if (b.orgType) return b.orgType;
  const hay = `${b.id} ${b.name}`;
  for (const [re, t] of GUESSERS) {
    if (re.test(hay)) return t;
  }
  return "banks";
};

const BANKS_BY_ORG: Record<string, { id: string; name: string }[]> = {};
(BANKS_LIST as BankItem[]).forEach((b) => {
  const t = inferOrgType(b);
  (BANKS_BY_ORG[t] ||= []).push({ id: b.id, name: b.name });
});
Object.values(BANKS_BY_ORG).forEach((arr) =>
  arr.sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" })),
);

type Suggest = { type: "title" | "bank" | "category"; label: string; id?: string };

/* ==================================================================================
   COMPONENT
   ================================================================================== */

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [keyword, setKeyword] = useState(searchParams.get("keyword") || "");
  const [selectedBanks, setSelectedBanks] = useState<string[]>(searchParams.getAll("bank"));
  const [selectedCategories, setSelectedCategories] = useState<string[]>(searchParams.getAll("category"));
  const [selectedContractTypes, setSelectedContractTypes] = useState<string[]>(searchParams.getAll("contractType"));
  const [selectedCountries, setSelectedCountries] = useState<string[]>(searchParams.getAll("country"));

  const toggleSelection = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setter((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

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

    router.push(`/offers?${params.toString()}`);

    if (next?.keyword !== undefined) setKeyword(next.keyword);
    if (next?.banks) setSelectedBanks(next.banks);
    if (next?.categories) setSelectedCategories(next.categories);
    if (next?.contractTypes) setSelectedContractTypes(next.contractTypes);
    if (next?.countries) setSelectedCountries(next.countries);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    apply({});
  };

  const resetFilters = () => {
    setKeyword("");
    setSelectedBanks([]);
    setSelectedCategories([]);
    setSelectedContractTypes([]);
    setSelectedCountries([]);
    apply({ keyword: "", banks: [], categories: [], contractTypes: [], countries: [] });
  };

  /* Suggestions ------------------------------------------------------------------ */

  const [openSuggest, setOpenSuggest] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggest[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!keyword || keyword.trim().length < 2) {
      setSuggestions([]);
      setOpenSuggest(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ keyword, limit: "6" });
        const res = await fetch(`/api/jobs?${params.toString()}`);
        const jobs = await res.json();

        const titles: Suggest[] = Array.from(
          new Set(jobs.map((j: any) => j.title).filter(Boolean)),
        )
          .slice(0, 4)
          .map((t) => ({ type: "title", label: t as string }));

        const banks: Suggest[] = (BANKS_LIST as BankItem[])
          .filter((b) => b.name.toLowerCase().includes(keyword.toLowerCase()))
          .slice(0, 3)
          .map((b) => ({ type: "bank", label: b.name, id: b.id }));

        const cats: Suggest[] = CATEGORY_LEAVES
          .filter((c) => c.name.toLowerCase().includes(keyword.toLowerCase()))
          .slice(0, 3)
          .map((c) => ({ type: "category", label: c.name }));

        const merged = [...titles, ...banks, ...cats];
        setSuggestions(merged);
        setActiveIdx(0);
        setOpenSuggest(merged.length > 0);
      } catch {
        // ignore suggestions errors
      }
    }, 200);
  }, [keyword]);

  /* Popover states ---------------------------------------------------------------- */

  const [openBanks, setOpenBanks] = useState(false);
  const [activeOrg, setActiveOrg] = useState<string>(ORG_TYPE_ORDER[0]);
  const [openCategories, setOpenCategories] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string>(CATEGORY_GROUPS[0]?.id ?? "markets");
  const [openLocation, setOpenLocation] = useState(false);
  const [activeContinent, setActiveContinent] = useState<string>(CONTINENTS[0]?.id ?? "europe");
  const [openContractTypes, setOpenContractTypes] = useState(false);

  /* ==================================================================================
     RENDER
     ================================================================================== */

  return (
    <form onSubmit={handleSearch} className="w-full space-y-4">
      {/* 1. BARRE DE RECHERCHE + CTA DROITE */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col md:flex-row items-stretch gap-3"
      >
        {/* Search input + suggestions */}
        <div className="relative flex-1 group">
          <div className="relative flex items-center bg-card/95 border border-input rounded-2xl transition-all focus-within:border-primary">
            <div className="pl-4 text-muted-foreground group-focus-within:text-primary transition-colors">
              <Search className="h-5 w-5" />
            </div>

            <Input
              type="text"
              placeholder="Recherche (M&A, Analyst, Python…)"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setOpenSuggest(true);
              }}
              className="flex-1 h-12 bg-transparent border-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 focus:ring-offset-0 shadow-none px-3"
              onKeyDown={(e) => {
                if (!openSuggest || suggestions.length === 0) return;

                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActiveIdx((i) => (i + 1) % suggestions.length);
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActiveIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  const s = suggestions[activeIdx];
                  if (!s) return;

                  if (s.type === "title") {
                    apply({ keyword: s.label });
                  } else if (s.type === "bank" && s.id) {
                    apply({ banks: [...selectedBanks, s.id] });
                  } else if (s.type === "category") {
                    apply({ categories: [...selectedCategories, s.label] });
                  }

                  setOpenSuggest(false);
                }
              }}
              onBlur={() => {
                setTimeout(() => setOpenSuggest(false), 120);
              }}
              onFocus={() => {
                if (suggestions.length > 0) setOpenSuggest(true);
              }}
            />

            {/* Hint clavier */}
            <div className="hidden sm:flex items-center gap-1 pr-4 pl-3 border-l border-border/70 text-[11px] text-muted-foreground/80">
              <Command className="w-3.5 h-3.5" />
              <span className="font-mono">K</span>
            </div>
          </div>

          {/* Suggestions dropdown */}
          <AnimatePresence>
            {openSuggest && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.16 }}
                className="absolute top-[105%] left-0 right-0 z-30 bg-popover/95 border border-border rounded-2xl shadow-2xl shadow-black/20 backdrop-blur-xl overflow-hidden"
              >
                <div className="px-3 pt-2 pb-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground/70 font-mono">
                  Suggestions
                </div>

                <ul className="max-h-72 overflow-y-auto custom-scroll">
                  {suggestions.map((s, idx) => (
                    <li
                      key={`${s.type}-${s.label}-${s.id ?? "x"}`}
                      className={`flex items-center gap-2 px-4 py-2.5 cursor-pointer text-sm transition-colors ${
                        idx === activeIdx
                          ? "bg-primary/10 text-foreground"
                          : "hover:bg-muted/70 text-muted-foreground"
                      }`}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        if (s.type === "title") {
                          apply({ keyword: s.label });
                        } else if (s.type === "bank" && s.id) {
                          apply({ banks: [...selectedBanks, s.id] });
                        } else if (s.type === "category") {
                          apply({ categories: [...selectedCategories, s.label] });
                        }
                        setOpenSuggest(false);
                      }}
                    >
                      <span
                        className={`inline-flex items-center justify-center h-5 min-w-[1.3rem] rounded-full text-[10px] font-mono ${
                          s.type === "title"
                            ? "bg-sky-500/15 text-sky-500"
                            : s.type === "bank"
                            ? "bg-purple-500/15 text-purple-400"
                            : "bg-emerald-500/15 text-emerald-400"
                        }`}
                      >
                        {s.type === "title" ? "JOB" : s.type === "bank" ? "BANK" : "TAG"}
                      </span>
                      <span className="truncate">{s.label}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* CTA + Reset */}
        <div className="flex items-center gap-3 justify-end">
          <motion.button
            type="submit"
            whileHover={{ scale: 1.02, translateY: -1 }}
            whileTap={{ scale: 0.97, translateY: 0 }}
            className="h-12 px-5 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30 border border-blue-700/50 flex items-center gap-2 transition-all"
          >
            <Search className="w-4 h-4" />
            <span>Explorer les offres</span>
          </motion.button>

          {(keyword ||
            selectedBanks.length ||
            selectedCategories.length ||
            selectedContractTypes.length ||
            selectedCountries.length) && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={resetFilters}
              className="h-12 w-12 flex items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive transition-colors shadow-sm"
            >
              <X className="w-5 h-5" />
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* 2. PILLS DE FILTRES */}
      <div className="flex flex-wrap items-center gap-3">
        {/* BANQUES */}
        <Popover open={openBanks} onOpenChange={setOpenBanks}>
          <PopoverTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              className={`group relative flex items-center gap-2 h-9 px-4 rounded-full text-xs font-semibold border transition-all duration-200 ${
                selectedBanks.length
                  ? "bg-purple-100 border-purple-200 text-purple-700 dark:bg-purple-500/10 dark:border-purple-500/30 dark:text-purple-300"
                  : "bg-card border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground hover:shadow-sm"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{selectedBanks.length ? `${selectedBanks.length} Banques` : "Institution"}</span>
              <ChevronRight
                className={`w-3 h-3 transition-transform duration-200 ${
                  openBanks ? "rotate-90" : "opacity-50"
                }`}
              />
            </motion.button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-[600px] p-0 bg-popover border-border text-foreground rounded-xl shadow-2xl"
          >
            <div className="flex h-[320px]">
              <div className="w-48 border-r border-border p-2 overflow-y-auto custom-scroll bg-muted/30">
                {ORG_TYPE_ORDER.filter((t) => (BANKS_BY_ORG[t] || []).length).map((t) => (
                  <div
                    key={t}
                    onClick={() => setActiveOrg(t)}
                    className={`px-3 py-2 text-xs font-medium rounded-md cursor-pointer transition-colors mb-1 flex justify-between items-center ${
                      activeOrg === t
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    {ORG_LABELS[t]}
                    <span className="opacity-60 text-[10px]">{(BANKS_BY_ORG[t] || []).length}</span>
                  </div>
                ))}
              </div>
              <div className="flex-1 p-2 overflow-y-auto custom-scroll">
                {(BANKS_BY_ORG[activeOrg] || []).map((b) => (
                  <label
                    key={b.id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-muted rounded-md cursor-pointer group transition-colors"
                  >
                    <Checkbox
                      checked={selectedBanks.includes(b.id)}
                      onCheckedChange={() => toggleSelection(setSelectedBanks, b.id)}
                      className="border-muted-foreground data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                    />
                    {/* ✅ logo de la banque */}
                    <BankAvatar
                      bankId={b.id}
                      name={b.name}
                      size={22}
                      className="flex-shrink-0"
                    />
                    <span className="text-sm font-medium text-foreground">{b.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* MÉTIERS */}
        <Popover open={openCategories} onOpenChange={setOpenCategories}>
          <PopoverTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              className={`group relative flex items-center gap-2 h-9 px-4 rounded-full text-xs font-semibold border transition-all duration-200 ${
                selectedCategories.length
                  ? "bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300"
                  : "bg-card border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground hover:shadow-sm"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>{selectedCategories.length ? `${selectedCategories.length} Métiers` : "Expertise"}</span>
              <ChevronRight
                className={`w-3 h-3 transition-transform duration-200 ${
                  openCategories ? "rotate-90" : "opacity-50"
                }`}
              />
            </motion.button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-[600px] p-0 bg-popover border-border text-foreground rounded-xl shadow-2xl"
          >
            <div className="flex h-[320px]">
              <div className="w-56 border-r border-border p-2 overflow-y-auto custom-scroll bg-muted/30">
                {CATEGORY_GROUPS.map((g) => (
                  <div
                    key={g.id}
                    onClick={() => setActiveGroup(g.id)}
                    className={`px-3 py-2 text-xs font-medium rounded-md cursor-pointer transition-colors mb-1 ${
                      activeGroup === g.id
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    {g.name}
                  </div>
                ))}
              </div>
              <div className="flex-1 p-2 overflow-y-auto custom-scroll">
                {(CATEGORY_GROUPS.find((g) => g.id === activeGroup)?.children ??
                  [{ id: activeGroup, name: activeGroup }]).map((c: any) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-muted rounded-md cursor-pointer group"
                  >
                    <Checkbox
                      checked={selectedCategories.includes(c.name)}
                      onCheckedChange={() =>
                        setSelectedCategories((prev) =>
                          prev.includes(c.name) ? prev.filter((x) => x !== c.name) : [...prev, c.name],
                        )
                      }
                      className="border-muted-foreground data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                    />
                    <span className="text-sm font-medium text-foreground">{c.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* LOCALISATION */}
        <Popover open={openLocation} onOpenChange={setOpenLocation}>
          <PopoverTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              className={`group relative flex items-center gap-2 h-9 px-4 rounded-full text-xs font-semibold border transition-all duration-200 ${
                selectedCountries.length
                  ? "bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-300"
                  : "bg-card border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground hover:shadow-sm"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{selectedCountries.length ? `${selectedCountries.length} Lieux` : "Localisation"}</span>
              <ChevronRight
                className={`w-3 h-3 transition-transform duration-200 ${
                  openLocation ? "rotate-90" : "opacity-50"
                }`}
              />
            </motion.button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-[500px] p-0 bg-popover border-border text-foreground rounded-xl shadow-2xl"
          >
            <div className="flex h-[320px]">
              <div className="w-40 border-r border-border p-2 overflow-y-auto custom-scroll bg-muted/30">
                {CONTINENTS.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setActiveContinent(c.id)}
                    className={`px-3 py-2 text-xs font-medium rounded-md cursor-pointer transition-colors mb-1 ${
                      activeContinent === c.id
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    {c.name}
                  </div>
                ))}
              </div>
              <div className="flex-1 p-2 overflow-y-auto custom-scroll">
                {CONTINENTS.find((c) => c.id === activeContinent)?.countries.map((iso) => (
                  <label
                    key={iso}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-muted rounded-md cursor-pointer group"
                  >
                    <Checkbox
                      checked={selectedCountries.includes(iso)}
                      onCheckedChange={() => toggleSelection(setSelectedCountries, iso)}
                      className="border-muted-foreground data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                    <span className="text-sm font-medium text-foreground">
                      {COUNTRY_LABELS[iso] ?? iso}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* CONTRAT */}
        <Popover open={openContractTypes} onOpenChange={setOpenContractTypes}>
          <PopoverTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              className={`group relative flex items-center gap-2 h-9 px-4 rounded-full text-xs font-semibold border transition-all duration-200 ${
                selectedContractTypes.length
                  ? "bg-orange-100 border-orange-200 text-orange-700 dark:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-300"
                  : "bg-card border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground hover:shadow-sm"
              }`}
            >
              <FileJson className="w-3.5 h-3.5" />
              <span>
                {selectedContractTypes.length ? `${selectedContractTypes.length} Contrats` : "Contrat"}
              </span>
              <ChevronRight
                className={`w-3 h-3 transition-transform duration-200 ${
                  openContractTypes ? "rotate-90" : "opacity-50"
                }`}
              />
            </motion.button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-[240px] p-2 bg-popover border-border text-foreground rounded-xl shadow-2xl"
          >
            {CONTRACT_TYPE_LIST.map((ct) => (
              <label
                key={ct.id}
                className="flex items-center gap-3 px-3 py-2 hover:bg-muted rounded-md cursor-pointer group"
              >
                <Checkbox
                  checked={selectedContractTypes.includes(ct.id)}
                  onCheckedChange={() => toggleSelection(setSelectedContractTypes, ct.id)}
                  className="border-muted-foreground data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600"
                />
                <span className="text-sm font-medium text-foreground">{ct.name}</span>
              </label>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      {/* Scrollbars custom pour les popovers */}
      <style jsx>{`
        .custom-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 10px;
        }
        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background: var(--muted-foreground);
        }
      `}</style>
    </form>
  );
}
