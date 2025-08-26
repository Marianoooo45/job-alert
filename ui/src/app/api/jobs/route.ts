// ui/src/app/api/jobs/route.ts
import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { CATEGORY_GROUPS } from "@/config/categories";

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
  country_code?: string | null;
  country_name?: string | null;
}

// Continents -> ISO alpha-2
const CONTINENT_MAP: Record<string, string[]> = {
  africa: ["DZ","AO","BJ","BW","BF","BI","CM","CV","CF","TD","KM","CG","CD","CI","DJ","EG","GQ","ER","ET","GA","GM","GH","GN","GW","KE","LS","LR","LY","MG","MW","ML","MR","MU","YT","MA","MZ","NA","NE","NG","RE","RW","ST","SN","SC","SL","SO","ZA","SS","SD","TZ","TG","TN","UG","ZM","ZW"],
  americas: ["AI","AG","AR","AW","BS","BB","BZ","BM","BO","BQ","BR","VG","CA","KY","CL","CO","CR","CU","CW","DM","DO","EC","SV","FK","GF","GL","GD","GP","GT","GY","HT","HN","JM","MQ","MX","MS","NI","PA","PY","PE","PR","BL","KN","LC","MF","PM","VC","SR","TT","TC","US","UY","VE","VI"],
  asia: ["AF","AM","AZ","BH","BD","BT","BN","KH","CN","GE","HK","IN","ID","IR","IQ","IL","JP","JO","KZ","KW","KG","LA","LB","MO","MY","MV","MN","MM","NP","KP","OM","PK","PS","PH","QA","SA","SG","KR","LK","SY","TW","TJ","TH","TL","TR","TM","AE","UZ","VN","YE"],
  europe: ["AL","AD","AM","AT","AZ","BY","BE","BA","BG","HR","CY","CZ","DK","EE","FO","FI","FR","DE","GI","GR","GG","HU","IS","IE","IM","IT","JE","XK","LV","LI","LT","LU","MT","MD","MC","ME","NL","MK","NO","PL","PT","RO","RU","SM","RS","SK","SI","ES","SE","CH","UA","GB","VA"],
  oceania: ["AS","AU","CK","FJ","PF","GU","KI","MH","FM","NR","NC","NZ","NU","MP","PW","PG","PN","WS","SB","TK","TO","TV","UM","VU","WF"],
};

// colonnes textuelles (pour tri avec LOWER)
const TEXT_COLS = new Set([
  "title",
  "company",
  "location",
  "source",
  "category",
  "contract_type",
  "country_code",
  "country_name",
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
  country: "country_code",
  country_code: "country_code",
  country_name: "country_name",
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
    .replace(/\s*[–—-]\s*/g, " - ")
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
    const leaves = (g.children?.length ? g.children.map((c) => c.name) : [g.name]).map(toDbDash);
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

    // Nouveaux filtres localisation
    // ?country=FR&country=GB  (ISO alpha-2, insensible à la casse)
    // ?continent=europe&continent=asia  (en anglais, insensible à la casse)
    // ?hasCountry=true|false  (true = uniquement lignes avec code; false = uniquement NULL/vides)
    const countries = sp.getAll("country").map((c) => c.trim().toUpperCase()).filter(Boolean);
    const continents = sp.getAll("continent").map((c) => c.trim().toLowerCase()).filter(Boolean);
    const hasCountryParam = sp.get("hasCountry");

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

    // ---- localisation ----
    // 1) continents -> liste de codes
    if (continents.length > 0) {
      const codeSet = new Set<string>();
      for (const key of continents) {
        const arr = CONTINENT_MAP[key];
        if (arr) arr.forEach((c) => codeSet.add(c));
      }
      if (codeSet.size > 0) {
        const inList = Array.from(codeSet);
        const placeholders = inList.map(() => "?").join(", ");
        where.push(`country_code IN (${placeholders})`);
        whereParams.push(...inList);
      }
    }

    // 2) countries explicites
    if (countries.length > 0) {
      const placeholders = countries.map(() => "?").join(", ");
      where.push(`country_code IN (${placeholders})`);
      whereParams.push(...countries);
    }

    // 3) hasCountry
    if (hasCountryParam === "true") {
      where.push(`country_code IS NOT NULL AND country_code <> ''`);
    } else if (hasCountryParam === "false") {
      where.push(`(country_code IS NULL OR country_code = '')`);
    }

    // Base SELECT
    let selectSql =
      `SELECT id, title, company, location, link, posted, source, keyword, category, contract_type, country_code, country_name FROM jobs`;
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
