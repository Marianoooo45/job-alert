// =============================
// ui/src/app/api/account/security/resend-verification/route.ts
// =============================
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getDb, ensureCoreSchemas } from "../../../../../lib/db";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildBaseUrl(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

async function requireUsername(req: NextRequest): Promise<string | null> {
  try { const t = req.cookies.get("ja_session")?.value; if (!t) return null; const s = new TextEncoder().encode(process.env.AUTH_SECRET || ""); const { payload } = await jwtVerify(t, s); return (payload.sub ?? "").toString() || null; } catch { return null; }
}

export async function POST(req: NextRequest) {
  const username = await requireUsername(req);
  if (!username) return NextResponse.json({ ok:false, reason:"unauthenticated" }, { status:401 });

  const db = getDb(); await ensureCoreSchemas(db);
  const ur = await db.execute({ sql: "SELECT email FROM users WHERE username = ?", args:[username] });
  const email = (ur.rows[0]?.email as string) || "";
  if (!email) return NextResponse.json({ ok:false, reason:"no_email" }, { status:400 });

  const token = randomUUID().replace(/-/g, "") + Math.random().toString(36).slice(2,10);
  const exp = new Date(Date.now() + 86400000).toISOString();
  await db.execute({ sql: `INSERT INTO user_email_verifications (username, token, expires_at, created_at)
                            VALUES (?, ?, ?, ?)
                            ON CONFLICT(username) DO UPDATE SET token=excluded.token, expires_at=excluded.expires_at, created_at=excluded.created_at`,
                    args:[username, token, exp, new Date().toISOString()] });

  const key = process.env.RESEND_API_KEY;
  if (key) {
    const url = `${buildBaseUrl(req)}/api/account/security/verify?token=${encodeURIComponent(token)}`;
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || "noreply@job-alert.local",
          to: email,
          subject: "Vérification de votre email",
          html: `Cliquez pour vérifier: <a href="${url}">${url}</a>`
        })
      });
    } catch {}
  }
  return NextResponse.json({ ok:true });
}
