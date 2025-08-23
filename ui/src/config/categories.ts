// Nouvelle structure hiérarchique : groupes + feuilles alignées sur RULE_BASED_CLASSIFICATION
// Chaque "name" de feuille correspond EXACTEMENT à une catégorie renvoyée par le classifier.

export type CategoryLeaf = { id: string; name: string };
export type CategoryGroup = { id: string; name: string; children?: CategoryLeaf[] };

// Export principal
export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: "markets",
    name: "Markets",
    children: [
      { id: "markets-sales", name: "Markets — Sales" },
      { id: "markets-structuring", name: "Markets — Structuring" },
      { id: "markets-trading", name: "Markets — Trading" },
      { id: "markets-research", name: "Markets — Research & Strategy" },
    ],
  },
  {
    id: "ib",
    name: "Investment Banking",
    // Le classifier regroupe ECM/DCM/Syndicate/LevFin dans "Corporate Banking / Coverage"
    // On l'utilise comme feuille effective côté backend.
    children: [{ id: "coverage", name: "Corporate Banking / Coverage" }],
  },
  {
    id: "wm-buyside",
    name: "Buy Side / WM",
    children: [
      { id: "asset-mgt", name: "Asset Management / Buy Side" },
      { id: "wealth-mgt", name: "Wealth Management / Private Banking" },
      { id: "re", name: "Real Estate / Investing" },
    ],
  },
  {
    id: "operations",
    name: "Operations",
    children: [
      { id: "ops-mo", name: "Operations — Middle Office" },
      { id: "ops-ta", name: "Operations — Fund Admin / TA" },
      { id: "ops-bo", name: "Operations — Back Office / Settlement" },
    ],
  },
  {
    id: "risk-compliance",
    name: "Risk / Compliance",
    children: [
      { id: "risk-mkt", name: "Risk — Market" },
      { id: "risk-credit", name: "Risk — Credit" },
      { id: "risk-op", name: "Risk — Operational" },
      { id: "risk-model", name: "Risk — Model Risk & Validation" },
      { id: "compliance", name: "Compliance / Financial Crime (AML/KYC)" },
    ],
  },
  {
    id: "it",
    name: "IT / Tech",
    children: [{ id: "it-eng", name: "IT / Engineering" }],
  },
  {
    id: "data-quant",
    name: "Data / Quant",
    children: [{ id: "data-quant-leaf", name: "Data / Quant" }],
  },
  {
    id: "product-biz",
    name: "Project / Business Management",
    children: [{ id: "pmo-ba", name: "Product / Project / PMO / Business Analysis" }],
  },
  {
    id: "strategy",
    name: "Strategy / Consulting / Transformation",
    children: [{ id: "strategy-leaf", name: "Strategy / Consulting / Transformation" }],
  },
  {
    id: "design-mktg",
    name: "Design / Marketing / Comms",
    children: [{ id: "design-leaf", name: "Design / Marketing / Comms" }],
  },
  {
    id: "hr",
    name: "HR / Ressources Humaines",
    children: [{ id: "hr-leaf", name: "HR / People" }],
  },
  {
    id: "retail",
    name: "Retail Banking / Clientèle",
    children: [{ id: "retail-leaf", name: "Retail Banking / Branch" }],
  },
  {
    id: "treasury",
    name: "Treasury / ALM",
    children: [{ id: "alm", name: "Treasury / ALM / Liquidity" }],
  },
  {
    id: "legal",
    name: "Legal / Juridique",
    children: [{ id: "legal-leaf", name: "Legal / Juridique" }],
  },
];

// Pour compat ascendante : liste "plate" des feuilles (utile si besoin ponctuel)
export const CATEGORY_LEAVES: CategoryLeaf[] = CATEGORY_GROUPS.flatMap(g =>
  g.children && g.children.length ? g.children : [{ id: g.id, name: g.name }]
);
