// ui/src/app/api/login/route.ts
import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { getDb, ensureAuthSchema } from "@/src/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function checkDbUser(username: string, password: string): Promise<boolean> {
  try {
    const db = getDb();
    await ensureAuthSchema(db);
    const r = await db.execute({
      sql: "SELECT password_hash FROM users WHERE username = ?",
      args: [username],
    });
    const hash = (r.rows[0]?.password_hash as string) ?? null;
    if (!hash) return false;
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const form = await req.formData();
  const username = (form.get("username") || "").toString().trim();
  const password = (form.get("password") || "").toString();
  const next = (form.get("next") || "/").toString();

  const secret = process.env.AUTH_SECRET;
  if (!secret) return new NextResponse("AUTH_SECRET manquant", { status: 500 });

  // 1) essayer DB
  let isValid = await checkDbUser(username, password);

  // 2) fallback ENV (optionnel)
  if (!isValid) {
    const expectedUser = process.env.AUTH_USERNAME || "admin";
    if (process.env.AUTH_PASSWORD_HASH) {
      isValid =
        username === expectedUser &&
        (await bcrypt.compare(password, process.env.AUTH_PASSWORD_HASH));
    } else if (process.env.AUTH_PASSWORD) {
      isValid = username === expectedUser && password === process.env.AUTH_PASSWORD;
    }
  }

  if (!isValid) {
    const url = new URL("/login", req.url);
    url.searchParams.set("error", "1");
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
