// ui/src/lib/db.ts
import { createClient, Client } from "@libsql/client";

export function getDb(): Client {
  const url = process.env.LIBSQL_DB_URL;
  const authToken = process.env.LIBSQL_DB_AUTH_TOKEN;
  if (!url) throw new Error("LIBSQL_DB_URL is missing");
  return createClient({ url, authToken });
}

export async function ensureAuthSchema(db: Client) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}
