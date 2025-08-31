import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { requireSession } from "@/lib/auth";

export const runtime = "nodejs"; // ensure Node runtime (not Edge)

const client = createClient({
  url: process.env.LIBSQL_DB_URL!,
  authToken: process.env.LIBSQL_DB_AUTH_TOKEN!,
});

// Create table once per cold start
let ensured = false;
async function ensureSchema() {
  if (ensured) return;
  await client.execute(`
    CREATE TABLE IF NOT EXISTS user_data (
      username TEXT PRIMARY KEY,
      alerts_json TEXT DEFAULT '{}',
      tracker_json TEXT DEFAULT '{}',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
  ensured = true;
}

export async function GET() {
  const session = await requireSession();
  if (!session?.username) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await ensureSchema();

  const { rows } = await client.execute({
    sql: "SELECT tracker_json FROM user_data WHERE username = ?",
    args: [session.username],
  });

  const row = rows[0] as any;
  const tracker = row?.tracker_json ? safeParse(row.tracker_json) : {};
  return NextResponse.json(tracker ?? {});
}

export async function PUT(req: NextRequest) {
  const session = await requireSession();
  if (!session?.username) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await ensureSchema();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // light validation: must be an object
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const payload = JSON.stringify(body);

  await client.execute({
    sql: `
      INSERT INTO user_data (username, tracker_json, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(username) DO UPDATE SET
        tracker_json = excluded.tracker_json,
        updated_at = CURRENT_TIMESTAMP
    `,
    args: [session.username, payload],
  });

  return NextResponse.json({ ok: true });
}

function safeParse(s: string) {
  try { return JSON.parse(s); } catch { return {}; }
}
