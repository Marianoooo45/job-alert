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
    // Important: ne jette l'erreur qu'à l'exécution (pas au top-level)
    throw new Error("LIBSQL_DB_URL is missing");
  }
  return createClient({ url, authToken });
}

async function ensureSchema(c: Client) {
  await c.execute(`
    CREATE TABLE IF NOT EXISTS user_alerts (
      username TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (username)
    );
  `);
}

/* ====== GET: lire alertes ====== */
export async function GET(req: NextRequest) {
  const username = await requireUsername(req);
  if (!username) {
    return NextResponse.json({ ok: false, reason: "unauthenticated", alerts: [] }, { status: 200 });
  }

  try {
    const db = getClient();
    await ensureSchema(db);

    const row = await db.execute({
      sql: "SELECT data FROM user_alerts WHERE username = ?",
      args: [username],
    });

    const json = row.rows[0]?.data as string | undefined;
    const alerts = json ? JSON.parse(json) : [];
    return NextResponse.json({ ok: true, alerts }, { status: 200 });
  } catch (e: any) {
    // On ne casse pas l’UI : on renvoie une liste vide.
    return NextResponse.json({ ok: false, reason: e?.message ?? "db_error", alerts: [] }, { status: 200 });
  }
}

/* ====== PUT: sauvegarder alertes ====== */
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

  const alerts = Array.isArray(body?.alerts) ? body.alerts : null;
  if (!alerts) {
    return NextResponse.json({ ok: false, reason: "invalid_payload" }, { status: 400 });
  }

  try {
    const db = getClient();
    await ensureSchema(db);

    await db.execute({
      sql: `
        INSERT INTO user_alerts (username, data, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(username) DO UPDATE SET
          data = excluded.data,
          updated_at = excluded.updated_at;
      `,
      args: [username, JSON.stringify(alerts), new Date().toISOString()],
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    // Vercel “read-only” si tu pointes un sqlite local : d’où l’usage de libsql/Turso
    return NextResponse.json({ ok: false, reason: e?.message ?? "db_error" }, { status: 500 });
  }
}
