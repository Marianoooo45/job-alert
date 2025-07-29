// Fichier: app/api/jobs/route.ts

import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "public", "jobs.db");

interface Job {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  link: string;
  posted: string;
  source: string;
  keyword: string;
  category?: string | null;
  contract_type?: string | null; // ✨ AJOUT DE LA PROPRIÉTÉ
}

export async function GET(request: NextRequest) {
  let db;
  try {
    db = new Database(dbPath, { readonly: true, fileMustExist: true });
  } catch (error) {
    console.error("Erreur de connexion à la base de données:", error);
    return NextResponse.json(
      {
        error:
          "La base de données 'public/jobs.db' est introuvable. Veuillez la copier depuis 'storage/jobs.db'.",
      },
      { status: 500 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const banks = searchParams.getAll("bank");
    const keyword = searchParams.get("keyword");
    const hours = searchParams.get("hours");
    const categories = searchParams.getAll("category");
    // ✨ ON RÉCUPÈRE LE NOUVEAU FILTRE
    const contractTypes = searchParams.getAll("contractType");
    
    const limit = parseInt(searchParams.get("limit") || "25", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // ✨ ON AJOUTE LA NOUVELLE COLONNE DANS LE SELECT
    let query = `SELECT id, title, company, location, link, posted, source, keyword, category, contract_type FROM jobs`;
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (banks.length > 0) {
      const placeholders = banks.map(() => "?").join(", ");
      conditions.push(`source IN (${placeholders})`);
      params.push(...banks.map((b) => b.toUpperCase()));
    }

    if (keyword) {
      conditions.push("title LIKE ?");
      params.push(`%${keyword}%`);
    }

    if (hours && !isNaN(Number(hours))) {
      const dateLimit = new Date();
      dateLimit.setHours(dateLimit.getHours() - parseInt(hours, 10));
      conditions.push("posted >= ?");
      params.push(dateLimit.toISOString());
    }

    if (categories.length > 0) {
      const placeholders = categories.map(() => "?").join(", ");
      conditions.push(`category IN (${placeholders})`);
      params.push(...categories);
    }
    
    // ✨ ON AJOUTE LA CONDITION POUR LE TYPE DE CONTRAT
    if (contractTypes.length > 0) {
        const placeholders = contractTypes.map(() => "?").join(", ");
        conditions.push(`contract_type IN (${placeholders})`);
        params.push(...contractTypes);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY posted DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const stmt = db.prepare(query);
    const jobs: Job[] = stmt.all(...params) as Job[];

    return NextResponse.json(jobs);
  } catch (error) {
    console.error("Erreur lors de la requête à la base de données:", error);
    return NextResponse.json(
      { error: `Erreur interne du serveur: ${(error as Error).message}` },
      { status: 500 }
    );
  } finally {
    if (db) db.close();
  }
}