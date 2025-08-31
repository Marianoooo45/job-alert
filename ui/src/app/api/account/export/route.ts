// =============================
// ui/src/app/api/account/export/route.ts
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
  if (!username) return new NextResponse("unauthenticated", { status: 401 });

  const db = getDb(); await ensureCoreSchemas(db);
  const [u, s, a, t] = await Promise.all([
    db.execute({ sql: "SELECT username, email, email_verified_at, created_at FROM users WHERE username = ?", args:[username] }),
    db.execute({ sql: "SELECT * FROM user_settings WHERE username = ?", args:[username] }),
    db.execute({ sql: "SELECT data FROM user_alerts WHERE username = ?", args:[username] }),
    db.execute({ sql: "SELECT data FROM user_tracker WHERE username = ?", args:[username] }),
  ]);

  const profile = u.rows[0] || null;
  const settings = s.rows[0] || null;
  const alerts = a.rows[0]?.data ? JSON.parse(a.rows[0].data as string) : [];
  const tracker = t.rows[0]?.data ? JSON.parse(t.rows[0].data as string) : [];

  const payload = { profile, settings, alerts, tracker, exported_at: new Date().toISOString() };
  const blob = JSON.stringify(payload, null, 2);
  const res = new NextResponse(blob, { status: 200, headers: { "Content-Type": "application/json" } });
  res.headers.set("Content-Disposition", `attachment; filename=job-alert-export-${username}-${new Date().toISOString().slice(0,10)}.json`);
  return res;
}
