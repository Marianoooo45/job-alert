// Fichier: ui/src/app/api/jobs/route.ts (Version Finale Corrigée)

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
  contract_type?: string | null;
}

const SORT_WHITELIST = new Set([
  "title",
  "company",
  "location",
  "posted",
  "source",
  "category",
  "contract_type",
]);

export async function GET(request: NextRequest) {
  try {
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });

    const searchParams = request.nextUrl.searchParams;
    const banks = searchParams.getAll("bank");
    const keyword = searchParams.get("keyword");
    const hours = searchParams.get("hours");
    const categories = searchParams.getAll("category");
    const contractTypes = searchParams.getAll("contractType");

    const limit = parseInt(searchParams.get("limit") || "25", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const sortByRaw = (searchParams.get("sortBy") || "posted").toLowerCase();
    const sortBy = SORT_WHITELIST.has(sortByRaw) ? sortByRaw : "posted";
    const sortDirRaw = (searchParams.get("sortDir") || "desc").toLowerCase();
    const sortDir = sortDirRaw === "asc" ? "ASC" : "DESC";

    let query =
      "SELECT id, title, company, location, link, posted, source, keyword, category, contract_type FROM jobs";
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

    // tri sécurisé (whitelist + direction clamp)
    query += ` ORDER BY ${sortBy} ${sortDir} LIMIT ? OFFSET ?`;
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
