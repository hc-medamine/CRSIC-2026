import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession, getSessionForRoute, sessionTimeoutMs } from "@/lib/auth/session";

export const runtime = "nodejs";

type ProfileRow = {
  email: string;
  display_name: string;
  name_ar: string | null;
  name_en: string | null;
  role: "super_admin" | "editor" | "reviewer";
};

export async function GET() {
  const session = await getSession();
  if (!session.user || !session.lastActivityAt) {
    return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
  }
  if (Date.now() - session.lastActivityAt > sessionTimeoutMs()) {
    return NextResponse.json({ ok: false, error: "Session expired" }, { status: 401 });
  }

  const result = await query<ProfileRow>(
    `SELECT email, display_name, name_ar, name_en, role
     FROM users WHERE id = $1 AND is_active = TRUE LIMIT 1`,
    [session.user.id],
  );
  const row = result.rows[0];
  if (!row) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    user: {
      email: row.email,
      displayName: row.display_name,
      nameAr: row.name_ar,
      nameEn: row.name_en,
      role: row.role,
    },
  });
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      displayName?: string;
      nameAr?: string;
      nameEn?: string;
    };
    const displayName = body.displayName?.trim() ?? "";
    if (!displayName) {
      return NextResponse.json({ ok: false, error: "Display name is required." }, { status: 400 });
    }

    const nameAr = body.nameAr?.trim() || null;
    const nameEn = body.nameEn?.trim() || null;

    const response = NextResponse.json({
      ok: true,
      user: {
        displayName,
        nameAr,
        nameEn,
      },
    });

    const session = await getSessionForRoute(request, response);
    if (!session.user || !session.lastActivityAt) {
      return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
    }
    if (Date.now() - session.lastActivityAt > sessionTimeoutMs()) {
      session.destroy();
      return NextResponse.json({ ok: false, error: "Session expired" }, { status: 401 });
    }

    await query(
      `UPDATE users
       SET display_name = $2, name_ar = $3, name_en = $4, updated_at = NOW()
       WHERE id = $1 AND is_active = TRUE`,
      [session.user.id, displayName, nameAr, nameEn],
    );

    session.user = {
      ...session.user,
      displayName,
    };
    session.lastActivityAt = Date.now();
    await session.save();

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
