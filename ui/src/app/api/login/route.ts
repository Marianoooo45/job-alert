// ui/src/app/api/login/route.ts
import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { getDb, ensureAuthSchema } from "../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DbCheck =
  | { ok: true; match: boolean }
  | { ok: false; reason: "db_error" | "no_hash" | "no_user" };

async function checkDbUser(username: string, password: string): Promise<DbCheck> {
  try {
    const db = getDb();
    await ensureAuthSchema(db);
    const r = await db.execute({
      sql: "SELECT password_hash FROM users WHERE username = ?",
      args: [username],
    });
    const row = r.rows?.[0];
    if (!row) return { ok: false, reason: "no_user" };

    const hash = (row.password_hash as string) ?? null;
    if (!hash) return { ok: false, reason: "no_hash" };

    const match = await bcrypt.compare(password, hash);
    return { ok: true, match };
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("checkDbUser error:", e);
    }
    return { ok: false, reason: "db_error" };
  }
}

export async function POST(req: Request) {
  const form = await req.formData();
  const username = (form.get("username") || "").toString().trim();
  const password = (form.get("password") || "").toString();
  const next = (form.get("next") || "/").toString();

  const secret = process.env.AUTH_SECRET;
  if (!secret) return new NextResponse("AUTH_SECRET manquant", { status: 500 });

  // 1) DB
  const dbRes = await checkDbUser(username, password);

  let isValid = false;
  let errCode: string | null = null;

  if (dbRes.ok) {
    isValid = dbRes.match;
    if (!isValid) errCode = "creds";
  } else {
    // DB down / user absent / pas de hash
    errCode = dbRes.reason;
  }

  // 2) fallback ENV si DB pas ok OU pas match
  if (!isValid) {
    const expectedUser = process.env.AUTH_USERNAME || "admin";
    const pwdHash = process.env.AUTH_PASSWORD_HASH;
    const pwd = process.env.AUTH_PASSWORD;

    if (pwdHash) {
      const envOk =
        username === expectedUser && (await bcrypt.compare(password, pwdHash));
      if (envOk) {
        isValid = true;
        errCode = null;
      }
    } else if (pwd) {
      const envOk = username === expectedUser && password === pwd;
      if (envOk) {
        isValid = true;
        errCode = null;
      }
    }
  }

  if (!isValid) {
    const url = new URL("/login", req.url);
    url.searchParams.set("error", errCode ?? "1"); // "creds" | "db_error" | "no_user" | "no_hash" | "1"
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
