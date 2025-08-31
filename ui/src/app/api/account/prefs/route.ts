// =============================
// ui/src/app/api/account/prefs/route.ts
// =============================
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getDb, ensureCoreSchemas } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireUsername(req: NextRequest): Promise<string | null> {
  try { const t = req.cookies.get("ja_session")?.value; if (!t) return null; const s = new TextEncoder().encode(process.env.AUTH_SECRET || ""); const { payload } = await jwtVerify(t, s); return (payload.sub ?? "").toString() || null; } catch { return null; }
}

export async function GET(req: NextRequest) {
  const username = await requireUsername(req);
  if (!username) return NextResponse.json({ ok:false, prefs:null }, { status:200 });

  const db = getDb(); await ensureCoreSchemas(db);
  const r = await db.execute({ sql: `SELECT default_filters, default_sort, rows_per_page, compact_mode, favorite_banks, default_country FROM user_settings WHERE username = ?`, args:[username] });
  const row = r.rows[0] as any;
  const prefs = {
    defaultFilters: row?.default_filters ? JSON.parse(row.default_filters) : null,
    defaultSort: row?.default_sort || "date_desc",
    rowsPerPage: Number.isFinite(+row?.rows_per_page) ? +row.rows_per_page : 25,
    compactMode: !!row?.compact_mode,
    favoriteBanks: row?.favorite_banks ? JSON.parse(row.favorite_banks) : [],
    defaultCountry: row?.default_country || "FR",
  };
  return NextResponse.json({ ok:true, prefs });
}

export async function PUT(req: NextRequest) {
  const username = await requireUsername(req);
  if (!username) return NextResponse.json({ ok:false, reason:"unauthenticated" }, { status:401 });

  let body:any; try { body = await req.json(); } catch { return NextResponse.json({ ok:false, reason:"invalid_json" }, { status:400 }); }
  const db = getDb(); await ensureCoreSchemas(db);
  await db.execute({ sql: `INSERT INTO user_settings (username, default_filters, default_sort, rows_per_page, compact_mode, favorite_banks, default_country, updated_at)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                           ON CONFLICT(username) DO UPDATE SET default_filters=excluded.default_filters, default_sort=excluded.default_sort, rows_per_page=excluded.rows_per_page, compact_mode=excluded.compact_mode, favorite_banks=excluded.favorite_banks, default_country=excluded.default_country, updated_at=excluded.updated_at`,
                    args:[username, JSON.stringify(body.defaultFilters ?? null), (body.defaultSort||"date_desc").toString(), Math.max(5, Math.min(200, +body.rowsPerPage || 25)), body.compactMode?1:0, JSON.stringify(Array.isArray(body.favoriteBanks)?body.favoriteBanks:[]), (body.defaultCountry||"FR").toString(), new Date().toISOString()] });
  return NextResponse.json({ ok:true });
}
