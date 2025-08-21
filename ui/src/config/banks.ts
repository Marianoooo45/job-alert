// Fichier: ui/src/config/banks.ts

export const BANK_CONFIG = {
  BARCLAYS: {
    name: "Barclays",
    color: "oklch(0.75 0.2 210)", // Un bleu ciel vif
  },
  BOFA: {
    name: "Bank of America",
    gradient: ["oklch(0.55 0.20 25)", "oklch(0.9 0.02 260)"],
  },
  BBVA: {
    name: "BBVA",
    color: "oklch(0.6338 0.1431 64.06)",
  },
  BNPP: {
    name: "BNP Paribas",
    color: "oklch(0.8 0.15 140)", // Vert
  },
  CIC: {
    name: "CIC",
    gradient: ["oklch(0.6 0.2 250)", "oklch(0.7 0.2 150)"],
  },
  CITI: {
    name: "Citi",
    color: "oklch(0.62 0.20 250)", // bleu vif
    // ou gradient: ["oklch(0.5 0.2 255)", "oklch(0.7 0.2 240)"],
  },
  CA: {
    name: "Crédit Agricole",
    color: "oklch(0.75 0.18 145)", // Un vert différent pour CA
  },
  DB: {
    name: "Deutsche Bank",
    color: "oklch(0.7 0.15 260)", // Bleu
  },
  EDR: {
    name: "Edmond de Rothschild",
    color: "oklch(0.8067 0.1727 91.59)", // jaune edr
  },
  BPCE: {
    name: "Groupe BPCE",
    color: "oklch(0.2868 0.1036 330.88)", // Violet BPCE
  },
  HSBC: {
    name: "HSBC",
    // Dégradé inspiré de ton image : d'un rouge vif à un blanc-rosé très clair.
    gradient: ["oklch(0.6 0.28 25)", "oklch(0.95 0.05 20)"],
  },
  ING: {
    name: "ING",
    // Un dégradé orange vif, couleur signature d'ING
    gradient: ["oklch(0.7 0.25 55)", "oklch(0.8 0.2 60)"],
  },
  JB: {
    name: "Julius Baer",
    // Dégradé inspiré du gris et bleu de la marque
    gradient: ["oklch(0.4 0.02 240)", "oklch(0.7 0.15 230)"],
  },
  KC: {
    name: "Kepler Cheuvreux",
    // Un bleu-vert inspiré de leur charte graphique
    color: "oklch(0.6 0.15 195)",
  },
  LO: {
    name: "Lombard Odier",
    // Dégradé dans les tons bleu marine de la marque
    gradient: ["oklch(0.25 0.08 260)", "oklch(0.4 0.1 260)"],
  },
  MS: {
    name: "Morgan Stanley",
    // Un dégradé de bleu, couleur signature
    gradient: ["oklch(0.4 0.15 260)", "oklch(0.6 0.2 250)"],
  },
  MUFG: {
    name: "MUFG",
    // Dégradé gris et rouge comme demandé
    gradient: ["oklch(0.4 0.01 0)", "oklch(0.6 0.28 25)"],
  },
  ODDO: {
    name: "Oddo BHF",
    // Un bleu foncé sobre inspiré de leur logo
    color: "oklch(0.6338 0.1357 175.24)",
  },
  RABOBANK: {
    name: "Rabobank",
    color: "#001090", // La couleur bleu foncé officielle de Rabobank
  },
  RBC: {
    name: "RBC",
    // Dégradé bleu et jaune, inspiré du logo de Royal Bank of Canada
    gradient: ["oklch(0.5 0.2 265)", "oklch(0.9 0.25 90)"],
  },
  ROTHSCHILDANDCO: {
    name: "Rothschild & Co",
    // Dégradé inspiré du bleu marine et ocre/or de la marque
    gradient: ["oklch(0.35 0.1 260)", "oklch(0.75 0.15 85)"],
  },
  SG: {
    name: "Société Générale",
    color: "oklch(0.7 0.18 15)", // Rouge
  },
  UBS: {
    name: "UBS",
    // Un dégradé de rouge et noir, couleurs classiques d'UBS
    gradient: ["oklch(0.0044 0.0074 91.59)", "oklch(0.3 0.1 15)"],
  },
  UNICREDIT: {
    name: "UniCredit",
    color: "#E30035", // La couleur rouge officielle d'UniCredit
  },
  VON: {
    name: "Vontobel",
    color: "oklch(0.68 0.15 195)",
  },
};


// ... le reste du fichier est généré automatiquement et n'a pas besoin de changer.
export const BANKS_LIST = Object.entries(BANK_CONFIG).map(([key, value]) => ({
  id: key,
  ...value,
}));
