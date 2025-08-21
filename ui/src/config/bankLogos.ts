// ui/src/lib/bank-logos.ts
export const BANK_LOGO_DOMAINS: Record<string, string> = {
  SG: "societegenerale.com",
  DB: "db.com",
  BNPP: "bnpparibas.com",
  CA: "credit-agricole.com",
  BPCE: "groupebpce.com",
  EDR: "edmond-de-rothschild.com",
  HSBC: "hsbc.com",
  UBS: "ubs.com",
  RBC: "rbc.com",
  ROTHSCHILDANDCO: "rothschildandco.com",
  CIC: "cic.fr",
  BBVA: "bbva.com",
  MUFG: "mufg.jp",
  JB: "juliusbaer.com",
  LO: "lombardodier.com",
  KC: "keplercheuvreux.com",
  ODDO: "oddobhf.com",
  ING: "ing.com",
  BARCLAYS: "barclays.com",
  VON: "vontobel.com",
  MS: "morganstanley.com",
  CITI: "citi.com",
  BOFA: "bankofamerica.com",
  UNICREDIT: "unicreditgroup.eu",
  RABOBANK: "rabobank.com",
  WELLSFARGO: "wellsfargo.com",
  BLACKROCK: "blackrock.com",
  SANTANDER: "santander.com",
  PIMCO: "pimco.com",
};

// alias -> clé canonique
const BANK_LOGO_ALIASES: Record<string, string> = {
  BOFA_MAIN: "BOFA",
  BOFA_STUDENTS: "BOFA",
  BAML: "BOFA",
};

const norm = (s?: string) => (s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export function getBankLogoUrl(source?: string): string | undefined {
  const key = norm(source);
  const mapped = BANK_LOGO_ALIASES[key] ?? key;
  const domain = BANK_LOGO_DOMAINS[mapped];
  return domain ? `https://logo.clearbit.com/${domain}` : undefined;
}
