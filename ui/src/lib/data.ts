// Fichier: ui/src/lib/data.ts

import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "public", "jobs.db");

// L'interface Job est définie ici pour être partagée
export interface Job {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  link: string;
  posted: string;
  source: string;
  keyword: string;
  category?: string | null;
  contract_type?: string | null;
}

// C'est notre "ligne directe" vers la base de données
export function getJobs(searchParams?: { [key: string]: string | string[] | undefined }): Job[] {
  try {
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });

    const queryParams = new URLSearchParams();
    if (searchParams) {
      Object.entries(searchParams).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, v));
        } else if (value) {
          queryParams.append(key, value);
        }
      });
    }
    
    const banks = queryParams.getAll("bank");
    const keyword = queryParams.get("keyword");
    const categories = queryParams.getAll("category");
    const contractTypes = queryParams.getAll("contractType");
    const limit = parseInt(queryParams.get("limit") || "25", 10);
    const offset = parseInt(queryParams.get("offset") || "0", 10);
    
    let query = `SELECT * FROM jobs`;
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (banks.length > 0) {
      conditions.push(`source IN (${banks.map(() => "?").join(", ")})`);
      params.push(...banks.map(b => b.toUpperCase()));
    }
    if (keyword) {
      conditions.push("title LIKE ?");
      params.push(`%${keyword}%`);
    }
    if (categories.length > 0) {
        conditions.push(`category IN (${categories.map(() => "?").join(", ")})`);
        params.push(...categories);
    }
    if (contractTypes.length > 0) {
        conditions.push(`contract_type IN (${contractTypes.map(() => "?").join(", ")})`);
        params.push(...contractTypes);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY posted DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const stmt = db.prepare(query);
    const jobs: Job[] = stmt.all(params) as Job[];
    
    db.close();
    return jobs;

  } catch (error) {
    console.error("Erreur directe de lecture de la DB:", error);
    // Si la DB n'existe pas, on retourne une liste vide pour ne pas faire planter la page
    return []; 
  }
}