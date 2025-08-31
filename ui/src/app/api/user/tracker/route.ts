import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dbFile() {
  const dir = path.join(process.cwd(), "storage");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "users.db");
}

function ensureSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_data (
      user TEXT PRIMARY KEY,
      alerts_json TEXT NOT NULL DEFAULT '[]',
      tracker_json TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL
    );
  `);
}

async function getUser(req: NextRequest) {
  const token = req.cookies.get("ja_session")?.value;
  if (!token) return null;
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "");
  try {
    const { payload } = await jwtVerify(token, secret);
    const username = (payload.sub || "").toString();
    return username || null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = new Database(dbFile());
  ensureSchema(db);
  try {
    const row = db
      .prepare("SELECT tracker_json FROM user_data WHERE user = ?")
      .get(user) as { tracker_json: string } | undefined;
    const tracker = row ? JSON.parse(row.tracker_json || "[]") : [];
    return NextResponse.json({ tracker });
  } finally {
    db.close();
  }
}

export async function PUT(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const tracker = (body as any)?.tracker;
  if (!Array.isArray(tracker)) {
    return NextResponse.json({ error: "tracker must be an array" }, { status: 400 });
  }

  const db = new Database(dbFile());
  ensureSchema(db);
  try {
    const now = new Date().toISOString();
    const json = JSON.stringify(tracker);
    const exists = db.prepare("SELECT 1 FROM user_data WHERE user = ?").get(user);
    if (exists) {
      db.prepare("UPDATE user_data SET tracker_json = ?, updated_at = ? WHERE user = ?")
        .run(json, now, user);
    } else {
      db.prepare("INSERT INTO user_data (user, alerts_json, tracker_json, updated_at) VALUES (?, '[]', ?, ?)")
        .run(user, json, now);
    }
    return NextResponse.json({ ok: true });
  } finally {
    db.close();
  }
}
