// =============================
// ui/src/app/api/account/channels/route.ts
// =============================
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getDb, ensureCoreSchemas } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireUsername(req: NextRequest): Promise<string | null> {
  try {
    const t = req.cookies.get("ja_session")?.value;
    if (!t) return null;
    const s = new TextEncoder().encode(process.env.AUTH_SECRET || "");
    const { payload } = await jwtVerify(t, s);
    return (payload.sub ?? "").toString() || null;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const username = await requireUsername(req);
  if (!username) return NextResponse.json({ ok:false, channels:null }, { status:200 });

  const db = getDb(); await ensureCoreSchemas(db);
  const r = await db.execute({
    sql: `SELECT discord_webhook_url, quiet_hours_start, quiet_hours_end, timezone, selected_alert_id
          FROM user_settings WHERE username = ?`,
    args:[username],
  });
  const row = r.rows[0] as any;

  const channels = {
    discordWebhookUrl: row?.discord_webhook_url || "",
    quietHoursStart: row?.quiet_hours_start || "22:00",
    quietHoursEnd: row?.quiet_hours_end || "08:00",
    timezone: row?.timezone || "Europe/Paris",
    selectedAlertId: row?.selected_alert_id || "", // 👈 renvoi de l’alerte cible
  };
  return NextResponse.json({ ok:true, channels });
}

export async function PUT(req: NextRequest) {
  const username = await requireUsername(req);
  if (!username) return NextResponse.json({ ok:false, reason:"unauthenticated" }, { status:401 });

  let body:any; try { body = await req.json(); } catch { return NextResponse.json({ ok:false, reason:"invalid_json" }, { status:400 }); }

  const db = getDb(); await ensureCoreSchemas(db);
  await db.execute({
    sql: `INSERT INTO user_settings (username, discord_webhook_url, quiet_hours_start, quiet_hours_end, timezone, selected_alert_id, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(username) DO UPDATE SET
            discord_webhook_url=excluded.discord_webhook_url,
            quiet_hours_start=excluded.quiet_hours_start,
            quiet_hours_end=excluded.quiet_hours_end,
            timezone=excluded.timezone,
            selected_alert_id=excluded.selected_alert_id,
            updated_at=excluded.updated_at`,
    args:[
      username,
      (body.discordWebhookUrl||"").toString(),
      (body.quietHoursStart||"22:00").toString(),
      (body.quietHoursEnd||"08:00").toString(),
      (body.timezone||"Europe/Paris").toString(),
      (body.selectedAlertId||"").toString(), // 👈 stockage alerte cible
      new Date().toISOString()
    ],
  });
  return NextResponse.json({ ok:true });
}
