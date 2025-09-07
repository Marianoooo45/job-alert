// ui/src/app/api/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
// ⬇️ si ton alias n'est pas sûr, utilise un import RELATIF
// import { getDb, ensureAuthSchema } from "@/src/lib/db";
import { getDb, ensureCoreSchemas } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const form = await req.formData();
  const username = (form.get("username") || "").toString().trim();
  const password = (form.get("password") || "").toString();
  const next = (form.get("next") || "/").toString();

  if (!username || username.length < 3 || !password || password.length < 6) {
    url.pathname = "/register";
    url.searchParams.set("error", "invalid");
    url.searchParams.set("next", next);
    return NextResponse.redirect(url, { status: 303 });
  }

  try {
    const db = getDb();
    await ensureCoreSchemas(db);

    const r = await db.execute({
      sql: "SELECT id FROM users WHERE username = ?",
      args: [username],
    });

    if (r.rows?.[0]?.id) {
      url.pathname = "/register";
      url.searchParams.set("error", "exists");
      url.searchParams.set("next", next);
      return NextResponse.redirect(url, { status: 303 });
    }

    const hash = await bcrypt.hash(password, 12);
    await db.execute({
      sql: "INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)",
      args: [username, hash, new Date().toISOString()],
    });
  } catch (e: any) {
    console.error("REGISTER DB ERROR:", e); // ⬅️ visible dans Vercel Logs
    url.pathname = "/register";
    url.searchParams.set("error", "server");
    url.searchParams.set("reason", e?.message ?? "unknown"); // ⬅️ remonte la cause
    url.searchParams.set("next", next);
    return NextResponse.redirect(url, { status: 303 });
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    console.error("REGISTER ERROR: AUTH_SECRET missing");
    url.pathname = "/register";
    url.searchParams.set("error", "server");
    url.searchParams.set("reason", "AUTH_SECRET missing");
    url.searchParams.set("next", next);
    return NextResponse.redirect(url, { status: 303 });
  }

  const token = await new SignJWT({ sub: username })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(secret));

  const res = NextResponse.redirect(new URL(next, req.url), { status: 303 });
  res.cookies.set("ja_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
