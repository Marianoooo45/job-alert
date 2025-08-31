// =============================
// ui/src/app/api/account/security/verify/route.ts
// =============================
import { NextRequest, NextResponse } from "next/server";
import { getDb, ensureCoreSchemas } from "../../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  if (!token) return new NextResponse("Missing token", { status: 400 });

  const db = getDb(); await ensureCoreSchemas(db);
  const r = await db.execute({ sql: "SELECT username, expires_at FROM user_email_verifications WHERE token = ?", args:[token] });
  const row = r.rows[0] as any;
  if (!row) return new NextResponse("Invalid token", { status: 400 });
  if (new Date(row.expires_at).getTime() < Date.now()) return new NextResponse("Expired token", { status: 400 });

  await db.execute({ sql: "UPDATE users SET email_verified_at = ? WHERE username = ?", args:[new Date().toISOString(), row.username] });
  await db.execute({ sql: "DELETE FROM user_email_verifications WHERE username = ?", args:[row.username] });

  const url = new URL("/settings", req.url); url.searchParams.set("verified", "1");
  return NextResponse.redirect(url, { status: 303 });
}
