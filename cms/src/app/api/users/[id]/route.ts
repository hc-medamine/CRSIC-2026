import { NextRequest, NextResponse } from "next/server";
import { getSession, sessionTimeoutMs } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { query } from "@/lib/db";
import { clientMeta, writeAudit } from "@/lib/audit";
import {
  ALL_CONTENT_TYPES,
  allOrgUnitIds,
  hardDeleteUser,
  replaceUserScopes,
  updateEditorContentTypesOnly,
  type ContentType,
  type UserRole,
} from "@/lib/users";

export const runtime = "nodejs";

async function requireSessionUser() {
  const session = await getSession();
  if (!session.user || !session.lastActivityAt) return null;
  if (Date.now() - session.lastActivityAt > sessionTimeoutMs()) return null;
  return session.user;
}

async function requireSuperAdminApi() {
  const user = await requireSessionUser();
  if (!user || user.role !== "super_admin") return null;
  return user;
}

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const actor = await requireSessionUser();
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
  }
  const meta = clientMeta(request);
  const { id } = await params;

  try {
    const body = (await request.json()) as {
      action?:
        | "deactivate"
        | "activate"
        | "reset_password"
        | "update_scopes"
        | "update_profile"
        | "update_editor_content_types"
        | "delete";
      password?: string;
      orgUnitIds?: string[];
      contentTypes?: ContentType[];
      displayName?: string;
      nameAr?: string;
      nameEn?: string;
      role?: UserRole;
      reassignToUserId?: string;
      confirmEmail?: string;
    };

    // Reviewer light manager — content types on assigned editors only
    if (body.action === "update_editor_content_types") {
      if (actor.role !== "reviewer" && actor.role !== "super_admin") {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }
      await updateEditorContentTypesOnly(actor, id, body.contentTypes ?? []);
      return NextResponse.json({ ok: true });
    }

    const admin = await requireSuperAdminApi();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    if (body.action === "delete") {
      await hardDeleteUser(admin, id, {
        reassignToUserId: body.reassignToUserId,
        confirmEmail: body.confirmEmail,
      });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "deactivate" || body.action === "activate") {
      if (id === admin.id && body.action === "deactivate") {
        return NextResponse.json(
          { ok: false, error: "You cannot deactivate your own account." },
          { status: 400 },
        );
      }
      await query(`UPDATE users SET is_active = $2, updated_at = NOW() WHERE id = $1`, [
        id,
        body.action === "activate",
      ]);
      await writeAudit({
        actor: admin,
        action: body.action === "activate" ? "user.activate" : "user.deactivate",
        entityType: "user",
        entityId: id,
        summary: `${body.action} user ${id}`,
        ...meta,
      });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "reset_password") {
      const password = body.password ?? "";
      if (password.length < 8) {
        return NextResponse.json(
          { ok: false, error: "Password must be at least 8 characters." },
          { status: 400 },
        );
      }
      const passwordHash = await hashPassword(password);
      await query(
        `UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1`,
        [id, passwordHash],
      );
      await writeAudit({
        actor: admin,
        action: "user.reset_password",
        entityType: "user",
        entityId: id,
        summary: `Password reset for user ${id}`,
        ...meta,
      });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "update_scopes") {
      const roleResult = await query<{ role: UserRole }>(
        `SELECT role FROM users WHERE id = $1`,
        [id],
      );
      const role = roleResult.rows[0]?.role;
      if (!role) {
        return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
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

      await replaceUserScopes(id, orgUnitIds, contentTypes, { role });
      await writeAudit({
        actor: admin,
        action: "user.update_scopes",
        entityType: "user",
        entityId: id,
        summary: `Updated scopes for user ${id}`,
        metadata: { orgUnitIds, contentTypes, by: "super_admin" },
        ...meta,
      });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "update_profile") {
      const displayName = body.displayName?.trim();
      if (!displayName) {
        return NextResponse.json({ ok: false, error: "displayName is required." }, { status: 400 });
      }
      await query(
        `UPDATE users SET display_name = $2, name_ar = $3, name_en = $4, updated_at = NOW()
         WHERE id = $1`,
        [id, displayName, body.nameAr?.trim() || null, body.nameEn?.trim() || null],
      );
      await writeAudit({
        actor: admin,
        action: "user.update_profile",
        entityType: "user",
        entityId: id,
        summary: `Admin updated profile for user ${id}`,
        ...meta,
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    const status =
      message.includes("Forbidden")
        ? 403
        : message.includes("already assigned") || message.includes("not allowed by selected org")
          ? 409
          : message.includes("need at least") || message.includes("required")
            ? 400
            : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
