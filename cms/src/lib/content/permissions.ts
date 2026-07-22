import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import type { ContentType } from "@/lib/users";

export async function getUserOrgIds(userId: string): Promise<string[]> {
  const result = await query<{ org_unit_id: string }>(
    `SELECT org_unit_id FROM user_org_scopes WHERE user_id = $1`,
    [userId],
  );
  return result.rows.map((r) => r.org_unit_id);
}

export async function getUserContentTypes(userId: string): Promise<ContentType[]> {
  const result = await query<{ content_type: ContentType }>(
    `SELECT content_type FROM user_content_scopes WHERE user_id = $1`,
    [userId],
  );
  return result.rows.map((r) => r.content_type);
}

export async function canAccessContentType(
  user: SessionUser,
  contentType: ContentType,
): Promise<boolean> {
  if (user.role === "super_admin" || user.role === "reviewer") return true;
  const types = await getUserContentTypes(user.id);
  return types.includes(contentType);
}

export async function canAccessOrg(user: SessionUser, orgUnitId: string): Promise<boolean> {
  if (user.role === "super_admin" || user.role === "reviewer") return true;
  const orgs = await getUserOrgIds(user.id);
  return orgs.includes(orgUnitId);
}

/** Reviewer / Super Admin see centre-wide; editors are ownership-scoped. */
export function isCentreWideViewer(user: SessionUser): boolean {
  return user.role === "super_admin" || user.role === "reviewer";
}

export function canReview(user: SessionUser): boolean {
  return user.role === "reviewer" || user.role === "super_admin";
}

export function canEditAsAuthor(user: SessionUser): boolean {
  return user.role === "editor" || user.role === "super_admin" || user.role === "reviewer";
}

/** Content-type scopes for nav filtering (editors); privileged roles get all types. */
export async function getNavContentTypes(user: SessionUser): Promise<ContentType[]> {
  if (isCentreWideViewer(user)) {
    return ["news", "event", "publication", "partner", "alert"];
  }
  return getUserContentTypes(user.id);
}
