// Fichier: src/config/contractTypes.ts
export interface ContractType { id: string; name: string; }
export const CONTRACT_TYPE_LIST: ContractType[] = [
  { id: "cdi", name: "CDI" },
  { id: "cdd", name: "CDD" },
  { id: "stage", name: "Stage" },
  { id: "alternance", name: "Alternance" },
  { id: "freelance", name: "Freelance" },
  { id: "vie", name: "VIE" },
  { id: "non-specifie", name: "Non spécifié" },
  { id: "autre", name: "Autre" },
];