// =============================
// ui/src/app/api/account/profile/route.ts
// =============================
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import crypto from "crypto";
import { getDb, ensureCoreSchemas } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireUsername(req: NextRequest): Promise<string | null> {
  try {
    const t = req.cookies.get("ja_session")?.value;
    if (!t) return null;
    const s = new TextEncoder().encode(process.env.AUTH_SECRET || "");
    const { payload } = await jwtVerify(t, s);
    return (payload.sub ?? "").toString() || null;
  } catch { return null; }
}

async function sendVerificationEmail(req: NextRequest, username: string, email: string, token: string) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const url = `${proto}://${host}/api/account/security/verify?token=${encodeURIComponent(token)}`;

  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || "noreply@job-alert.local",
        to: email,
        subject: "Vérification de votre email",
        html: `<p>Bonjour ${username},</p><p>Confirmez votre email en cliquant ici : <a href="${url}">${url}</a></p>`,
      }),
    });
  } catch { /* ignore email errors */ }
}

export async function GET(req: NextRequest) {
  const username = await requireUsername(req);
  if (!username) return NextResponse.json({ ok: false }, { status: 200 });

  const db = getDb();
  await ensureCoreSchemas(db);
  const r = await db.execute({ sql: "SELECT username, email, email_verified_at FROM users WHERE username = ?", args: [username] });
  const row = r.rows[0] as any;
  return NextResponse.json({ ok: true, profile: {
    username,
    email: row?.email ?? null,
    emailVerified: !!row?.email_verified_at,
  }});
}

export async function PUT(req: NextRequest) {
  const username = await requireUsername(req);
  if (!username) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

  let body: any; try { body = await req.json(); } catch { return NextResponse.json({ ok:false, reason:"invalid_json" }, { status:400 }); }
  const email = (body?.email || "").toString().trim();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ ok:false, reason:"invalid_email" }, { status:400 });
  }

  const db = getDb();
  await ensureCoreSchemas(db);
  await db.execute({ sql: "UPDATE users SET email = ?, email_verified_at = NULL WHERE username = ?", args: [email, username] });

  const token = crypto.randomUUID().replace(/-/g, "") + Math.random().toString(36).slice(2, 10);
  const exp = new Date(Date.now() + 1000*60*60*24).toISOString(); // 24h
  await db.execute({
    sql: `INSERT INTO user_email_verifications (username, token, expires_at, created_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(username) DO UPDATE SET token=excluded.token, expires_at=excluded.expires_at, created_at=excluded.created_at`,
    args: [username, token, exp, new Date().toISOString()],
  });

  await sendVerificationEmail(req, username, email, token);
  return NextResponse.json({ ok: true });
}
