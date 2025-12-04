// ui/src/app/api/stats/route.ts
import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

function getUiDb() {
  const dbPath = path.join(process.cwd(), "public", "jobs.db");
  return new Database(dbPath, { readonly: true });
}

const WEEKDAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

type HistoryRow = { day: string; count: number };
type WeekdayRow = { dow: string; count: number };

function bucketContractType(raw: string | null | undefined): string {
  if (!raw) return "Autres";

  const t = raw.toLowerCase();

  // Canonique de ta normalize_contract_type
  if (t === "cdi") return "CDI";
  if (t === "cdd") return "CDD";
  if (t === "stage") return "Stage";
  if (t === "alternance") return "Alternance";
  if (t === "freelance") return "Freelance";
  if (t === "vie") return "VIE";
  if (t === "non-specifie") return "Non spécifié";

  if (t.includes("permanent") || t.includes("full time") || t.includes("full-time"))
    return "CDI";

  if (
    t.includes("temporary") ||
    t.includes("fixed term") ||
    t.includes("interim") ||
    t.includes("fixed-term")
  )
    return "CDD";

  if (
    t.includes("intern") ||
    t.includes("stage") ||
    t.includes("stagiaire") ||
    t.includes("trainee")
  )
    return "Stage";

  if (
    t.includes("apprenti") ||
    t.includes("alternance") ||
    t.includes("apprenticeship") ||
    t.includes("work study")
  )
    return "Alternance";

  if (t.includes("vie")) return "VIE";

  if (t.includes("freelance") || t.includes("independant") || t.includes("contractor"))
    return "Freelance";

  return "Autres";
}

export async function GET() {
  // NOTE: type un peu sale mais identique à ce que tu avais
  let db: Database.Database | null = null;

  try {
    db = getUiDb();

    // 1) Top sources
    const topBanksStmt = db.prepare(`
      SELECT source AS bank, COUNT(*) AS count
      FROM jobs
      GROUP BY source
      ORDER BY count DESC
    `);
    const topBanksRows = topBanksStmt.all() as { bank: string; count: number }[];

    // 2) Historique offres / jour
    const historyStmt = db.prepare(`
      SELECT date(posted) AS day, COUNT(*) AS count
      FROM jobs
      WHERE posted IS NOT NULL AND posted != ''
      GROUP BY date(posted)
      ORDER BY day ASC
    `);
    const historyRows = historyStmt.all() as HistoryRow[];

    // 3) Dernière activité par source
    const healthStmt = db.prepare(`
      SELECT source AS bank,
             MAX(posted) AS last_seen,
             COUNT(*) AS total
      FROM jobs
      GROUP BY source
      ORDER BY last_seen DESC
    `);
    const healthRows = healthStmt.all() as {
      bank: string;
      last_seen: string | null;
      total: number;
    }[];

    // 4) Total
    const totalStmt = db.prepare(`
      SELECT COUNT(*) AS total
      FROM jobs
    `);
    const totalRow = totalStmt.get() as { total: number } | undefined;

    // 5) Types de contrat (raw)
    const contractStmt = db.prepare(`
      SELECT COALESCE(contract_type, 'non-specifie') AS contract_type,
             COUNT(*) AS count
      FROM jobs
      GROUP BY contract_type
      ORDER BY count DESC
    `);
    const contractRows = contractStmt.all() as {
      contract_type: string;
      count: number;
    }[];

    // 6) Volume par jour de la semaine
    const weekdayStmt = db.prepare(`
      SELECT strftime('%w', posted) AS dow, COUNT(*) AS count
      FROM jobs
      WHERE posted IS NOT NULL AND posted != ''
      GROUP BY strftime('%w', posted)
      ORDER BY dow ASC
    `);
    const weekdayRows = weekdayStmt.all() as WeekdayRow[];

    // ======= KPIs calculés =======
    let daysTracked = historyRows.length;
    let avgPerDay = 0;
    let lastDayCount = 0;
    let lastDayDate: string | null = null;
    let rolling7d = 0;
    let bestDayCount = 0;
    let bestDayDate: string | null = null;

    if (daysTracked > 0) {
      const totalFromHistory = historyRows.reduce(
        (acc, r) => acc + Number(r.count || 0),
        0
      );
      avgPerDay = totalFromHistory / daysTracked;

      const last = historyRows[historyRows.length - 1];
      lastDayCount = Number(last.count || 0);
      lastDayDate = last.day;

      const last7 = historyRows.slice(-7);
      rolling7d = last7.reduce((acc, r) => acc + Number(r.count || 0), 0);

      const best = historyRows.reduce(
        (best, r) =>
          Number(r.count) > best.count ? { day: r.day, count: Number(r.count) } : best,
        { day: historyRows[0].day, count: Number(historyRows[0].count) }
      );
      bestDayCount = best.count;
      bestDayDate = best.day;
    }

    // ======= Agrégation contrats (pour donut) =======
    const contractBuckets: Record<string, number> = {};

    contractRows.forEach((row) => {
      const bucket = bucketContractType(row.contract_type);
      contractBuckets[bucket] = (contractBuckets[bucket] || 0) + Number(row.count || 0);
    });

    const contractGroups = Object.entries(contractBuckets)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    const totalContracts = contractGroups.reduce((acc, c) => acc + c.value, 0) || 1;

    const internish = contractGroups
      .filter((c) => ["Stage", "Alternance", "VIE"].includes(c.label))
      .reduce((acc, c) => acc + c.value, 0);

    const cdiCount =
      contractGroups.find((c) => c.label === "CDI")?.value ?? 0;

    const internShare = internish / totalContracts;
    const cdiShare = cdiCount / totalContracts;

    // ======= Weekday regroupé =======
    const jobsByWeekday = weekdayRows.map((r) => ({
      weekday: WEEKDAYS_FR[Number(r.dow)] ?? r.dow,
      count: Number(r.count),
    }));

    if (db) db.close();

    return NextResponse.json({
      totalJobs: Number(totalRow?.total || 0),

      topBanks: topBanksRows.map((r) => ({
        name: r.bank,
        value: Number(r.count),
      })),

      history: historyRows.map((r) => ({
        date: r.day,
        count: Number(r.count),
      })),

      bankHealth: healthRows.map((r) => ({
        bank: r.bank,
        lastSeen: r.last_seen,
        total: Number(r.total),
      })),

      kpis: {
        daysTracked,
        avgPerDay,
        lastDayCount,
        lastDayDate,
        rolling7d,
        bestDayCount,
        bestDayDate,
        internShare,
        cdiShare,
      },

      contractGroups,
      jobsByWeekday,
    });
  } catch (e: any) {
    console.error("Error fetching stats:", e);
    if (db) db.close();
    return NextResponse.json(
      { error: e?.message || "Erreur SQL" },
      { status: 500 }
    );
  }
}
