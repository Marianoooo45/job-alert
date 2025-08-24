// Hiérarchie épurée + extensible
// Chaque leaf `name` est un libellé cible pour le classifier.

export type CategoryLeaf = { id: string; name: string };
export type CategoryGroup = { id: string; name: string; children?: CategoryLeaf[] };

export const CATEGORY_GROUPS: CategoryGroup[] = [
  // -------- Markets (core only) --------
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

  // -------- Investment Banking (détaillé) --------
  {
    id: "ib",
    name: "Investment Banking",
    children: [
      { id: "ib-mna", name: "IB — M&A Advisory" },
      { id: "ib-ecm", name: "IB — Equity Capital Markets (ECM)" },
      { id: "ib-dcm", name: "IB — Debt Capital Markets (DCM)" },
      { id: "ib-levfin", name: "IB — Leveraged Finance" },
      { id: "ib-syndicate", name: "IB — Syndicate" },
      { id: "ib-structured", name: "IB — Structured Finance / Securitization" },
      { id: "ib-project-infra", name: "IB — Project & Infrastructure Finance" },
      { id: "ib-restructuring", name: "IB — Restructuring / Special Situations" },
      // compat amont : ancienne feuille “coverage” conservée si besoin
      { id: "coverage", name: "Corporate Banking / Coverage" },
    ],
  },

  // -------- Corporate / Transaction Banking --------
  {
    id: "corp-banking",
    name: "Corporate / Transaction Banking",
    children: [
      { id: "corp-coverage", name: "Corporate Banking — Coverage" },
      { id: "txb-cash", name: "Transaction Banking — Cash Management / Payments" },
      { id: "txb-trade", name: "Transaction Banking — Trade Finance" },
      { id: "txb-scf", name: "Transaction Banking — Working Capital & SCF" },
      { id: "txb-export", name: "Transaction Banking — Export Finance" },
    ],
  },

  // -------- Buy Side / WM / Real Assets --------
  {
    id: "buyside",
    name: "Buy Side",
    children: [
      { id: "asset-mgt", name: "Asset Management / Buy Side" },
      { id: "hedge-alt", name: "Hedge Funds / Alternatives" },
      { id: "private-equity", name: "Private Equity" },
      { id: "venture-capital", name: "Venture Capital" },
    ],
  },
  {
    id: "wealth",
    name: "Wealth / Private Banking",
    children: [
      { id: "wealth-mgt", name: "Wealth Management / Private Banking" },
      { id: "wealth-lending", name: "Wealth — Lending & Credit Advisory" },
      { id: "wealth-trust", name: "Wealth — Trust / Fiduciary / Estate Planning" },
    ],
  },
  {
    id: "real-assets",
    name: "Real Assets",
    children: [{ id: "re", name: "Real Estate / Investing" }],
  },

  // -------- Operations / Support (incl. support marchés) --------
  {
    id: "operations",
    name: "Operations / Support",
    children: [
      { id: "ops-mo", name: "Operations — Middle Office" },
      { id: "ops-markets-support", name: "Operations — Markets Support (Trade Support / Booking / Prime / Clearing)" },
      { id: "ops-ta", name: "Operations — Fund Admin / TA" },
      { id: "ops-bo", name: "Operations — Back Office / Settlement" },
      { id: "ops-refdata", name: "Operations — Referential / Static / Reference Data" },
      { id: "ops-onboarding", name: "Operations — Client Onboarding / Account Opening" },
    ],
  },

  // -------- Risk / Compliance --------
  {
    id: "risk-compliance",
    name: "Risk / Compliance",
    children: [
      { id: "risk-mkt", name: "Risk — Market" },
      { id: "risk-credit", name: "Risk — Credit" },
      { id: "risk-op", name: "Risk — Operational / NFR" },
      { id: "risk-model", name: "Risk — Model Risk & Validation" },
      { id: "risk-ccar", name: "Risk — Stress Testing / CCAR" },
      { id: "compliance", name: "Compliance / Financial Crime (AML/KYC)" },
    ],
  },

  // -------- Treasury / ALM --------
  {
    id: "treasury",
    name: "Treasury / ALM",
    children: [{ id: "alm", name: "Treasury / ALM / Liquidity" }],
  },

  // -------- IT / Tech --------
  {
    id: "it",
    name: "IT / Tech",
    children: [
      { id: "it-eng", name: "IT — Software Engineering" },
      { id: "it-cyber", name: "IT — Cybersecurity / SecOps" },
      { id: "it-platform", name: "IT — Platform / Cloud / SRE / DevOps" },
      { id: "it-enterprise", name: "IT — Enterprise Apps (SAP / Salesforce / ServiceNow)" },
      { id: "it-support", name: "IT — Application / Production Support & Helpdesk" },
      { id: "it-markets", name: "IT — Markets Tech (eTrading / Market Data)" },
    ],
  },

  // -------- Data / Quant --------
  {
    id: "data-quant",
    name: "Data / Quant",
    children: [
      { id: "dq-science", name: "Data — Data Science / ML" },
      { id: "dq-engineering", name: "Data — Data Engineering / Platform / MLOps" },
      { id: "dq-analytics", name: "Data — Analytics / BI" },
      { id: "dq-quants", name: "Quant — Research / Strats" },
    ],
  },

  // -------- Product / Project / Business --------
  {
    id: "product-biz",
    name: "Product / Project / Business Management",
    children: [
      { id: "pmo-product", name: "Product Management" },
      { id: "pmo-ba", name: "Business Analysis" },
      { id: "pmo-ppm", name: "Project / Program Management / PMO" },
      { id: "pmo-agile", name: "Agile / Scrum / Delivery" },
    ],
  },

  // -------- Strategy / Consulting --------
  {
    id: "strategy",
    name: "Strategy / Consulting / Transformation",
    children: [
      { id: "strategy-corp", name: "Corporate Strategy" },
      { id: "strategy-transform", name: "Transformation Office / Change" },
      { id: "strategy-consulting", name: "Management Consulting" },
    ],
  },

  // -------- Design / Marketing / Comms --------
  {
    id: "design-mktg",
    name: "Design / Marketing / Comms",
    children: [
      { id: "design-uxui", name: "Design — UX / UI" },
      { id: "mktg-product", name: "Product Marketing / GTM" },
      { id: "mktg-brand", name: "Brand / Comms / PR" },
      { id: "mktg-growth", name: "Performance Marketing / Growth" },
    ],
  },

  // -------- Finance control / Accounting / Audit --------
  {
    id: "finance-control",
    name: "Finance Control / Accounting / Audit",
    children: [
      { id: "pc-ipv", name: "Product Control / IPV" },
      { id: "acct-gl", name: "Accounting / GL / Consolidation" },
      { id: "fin-reporting", name: "Financial Reporting" },
      { id: "fpna", name: "FP&A / Budgeting / Planning" },
      { id: "internal-audit", name: "Internal Audit / SOX" },
    ],
  },

  // -------- HR --------
  {
    id: "hr",
    name: "HR / Ressources Humaines",
    children: [
      { id: "hr-ta", name: "HR — Talent Acquisition / Recruiting" },
      { id: "hr-hrbp", name: "HR — Business Partner / Employee Relations" },
      { id: "hr-payroll", name: "HR — Payroll / Paie" },
      { id: "hr-cnb", name: "HR — Compensation & Benefits" },
      { id: "hr-ld", name: "HR — Learning & Development" },
      { id: "hr-hris", name: "HR — HRIS / People Analytics" },
    ],
  },

  // -------- Retail Banking --------
  {
    id: "retail",
    name: "Retail Banking / Clientèle",
    children: [
      { id: "retail-branch", name: "Retail Banking — Branch / Personal Banker / Teller" },
      { id: "retail-contact", name: "Retail Banking — Contact Center / CCC" },
      { id: "retail-mortgage", name: "Retail Banking — Mortgage / Housing Loans" },
      { id: "retail-sme", name: "Retail Banking — Small Business / Pro Advisors" },
    ],
  },

  // -------- Legal --------
  {
    id: "legal",
    name: "Legal / Juridique",
    children: [
      { id: "legal-corporate", name: "Legal — Corporate / Commercial" },
      { id: "legal-co-sec", name: "Legal — Company Secretary / Domiciliation" },
      { id: "legal-privacy", name: "Legal — Privacy / Data Protection (DPO)" },
      { id: "legal-tax", name: "Legal — Tax / Fiscal" },
      { id: "legal-contracts", name: "Legal — Contracts / Procurement" },
    ],
  },

  // -------- Admin --------
  {
    id: "admin",
    name: "Administrative / Executive Assistant",
    children: [{ id: "admin-ea", name: "Administrative / Executive Assistant" }],
  },
];

export const CATEGORY_LEAVES: CategoryLeaf[] = CATEGORY_GROUPS.flatMap(g =>
  g.children && g.children.length ? g.children : [{ id: g.id, name: g.name }]
);
