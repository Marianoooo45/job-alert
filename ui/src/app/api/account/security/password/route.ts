// =============================
// ui/src/app/api/account/security/password/route.ts
// =============================
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { getDb, ensureCoreSchemas } from "../../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireUsername(req: NextRequest): Promise<string | null> {
  try { const t = req.cookies.get("ja_session")?.value; if (!t) return null; const s = new TextEncoder().encode(process.env.AUTH_SECRET || ""); const { payload } = await jwtVerify(t, s); return (payload.sub ?? "").toString() || null; } catch { return null; }
}

export async function POST(req: NextRequest) {
  const username = await requireUsername(req);
  if (!username) return NextResponse.json({ ok:false, reason:"unauthenticated" }, { status:401 });
  let body:any; try { body = await req.json(); } catch { return NextResponse.json({ ok:false, reason:"invalid_json" }, { status:400 }); }

  const oldPassword = (body?.oldPassword||"").toString();
  const newPassword = (body?.newPassword||"").toString();
  if (newPassword.length < 6) return NextResponse.json({ ok:false, reason:"weak_password" }, { status:400 });

  const db = getDb();
  await ensureCoreSchemas(db);
  const r = await db.execute({ sql: "SELECT password_hash FROM users WHERE username = ?", args:[username] });
  const hash = (r.rows[0]?.password_hash as string) || "";
  const valid = hash ? await bcrypt.compare(oldPassword, hash) : false;
  if (!valid) return NextResponse.json({ ok:false, reason:"invalid_old_password" }, { status:400 });

  const nextHash = await bcrypt.hash(newPassword, 12);
  await db.execute({ sql: "UPDATE users SET password_hash = ? WHERE username = ?", args: [nextHash, username] });
  return NextResponse.json({ ok:true });
}
