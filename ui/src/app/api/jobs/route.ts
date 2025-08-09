// Fichier: ui/src/app/api/jobs/route.ts (Version Finale Corrigée)
import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

// DB locale dans /public
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
  contract_type?: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });

    const sp = request.nextUrl.searchParams;

    // Filtres
    const banks = sp.getAll("bank");                 // ex: ["BARCLAYS", "DB"]
    const keyword = sp.get("keyword");               // texte titre
    const hours = sp.get("hours");                   // fenetre fraicheur
    const categories = sp.getAll("category");        // ex: ["Markets", "M&A"]
    const contractTypes = sp.getAll("contractType"); // ex: ["cdi","intern"]

    // Pagination + tri
    const limit = parseInt(sp.get("limit") || "25", 10);
    const offset = parseInt(sp.get("offset") || "0", 10);

    // Tri server-side (whitelist)
    const sortByRaw = (sp.get("sortBy") || "posted").toLowerCase();
    const sortDirRaw = (sp.get("sortDir") || (sortByRaw === "posted" ? "desc" : "asc")).toLowerCase();

    const COL_MAP: Record<string, string> = {
      title: "title",
      company: "company",
      location: "location",
      posted: "posted",
      source: "source",
      category: "category",
      contract_type: "contract_type",
      contracttype: "contract_type",
    };
    const sortCol = COL_MAP[sortByRaw] ?? "posted";
    const sortDir = sortDirRaw === "asc" ? "ASC" : "DESC";

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

    if (contractTypes.length > 0) {
      const placeholders = contractTypes.map(() => "?").join(", ");
      conditions.push(`contract_type IN (${placeholders})`);
      params.push(...contractTypes);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    // Tri principal + fallback secondaire (pour stabilité)
    query += ` ORDER BY ${sortCol} ${sortDir}, posted DESC`;
    query += " LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const stmt = db.prepare(query);
    const jobs: Job[] = stmt.all(params) as Job[];
    db.close();

    return NextResponse.json(jobs);
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Failed to read database or process request", details: error.message },
      { status: 500 }
    );
  }
}
