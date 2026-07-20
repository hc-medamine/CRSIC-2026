import { NextRequest, NextResponse } from "next/server";
import { getSession, sessionTimeoutMs } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { query } from "@/lib/db";
import {
  allOrgUnitIds,
  listUsers,
  replaceUserScopes,
  type ContentType,
  type UserRole,
} from "@/lib/users";

export const runtime = "nodejs";

const CONTENT_TYPES: ContentType[] = ["news", "event", "publication"];

async function requireSuperAdminApi() {
  const session = await getSession();
  const user = session.user;
  if (!user || user.role !== "super_admin" || !session.lastActivityAt) return null;
  if (Date.now() - session.lastActivityAt > sessionTimeoutMs()) return null;
  return user;
}

export async function GET() {
  const admin = await requireSuperAdminApi();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  const users = await listUsers();
  return NextResponse.json({ ok: true, users });
}

export async function POST(request: NextRequest) {
  const admin = await requireSuperAdminApi();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      displayName?: string;
      nameAr?: string;
      nameEn?: string;
      role?: UserRole;
      orgUnitIds?: string[];
      contentTypes?: ContentType[];
    };

    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    const displayName = body.displayName?.trim() ?? "";
    const role = body.role;

    if (!email || !password || !displayName || !role) {
      return NextResponse.json(
        { ok: false, error: "email, password, displayName, and role are required." },
        { status: 400 },
      );
    }
    if (!["super_admin", "editor", "reviewer"].includes(role)) {
      return NextResponse.json({ ok: false, error: "Invalid role." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { ok: false, error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    let orgUnitIds = body.orgUnitIds ?? [];
    let contentTypes = (body.contentTypes ?? []).filter((t) => CONTENT_TYPES.includes(t));

    if (role === "reviewer") {
      orgUnitIds = await allOrgUnitIds();
      if (contentTypes.length === 0) contentTypes = [...CONTENT_TYPES];
    }
    if (role === "super_admin") {
      orgUnitIds = await allOrgUnitIds();
      contentTypes = [...CONTENT_TYPES];
    }
    if (role === "editor" && (orgUnitIds.length === 0 || contentTypes.length === 0)) {
      return NextResponse.json(
        { ok: false, error: "Editors need at least one org unit and one content type." },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(password);
    const inserted = await query<{ id: string }>(
      `INSERT INTO users (email, password_hash, display_name, name_ar, name_en, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        email,
        passwordHash,
        displayName,
        body.nameAr?.trim() || null,
        body.nameEn?.trim() || null,
        role,
      ],
    );
    const userId = inserted.rows[0].id;
    await replaceUserScopes(userId, orgUnitIds, contentTypes);

    return NextResponse.json({ ok: true, id: userId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    if (message.includes("unique") || message.includes("duplicate")) {
      return NextResponse.json({ ok: false, error: "Email already exists." }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
