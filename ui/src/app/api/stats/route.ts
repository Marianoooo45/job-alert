import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ResultSet } from '@libsql/client';

export async function GET() {
  try {
    const db = getDb();
    // Quick check to see if the table exists, and how many jobs in total
    const rs: ResultSet = await db.execute("SELECT bank, COUNT(*) as count FROM jobs GROUP BY bank ORDER BY count DESC");

    const stats = rs.rows.map(row => ({
      bank: row.bank,
      count: row.count
    }));

    return NextResponse.json(stats);
  } catch (e: any) {
    console.error("Error fetching stats:", e.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
