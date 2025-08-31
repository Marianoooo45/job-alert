import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { createClient, Client } from "@libsql/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ===== helpers auth/db ===== */
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

function getClient(): Client {
  const url = process.env.LIBSQL_DB_URL;
  const authToken = process.env.LIBSQL_DB_AUTH_TOKEN;
  if (!url) {
    throw new Error("LIBSQL_DB_URL is missing");
  }
  return createClient({ url, authToken });
}

async function ensureSchema(c: Client) {
  await c.execute(`
    CREATE TABLE IF NOT EXISTS user_tracker (
      username TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (username)
    );
  `);
}

/* ====== GET: lire le tracker ====== */
export async function GET(req: NextRequest) {
  const username = await requireUsername(req);
  if (!username) {
    return NextResponse.json({ ok: false, reason: "unauthenticated", tracker: [] }, { status: 200 });
  }

  try {
    const db = getClient();
    await ensureSchema(db);

    const row = await db.execute({
      sql: "SELECT data FROM user_tracker WHERE username = ?",
      args: [username],
    });

    const json = row.rows[0]?.data as string | undefined;
    const tracker = json ? JSON.parse(json) : [];
    return NextResponse.json({ ok: true, tracker }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, reason: e?.message ?? "db_error", tracker: [] }, { status: 200 });
  }
}

/* ====== PUT: sauvegarder le tracker ====== */
export async function PUT(req: NextRequest) {
  const username = await requireUsername(req);
  if (!username) {
    return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }

  const tracker = Array.isArray(body?.tracker) ? body.tracker : null;
  if (!tracker) {
    return NextResponse.json({ ok: false, reason: "invalid_payload" }, { status: 400 });
  }

  try {
    const db = getClient();
    await ensureSchema(db);

    await db.execute({
      sql: `
        INSERT INTO user_tracker (username, data, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(username) DO UPDATE SET
          data = excluded.data,
          updated_at = excluded.updated_at;
      `,
      args: [username, JSON.stringify(tracker), new Date().toISOString()],
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, reason: e?.message ?? "db_error" }, { status: 500 });
  }
}
