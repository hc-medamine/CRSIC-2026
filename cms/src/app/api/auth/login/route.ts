import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { getSessionForRoute } from "@/lib/auth/session";
import { clientMeta, writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  role: "super_admin" | "editor" | "reviewer";
  is_active: boolean;
};

export async function POST(request: NextRequest) {
  const meta = clientMeta(request);
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "Email and password are required." }, { status: 400 });
    }

    const result = await query<UserRow>(
      `SELECT id, email, password_hash, display_name, role, is_active
       FROM users WHERE email = $1 LIMIT 1`,
      [email],
    );
    const user = result.rows[0];

    if (!user || !user.is_active) {
      await writeAudit({
        actorEmail: email,
        action: "auth.login.fail",
        summary: "Login failed (unknown user or inactive)",
        metadata: { reason: !user ? "not_found" : "inactive" },
        ...meta,
      });
      return NextResponse.json({ ok: false, error: "Invalid email or password." }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      await writeAudit({
        actorEmail: email,
        actor: { id: user.id, email: user.email, displayName: user.display_name, role: user.role },
        action: "auth.login.fail",
        summary: "Login failed (bad password)",
        metadata: { reason: "bad_password" },
        ...meta,
      });
      return NextResponse.json({ ok: false, error: "Invalid email or password." }, { status: 401 });
    }

    const { refreshUserFromDb } = await import("@/lib/content/ooo");
    const fresh = (await refreshUserFromDb(user.id)) ?? {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
    };

    const response = NextResponse.json({
      ok: true,
      user: {
        email: fresh.email,
        displayName: fresh.displayName,
        role: fresh.role,
      },
    });

    const session = await getSessionForRoute(request, response);
    session.user = fresh;
    session.lastActivityAt = Date.now();
    await session.save();

    await writeAudit({
      actor: session.user,
      action: "auth.login.success",
      summary: `Login success for ${user.email}`,
      ...meta,
    });

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
