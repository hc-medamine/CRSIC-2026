import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  role: "super_admin" | "editor" | "reviewer";
  is_active: boolean;
};

export async function POST(request: Request) {
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
      return NextResponse.json({ ok: false, error: "Invalid email or password." }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ ok: false, error: "Invalid email or password." }, { status: 401 });
    }

    const session = await getSession();
    session.user = {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
    };
    session.lastActivityAt = Date.now();
    await session.save();

    return NextResponse.json({
      ok: true,
      user: {
        email: user.email,
        displayName: user.display_name,
        role: user.role,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
