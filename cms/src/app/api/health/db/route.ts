import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await query<{
      current_user: string;
      current_database: string;
      now: Date;
    }>("SELECT current_user, current_database(), NOW() AS now");
    const row = result.rows[0];
    return NextResponse.json({
      ok: true,
      user: row.current_user,
      database: row.current_database,
      now: row.now,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database check failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
