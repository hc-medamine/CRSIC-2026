import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";

export type UserRole = "super_admin" | "editor" | "reviewer";
export type ContentType = "news" | "event" | "publication";

export type OrgUnit = {
  id: string;
  name_ar: string;
  name_en: string;
  kind: "centre_wide" | "research_dept";
  sort_order: number;
};

export type ManagedUser = {
  id: string;
  email: string;
  display_name: string;
  name_ar: string | null;
  name_en: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  org_unit_ids: string[];
  content_types: ContentType[];
};

export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "super_admin") {
    redirect("/dashboard");
  }
  return user;
}

export async function listOrgUnits(): Promise<OrgUnit[]> {
  const result = await query<OrgUnit>(
    `SELECT id, name_ar, name_en, kind, sort_order FROM org_units ORDER BY sort_order`,
  );
  return result.rows;
}

export async function listUsers(): Promise<ManagedUser[]> {
  const users = await query<{
    id: string;
    email: string;
    display_name: string;
    name_ar: string | null;
    name_en: string | null;
    role: UserRole;
    is_active: boolean;
    created_at: Date;
  }>(
    `SELECT id, email, display_name, name_ar, name_en, role, is_active, created_at
     FROM users
     ORDER BY created_at ASC`,
  );

  const orgs = await query<{ user_id: string; org_unit_id: string }>(
    `SELECT user_id, org_unit_id FROM user_org_scopes`,
  );
  const types = await query<{ user_id: string; content_type: ContentType }>(
    `SELECT user_id, content_type FROM user_content_scopes`,
  );

  const orgMap = new Map<string, string[]>();
  for (const row of orgs.rows) {
    const list = orgMap.get(row.user_id) ?? [];
    list.push(row.org_unit_id);
    orgMap.set(row.user_id, list);
  }
  const typeMap = new Map<string, ContentType[]>();
  for (const row of types.rows) {
    const list = typeMap.get(row.user_id) ?? [];
    list.push(row.content_type);
    typeMap.set(row.user_id, list);
  }

  return users.rows.map((u) => ({
    id: u.id,
    email: u.email,
    display_name: u.display_name,
    name_ar: u.name_ar,
    name_en: u.name_en,
    role: u.role,
    is_active: u.is_active,
    created_at: u.created_at.toISOString(),
    org_unit_ids: orgMap.get(u.id) ?? [],
    content_types: typeMap.get(u.id) ?? [],
  }));
}

export async function replaceUserScopes(
  userId: string,
  orgUnitIds: string[],
  contentTypes: ContentType[],
) {
  await query(`DELETE FROM user_org_scopes WHERE user_id = $1`, [userId]);
  await query(`DELETE FROM user_content_scopes WHERE user_id = $1`, [userId]);

  for (const orgId of orgUnitIds) {
    await query(`INSERT INTO user_org_scopes (user_id, org_unit_id) VALUES ($1, $2)`, [
      userId,
      orgId,
    ]);
  }
  for (const ct of contentTypes) {
    await query(`INSERT INTO user_content_scopes (user_id, content_type) VALUES ($1, $2)`, [
      userId,
      ct,
    ]);
  }
}

/** PRD: Reviewer = centre-wide + all research depts */
export async function allOrgUnitIds(): Promise<string[]> {
  const units = await listOrgUnits();
  return units.map((u) => u.id);
}
