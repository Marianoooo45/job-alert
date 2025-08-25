// Fichier: ui/src/app/api/jobs/route.ts
import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { CATEGORY_GROUPS } from "@/config/categories"; // ← on s'appuie sur ta config front

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

const TEXT_COLS = new Set([
  "title",
  "company",
  "location",
  "source",
  "category",
  "contract_type",
]);

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

const clampInt = (v: string | null, d: number, min: number, max: number) => {
  const n = Number.parseInt(v ?? "", 10);
  if (Number.isNaN(n)) return d;
  return Math.min(max, Math.max(min, n));
};

/** Normalise pour comparaison: supprime accents, casse, espaces multiples, unifie les tirets. */
function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s*[–—-]\s*/g, " - ") // unifie séparateur
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Re-formate un libellé en “DB style” (espace EN DASH espace) si c’est un couple. */
function toDbDash(s: string) {
  return s.replace(/\s*[–—-]\s*/g, " — ");
}

/** Map "nom normalisé" -> liste des feuilles (libellés DB) */
const GROUP_NAME_TO_LEAVES = new Map<string, string[]>(
  CATEGORY_GROUPS.map((g) => {
    const leaves = (g.children?.length
      ? g.children.map((c) => c.name)
      : [g.name]
    ).map(toDbDash);
    return [norm(g.name), leaves];
  })
);

/** Étend la liste demandée (groupes/feuilles) en un Set de feuilles normalisées DB */
function expandCategories(raw: string[]): Set<string> {
  const out = new Set<string>();
  for (const r of raw) {
    const key = norm(r);
    const maybeLeaves = GROUP_NAME_TO_LEAVES.get(key);
    if (maybeLeaves && maybeLeaves.length) {
      maybeLeaves.forEach((l) => out.add(toDbDash(l)));
    } else {
      // c’est probablement déjà une feuille → on la remet au format DB
      out.add(toDbDash(r));
    }
  }
  return out;
}

export async function GET(request: NextRequest) {
  let db: Database.Database | null = null;
  try {
    db = new Database(dbPath, { readonly: true, fileMustExist: true });

    const sp = request.nextUrl.searchParams;

    // ---------- Filtres ----------
    const banks = sp.getAll("bank");                 // ex: ["BARCLAYS", "DB"]
    const keyword = sp.get("keyword") || "";         // texte titre
    const hours = sp.get("hours");                   // fenêtre de fraîcheur (heures)
    const categoriesRaw = sp.getAll("category");     // ex: ["Markets — Sales", "Markets"]
    const contractTypes = sp.getAll("contractType"); // ex: ["cdi","stage"]

    // ---------- Pagination & tri ----------
    const limit = clampInt(sp.get("limit"), 20, 1, 200);
    const offset = clampInt(sp.get("offset"), 0, 0, 1_000_000);

    const sortByRaw = (sp.get("sortBy") || "posted").toLowerCase();
    const sortDirRaw = (sp.get("sortDir") || (sortByRaw === "posted" ? "desc" : "asc")).toLowerCase();

    const sortCol = COL_MAP[sortByRaw] ?? "posted";
    const sortDir = sortDirRaw === "asc" ? "ASC" : "DESC";

    // ---------- WHERE ----------
    const where: string[] = [];
    const whereParams: (string | number)[] = [];

    if (banks.length > 0) {
      const placeholders = banks.map(() => "?").join(", ");
      where.push(`source IN (${placeholders})`);
      whereParams.push(...banks.map((b) => b.toUpperCase()));
    }

    if (keyword.trim()) {
      where.push(`LOWER(title) LIKE LOWER(?)`);
      whereParams.push(`%${keyword}%`);
    }

    if (hours && !isNaN(Number(hours))) {
      const dateLimit = new Date();
      dateLimit.setHours(dateLimit.getHours() - parseInt(hours, 10));
      where.push(`posted >= ?`);
      whereParams.push(dateLimit.toISOString());
    }

    if (categoriesRaw.length > 0) {
      // Étend “groupes” -> feuilles et remet les libellés au format DB
      const expanded = Array.from(expandCategories(categoriesRaw));
      const placeholders = expanded.map(() => "?").join(", ");
      where.push(`category IN (${placeholders})`);
      whereParams.push(...expanded);
    }

    if (contractTypes.length > 0) {
      const placeholders = contractTypes.map(() => "?").join(", ");
      where.push(`contract_type IN (${placeholders})`);
      whereParams.push(...contractTypes);
    }

    // Base SELECT
    let selectSql =
      `SELECT id, title, company, location, link, posted, source, keyword, category, contract_type FROM jobs`;
    if (where.length) selectSql += ` WHERE ${where.join(" AND ")}`;

    // Tri: textes triés sur LOWER(col) et NULLS LAST
    const orderExpr =
      TEXT_COLS.has(sortCol)
        ? `CASE WHEN ${sortCol} IS NULL OR ${sortCol} = '' THEN 1 ELSE 0 END, LOWER(${sortCol}) ${sortDir}`
        : `${sortCol} ${sortDir}`;

    // Fallback stable
    const fallback = sortCol === "posted" ? `, id DESC` : `, posted DESC`;

    // Total
    const countSql = selectSql.replace(
      /^SELECT.+FROM jobs/i,
      "SELECT COUNT(*) AS total FROM jobs"
    );
    const totalRow = db.prepare(countSql).get(whereParams) as { total: number };
    const total = totalRow?.total ?? 0;

    // Résultats paginés
    const finalSql = `${selectSql} ORDER BY ${orderExpr}${fallback} LIMIT ? OFFSET ?`;
    const rows: Job[] = db.prepare(finalSql).all([...whereParams, limit, offset]) as Job[];

    return new NextResponse(JSON.stringify(rows), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Total-Count": String(total),
        "Access-Control-Expose-Headers": "X-Total-Count",
      },
      status: 200,
    });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Failed to read database or process request", details: error?.message ?? String(error) },
      { status: 500 }
    );
  } finally {
    try { db?.close(); } catch {}
  }
}
