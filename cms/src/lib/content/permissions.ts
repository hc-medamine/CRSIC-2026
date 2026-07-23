import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import type { ContentType } from "@/lib/users";
import { ALL_CONTENT_TYPES } from "@/lib/users";

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

/** Whether org O allows content type T in its catalog. */
export async function orgAllowsContentType(
  orgUnitId: string,
  contentType: ContentType,
): Promise<boolean> {
  const result = await query<{ content_type: ContentType }>(
    `SELECT content_type FROM org_unit_content_types
     WHERE org_unit_id = $1 AND content_type = $2`,
    [orgUnitId, contentType],
  );
  return Boolean(result.rows[0]);
}

export async function assertOrgAllowsContentType(
  orgUnitId: string,
  contentType: ContentType,
): Promise<void> {
  if (!(await orgAllowsContentType(orgUnitId, contentType))) {
    throw new Error(
      `Organisation unit "${orgUnitId}" does not allow content type "${contentType}".`,
    );
  }
}

async function getOrgCatalogUnion(orgUnitIds: string[]): Promise<ContentType[]> {
  if (orgUnitIds.length === 0) return [];
  const result = await query<{ content_type: ContentType }>(
    `SELECT DISTINCT content_type FROM org_unit_content_types
     WHERE org_unit_id = ANY($1::text[])`,
    [orgUnitIds],
  );
  return result.rows.map((r) => r.content_type);
}

export async function canAccessContentType(
  user: SessionUser,
  contentType: ContentType,
): Promise<boolean> {
  if (user.role === "super_admin") return true;
  if (user.role === "reviewer") {
    const orgs = await getUserOrgIds(user.id);
    const allowed = await getOrgCatalogUnion(orgs);
    return allowed.includes(contentType);
  }
  const types = await getUserContentTypes(user.id);
  return types.includes(contentType);
}

export async function canAccessOrg(user: SessionUser, orgUnitId: string): Promise<boolean> {
  if (user.role === "super_admin") return true;
  const orgs = await getUserOrgIds(user.id);
  return orgs.includes(orgUnitId);
}

/** Super Admin only — centre-wide visibility. Reviewers are org-scoped. */
export function isCentreWideViewer(user: SessionUser): boolean {
  return user.role === "super_admin";
}

export function canReview(user: SessionUser): boolean {
  return user.role === "reviewer" || user.role === "super_admin";
}

export function canEditAsAuthor(user: SessionUser): boolean {
  return user.role === "editor" || user.role === "super_admin" || user.role === "reviewer";
}

/** Content-type scopes for nav filtering. */
export async function getNavContentTypes(user: SessionUser): Promise<ContentType[]> {
  if (user.role === "super_admin") {
    return [...ALL_CONTENT_TYPES];
  }
  if (user.role === "reviewer") {
    const orgs = await getUserOrgIds(user.id);
    return getOrgCatalogUnion(orgs);
  }
  return getUserContentTypes(user.id);
}
