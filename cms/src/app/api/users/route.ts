import { NextRequest, NextResponse } from "next/server";
import { getSession, sessionTimeoutMs } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { query } from "@/lib/db";
import { clientMeta, writeAudit } from "@/lib/audit";
import {
  ALL_CONTENT_TYPES,
  allOrgUnitIds,
  assertEditorContentTypesExclusive,
  assertEditorTypesAllowedByOrgs,
  assertReviewerOrgsExclusive,
  listUsers,
  replaceUserScopes,
  type ContentType,
  type UserRole,
} from "@/lib/users";

export const runtime = "nodejs";

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
  const meta = clientMeta(request);

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
    let contentTypes = (body.contentTypes ?? []).filter((t) => ALL_CONTENT_TYPES.includes(t));

    if (role === "super_admin") {
      orgUnitIds = await allOrgUnitIds();
      contentTypes = [...ALL_CONTENT_TYPES];
    }
    if (role === "reviewer") {
      if (orgUnitIds.length === 0) {
        return NextResponse.json(
          { ok: false, error: "Reviewers need at least one exclusive org unit." },
          { status: 400 },
        );
      }
      contentTypes = [...ALL_CONTENT_TYPES];
    }
    if (role === "editor" && (orgUnitIds.length === 0 || contentTypes.length === 0)) {
      return NextResponse.json(
        { ok: false, error: "Editors need at least one org unit and one content type." },
        { status: 400 },
      );
    }

    // Pre-flight: run the same guardrail assertions replaceUserScopes() enforces,
    // BEFORE the user row exists. The sentinel id matches no real user, so every
    // existing desk holder is reported as a conflict. Without this, a desk
    // conflict threw after the INSERT had already committed — the "failed"
    // create stayed in the DB and appeared as a phantom login bubble
    // (Phase-3 walkthrough finding, 2026-09-21).
    const PENDING_USER_SENTINEL = "00000000-0000-0000-0000-000000000000";
    if (role === "reviewer") {
      await assertReviewerOrgsExclusive(PENDING_USER_SENTINEL, orgUnitIds);
    }
    if (role === "editor") {
      await assertEditorTypesAllowedByOrgs(orgUnitIds, contentTypes);
      await assertEditorContentTypesExclusive(PENDING_USER_SENTINEL, contentTypes, orgUnitIds);
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
    try {
      await replaceUserScopes(userId, orgUnitIds, contentTypes, { role });

      await writeAudit({
        actor: admin,
        action: "user.create",
        entityType: "user",
        entityId: userId,
        summary: `Created user ${email} (${role})`,
        metadata: { email, role, orgUnitIds, contentTypes },
        ...meta,
      });
    } catch (err) {
      // Compensating rollback: any failure after the INSERT (desk conflict that
      // slips past pre-flight, scope write, audit) must not leave a half-created
      // user behind — otherwise it shows up as a phantom login bubble.
      for (const sql of [
        `DELETE FROM user_org_scopes WHERE user_id = $1`,
        `DELETE FROM user_content_scopes WHERE user_id = $1`,
        `DELETE FROM editor_content_type_claims WHERE editor_id = $1`,
        `DELETE FROM reviewer_org_claims WHERE reviewer_id = $1`,
        `DELETE FROM users WHERE id = $1`,
      ]) {
        await query(sql, [userId]).catch((cleanupErr) => {
          console.error("user create rollback failed for", userId, cleanupErr);
        });
      }
      throw err;
    }

    return NextResponse.json({ ok: true, id: userId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    if (message.includes("unique") || message.includes("duplicate")) {
      return NextResponse.json({ ok: false, error: "Email already exists." }, { status: 409 });
    }
    if (message.includes("already assigned to another reviewer")) {
      return NextResponse.json({ ok: false, error: message }, { status: 409 });
    }
    if (
      message.includes("already assigned to another editor") ||
      message.includes("not allowed by selected org")
    ) {
      return NextResponse.json({ ok: false, error: message }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
