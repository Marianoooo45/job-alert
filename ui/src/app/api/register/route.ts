import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

const dbPath = path.join(process.cwd(), "..", "storage", "users.db");

function ensureSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const form = await req.formData();
  const username = (form.get("username") || "").toString().trim();
  const password = (form.get("password") || "").toString();
  const next = (form.get("next") || "/").toString();

  // Validation simple
  if (!username || username.length < 3 || !password || password.length < 6) {
    url.pathname = "/register";
    url.searchParams.set("error", "invalid");
    url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }

  // Création / vérif user
  const db = new Database(dbPath);
  ensureSchema(db);

  try {
    const row = db
      .prepare("SELECT id FROM users WHERE username = ?")
      .get(username) as { id: number } | undefined;

    if (row) {
      // Utilisateur déjà existant -> redirect avec message
      url.pathname = "/register";
      url.searchParams.set("error", "exists");
      url.searchParams.set("next", next);
      return NextResponse.redirect(url);
    }

    const hash = await bcrypt.hash(password, 12);
    db.prepare(
      "INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)"
    ).run(username, hash, new Date().toISOString());
  } catch (e) {
    // fallback erreur générique
    url.pathname = "/register";
    url.searchParams.set("error", "server");
    url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  } finally {
    db.close();
  }

  // Auto-login: crée le JWT ici et set le cookie HttpOnly, puis redirige vers `next`
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    url.pathname = "/register";
    url.searchParams.set("error", "server");
    url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }

  const token = await new SignJWT({ sub: username })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(secret));

  const redirectTo = new URL(next, req.url);
  const res = NextResponse.redirect(redirectTo);
  res.cookies.set("ja_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
