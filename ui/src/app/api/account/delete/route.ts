// =============================
// ui/src/app/api/account/delete/route.ts
// =============================
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getDb, ensureCoreSchemas } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireUsername(req: NextRequest): Promise<string | null> {
  try { const t = req.cookies.get("ja_session")?.value; if (!t) return null; const s = new TextEncoder().encode(process.env.AUTH_SECRET || ""); const { payload } = await jwtVerify(t, s); return (payload.sub ?? "").toString() || null; } catch { return null; }
}

export async function POST(req: NextRequest) {
  const username = await requireUsername(req);
  if (!username) return NextResponse.json({ ok:false, reason:"unauthenticated" }, { status:401 });

  let body:any; try { body = await req.json(); } catch { return NextResponse.json({ ok:false, reason:"invalid_json" }, { status:400 }); }
  const confirm = (body?.confirm||"").toString();
  if (confirm !== username) return NextResponse.json({ ok:false, reason:"mismatch" }, { status:400 });

  const db = getDb(); await ensureCoreSchemas(db);
  await db.execute({ sql: "DELETE FROM user_alerts WHERE username = ?", args:[username] });
  await db.execute({ sql: "DELETE FROM user_tracker WHERE username = ?", args:[username] });
  await db.execute({ sql: "DELETE FROM user_settings WHERE username = ?", args:[username] });
  await db.execute({ sql: "DELETE FROM user_email_verifications WHERE username = ?", args:[username] });
  await db.execute({ sql: "DELETE FROM users WHERE username = ?", args:[username] });

  const res = NextResponse.json({ ok:true }, { status:200 });
  res.cookies.set("ja_session", "", { path:"/", maxAge:0 });
  return res;
}
