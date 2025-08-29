import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "..", "storage", "users.db");

async function checkDbUser(username: string, password: string): Promise<boolean> {
  try {
    const db = new Database(dbPath, { readonly: true, fileMustExist: false });
    const row = db
      .prepare("SELECT password_hash FROM users WHERE username = ?")
      .get(username) as { password_hash: string } | undefined;
    db.close();
    if (!row) return false;
    return await bcrypt.compare(password, row.password_hash);
  } catch {
    // DB absente ou autre: on considère false et on laissera le fallback .env jouer
    return false;
  }
}

export async function POST(req: Request) {
  const form = await req.formData();
  const username = (form.get("username") || "").toString().trim();
  const password = (form.get("password") || "").toString();
  const next = (form.get("next") || "/").toString();

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return new NextResponse("AUTH_SECRET manquant", { status: 500 });
  }

  // 1) DB users
  let isValid = await checkDbUser(username, password);

  // 2) Fallback .env (facile pour dev/admin)
  if (!isValid) {
    const expectedUser = process.env.AUTH_USERNAME || "admin";
    if (process.env.AUTH_PASSWORD_HASH) {
      isValid = username === expectedUser &&
        (await bcrypt.compare(password, process.env.AUTH_PASSWORD_HASH));
    } else if (process.env.AUTH_PASSWORD) {
      isValid = username === expectedUser && password === process.env.AUTH_PASSWORD;
    }
  }

  if (!isValid) {
    const url = new URL("/login", req.url);
    url.searchParams.set("error", "1");
    url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }

  const token = await new SignJWT({ sub: username })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(secret));

  const res = NextResponse.redirect(new URL(next, req.url));
  res.cookies.set("ja_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
