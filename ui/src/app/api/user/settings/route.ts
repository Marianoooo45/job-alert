// ui/src/app/api/user/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { createClient } from "@libsql/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getClient() {
  const url = process.env.LIBSQL_DB_URL!;
  const authToken = process.env.LIBSQL_DB_AUTH_TOKEN;
  return createClient({ url, authToken });
}

async function ensureSchema(db: ReturnType<typeof createClient>) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_settings (
      username TEXT PRIMARY KEY,
      notif_email INTEGER NOT NULL DEFAULT 0,
      public_profile INTEGER NOT NULL DEFAULT 0,
      auto_update INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
  `);
}

async function requireUsername(req: NextRequest): Promise<string | null> {
  try {
    const token = req.cookies.get("ja_session")?.value;
    if (!token) return null;
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "");
    const { payload } = await jwtVerify(token, secret);
    const username = (payload.sub ?? "").toString();
    return username || null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const username = await requireUsername(req);
  if (!username) return NextResponse.json({ ok: false, settings: null }, { status: 200 });

  try {
    const db = getClient();
    await ensureSchema(db);
    const r = await db.execute({
      sql: `SELECT notif_email, public_profile, auto_update FROM user_settings WHERE username = ?`,
      args: [username],
    });
    const row = r.rows[0];
    const settings = row ? {
      notifEmail: !!row.notif_email,
      publicProfile: !!row.public_profile,
      autoUpdate: !!row.auto_update,
    } : { notifEmail: false, publicProfile: false, autoUpdate: false };
    return NextResponse.json({ ok: true, settings }, { status: 200 });
  } catch (e:any) {
    return NextResponse.json({ ok: false, reason: e?.message ?? "db_error", settings: null }, { status: 200 });
  }
}

export async function PUT(req: NextRequest) {
  const username = await requireUsername(req);
  if (!username) return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });

  let body:any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok:false, reason:"invalid_json" }, { status:400 }); }

  const notif = !!body?.notifEmail;
  const pub = !!body?.publicProfile;
  const auto = !!body?.autoUpdate;

  try {
    const db = getClient();
    await ensureSchema(db);
    await db.execute({
      sql: `
        INSERT INTO user_settings (username, notif_email, public_profile, auto_update, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(username) DO UPDATE SET
          notif_email = excluded.notif_email,
          public_profile = excluded.public_profile,
          auto_update = excluded.auto_update,
          updated_at = excluded.updated_at
      `,
      args: [username, notif ? 1 : 0, pub ? 1 : 0, auto ? 1 : 0, new Date().toISOString()],
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e:any) {
    return NextResponse.json({ ok:false, reason:e?.message ?? "db_error" }, { status:500 });
  }
}
