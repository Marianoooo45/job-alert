// =============================
// ui/src/lib/db.ts  (AJOUT d’une colonne pour l’alerte cible)
// =============================
import { createClient, Client } from "@libsql/client";

export function getDb(): Client {
  const url = process.env.LIBSQL_DB_URL;
  const authToken = process.env.LIBSQL_DB_AUTH_TOKEN;
  if (!url) throw new Error("LIBSQL_DB_URL is missing");
  return createClient({ url, authToken });
}

export async function ensureCoreSchemas(db: Client) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email TEXT,
      email_verified_at TEXT,
      created_at TEXT NOT NULL
    );
  `);
  for (const col of [
    "ALTER TABLE users ADD COLUMN email TEXT",
    "ALTER TABLE users ADD COLUMN email_verified_at TEXT",
  ]) { try { await db.execute(col); } catch {} }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_settings (
      username TEXT PRIMARY KEY,
      discord_webhook_url TEXT,
      quiet_hours_start TEXT,
      quiet_hours_end TEXT,
      timezone TEXT,
      selected_alert_id TEXT,     -- 👈 nouvelle colonne
      default_filters TEXT,
      default_sort TEXT,
      rows_per_page INTEGER,
      compact_mode INTEGER,
      favorite_banks TEXT,
      default_country TEXT,
      updated_at TEXT NOT NULL
    );
  `);
  for (const q of [
    "ALTER TABLE user_settings ADD COLUMN discord_webhook_url TEXT",
    "ALTER TABLE user_settings ADD COLUMN quiet_hours_start TEXT",
    "ALTER TABLE user_settings ADD COLUMN quiet_hours_end TEXT",
    "ALTER TABLE user_settings ADD COLUMN timezone TEXT",
    "ALTER TABLE user_settings ADD COLUMN selected_alert_id TEXT", // 👈 safe-add
    "ALTER TABLE user_settings ADD COLUMN default_filters TEXT",
    "ALTER TABLE user_settings ADD COLUMN default_sort TEXT",
    "ALTER TABLE user_settings ADD COLUMN rows_per_page INTEGER",
    "ALTER TABLE user_settings ADD COLUMN compact_mode INTEGER",
    "ALTER TABLE user_settings ADD COLUMN favorite_banks TEXT",
    "ALTER TABLE user_settings ADD COLUMN default_country TEXT",
  ]) { try { await db.execute(q); } catch {} }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_email_verifications (
      username TEXT PRIMARY KEY,
      token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}
