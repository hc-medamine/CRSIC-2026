import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getUserOrgIds } from "@/lib/content/permissions";
import { writeAudit } from "@/lib/audit";

export type UserRole = "super_admin" | "editor" | "reviewer";
export type ContentType =
  | "news"
  | "event"
  | "publication"
  | "partner"
  | "alert"
  | "research_group"
  | "research_project";

/** Centre-wide SPA section types — globally exclusive across orgs and editors. */
export const SPA_CONTENT_TYPES: ContentType[] = [
  "news",
  "event",
  "publication",
  "partner",
  "alert",
];

/** Research-dept types — exclusive per org among editors; allowed on every research_dept. */
export const RESEARCH_CONTENT_TYPES: ContentType[] = ["research_group", "research_project"];

export const ALL_CONTENT_TYPES: ContentType[] = [
  ...SPA_CONTENT_TYPES,
  ...RESEARCH_CONTENT_TYPES,
];

export function isSpaContentType(t: ContentType): boolean {
  return (SPA_CONTENT_TYPES as string[]).includes(t);
}

export function isResearchContentType(t: ContentType): boolean {
  return (RESEARCH_CONTENT_TYPES as string[]).includes(t);
}

export type OrgUnit = {
  id: string;
  name_ar: string;
  name_en: string;
  kind: "centre_wide" | "research_dept";
  sort_order: number;
  content_types: ContentType[];
};

export type EditorContentTypeClaim = {
  content_type: ContentType;
  editor_id: string;
  editor_email: string;
  editor_display_name: string;
};

function normalizeContentTypes(raw: unknown): ContentType[] {
  if (!Array.isArray(raw)) return [];
  const out: ContentType[] = [];
  for (const t of raw) {
    if (typeof t === "string" && ALL_CONTENT_TYPES.includes(t as ContentType)) {
      if (!out.includes(t as ContentType)) out.push(t as ContentType);
    }
  }
  return out;
}

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

/** Reviewer or Super Admin may open the Editors light manager. */
export async function requireReviewerOrSuperAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "reviewer" && user.role !== "super_admin") {
    redirect("/dashboard");
  }
  return user;
}

export async function listOrgUnits(): Promise<OrgUnit[]> {
  const result = await query<{
    id: string;
    name_ar: string;
    name_en: string;
    kind: "centre_wide" | "research_dept";
    sort_order: number;
  }>(`SELECT id, name_ar, name_en, kind, sort_order FROM org_units ORDER BY sort_order`);

  const catalogs = await query<{ org_unit_id: string; content_type: ContentType }>(
    `SELECT org_unit_id, content_type FROM org_unit_content_types`,
  );
  const catMap = new Map<string, ContentType[]>();
  for (const row of catalogs.rows) {
    const list = catMap.get(row.org_unit_id) ?? [];
    list.push(row.content_type);
    catMap.set(row.org_unit_id, list);
  }

  return result.rows.map((o) => ({
    ...o,
    content_types: catMap.get(o.id) ?? [],
  }));
}

/** True if this org's catalog includes the content type. */
export function orgUnitAllowsContentType(org: OrgUnit, contentType: ContentType): boolean {
  return (org.content_types ?? []).includes(contentType);
}

/**
 * Orgs the actor may pick for a given content type (access ∩ catalog).
 * `keepOrgId` keeps the current item org even if the catalog no longer allows the type.
 */
export async function listSelectableOrgUnits(
  user: SessionUser,
  contentType: ContentType,
  opts?: { keepOrgId?: string },
): Promise<OrgUnit[]> {
  const allOrgs = await listOrgUnits();
  const orgIds =
    user.role === "super_admin"
      ? new Set(allOrgs.map((o) => o.id))
      : new Set(await getUserOrgIds(user.id));
  const keep = opts?.keepOrgId;
  return allOrgs.filter((o) => {
    if (!orgIds.has(o.id)) return false;
    if (keep && o.id === keep) return true;
    return orgUnitAllowsContentType(o, contentType);
  });
}

export async function getOrgUnitContentTypes(orgUnitId: string): Promise<ContentType[]> {
  const result = await query<{ content_type: ContentType }>(
    `SELECT content_type FROM org_unit_content_types WHERE org_unit_id = $1`,
    [orgUnitId],
  );
  return result.rows.map((r) => r.content_type);
}

/** Union of content types allowed across the given org units. */
export async function getOrgUnitsContentTypeUnion(orgUnitIds: string[]): Promise<ContentType[]> {
  if (orgUnitIds.length === 0) return [];
  const result = await query<{ content_type: ContentType }>(
    `SELECT DISTINCT content_type FROM org_unit_content_types
     WHERE org_unit_id = ANY($1::text[])`,
    [orgUnitIds],
  );
  return result.rows.map((r) => r.content_type);
}

export async function setOrgUnitContentTypes(
  orgUnitId: string,
  contentTypes: ContentType[],
): Promise<void> {
  const types = normalizeContentTypes(contentTypes);

  const org = await query<{ kind: "centre_wide" | "research_dept" }>(
    `SELECT kind FROM org_units WHERE id = $1`,
    [orgUnitId],
  );
  const kind = org.rows[0]?.kind;
  if (!kind) throw new Error("Org unit not found.");

  if (kind === "centre_wide") {
    const bad = types.filter((t) => !isSpaContentType(t));
    if (bad.length > 0) {
      throw new Error(
        `Centre-wide may only hold SPA types (news, event, publication, partner, alert). Invalid: ${bad.join(", ")}`,
      );
    }
  } else {
    const bad = types.filter((t) => !isResearchContentType(t));
    if (bad.length > 0) {
      throw new Error(
        `Research departments may only hold research_group and research_project. Invalid: ${bad.join(", ")}`,
      );
    }
  }

  const spaTypes = types.filter(isSpaContentType);
  if (spaTypes.length > 0) {
    const taken = await query<{ content_type: ContentType; org_unit_id: string; name_en: string }>(
      `SELECT c.content_type, c.org_unit_id, o.name_en
       FROM org_unit_content_types c
       JOIN org_units o ON o.id = c.org_unit_id
       WHERE c.content_type = ANY($1::text[])
         AND c.org_unit_id <> $2`,
      [spaTypes, orgUnitId],
    );
    if (taken.rows.length > 0) {
      const conflicts = taken.rows
        .map((r) => `${r.content_type} (held by ${r.name_en} / ${r.org_unit_id})`)
        .join(", ");
      throw new Error(
        `SPA content type(s) already assigned to another org: ${conflicts}`,
      );
    }
  }

  await query(`DELETE FROM org_unit_content_types WHERE org_unit_id = $1`, [orgUnitId]);
  for (const ct of types) {
    await query(
      `INSERT INTO org_unit_content_types (org_unit_id, content_type) VALUES ($1, $2)`,
      [orgUnitId, ct],
    );
  }

  const editors = await query<{ id: string; email: string }>(
    `SELECT u.id, u.email FROM users u
     JOIN user_org_scopes s ON s.user_id = u.id
     WHERE u.role = 'editor' AND s.org_unit_id = $1`,
    [orgUnitId],
  );
  for (const ed of editors.rows) {
    const orgs = await getUserOrgIds(ed.id);
    const allowed = new Set(await getOrgUnitsContentTypeUnion(orgs));
    const held = await query<{ content_type: ContentType }>(
      `SELECT content_type FROM user_content_scopes WHERE user_id = $1`,
      [ed.id],
    );
    const bad = held.rows.map((r) => r.content_type).filter((t) => !allowed.has(t));
    if (bad.length > 0) {
      throw new Error(
        `Cannot change catalog: editor ${ed.email} still holds type(s) ${bad.join(", ")} not allowed by their org union.`,
      );
    }
  }
}

export async function listEditorContentTypeClaims(): Promise<EditorContentTypeClaim[]> {
  const result = await query<{
    content_type: ContentType;
    editor_id: string;
    editor_email: string;
    editor_display_name: string;
  }>(
    `SELECT c.content_type, c.editor_id, u.email AS editor_email, u.display_name AS editor_display_name
     FROM editor_content_type_claims c
     JOIN users u ON u.id = c.editor_id
     ORDER BY c.content_type`,
  );
  return result.rows;
}

/**
 * Reject if content types collide with another Editor.
 * SPA types: global. Research types: per overlapping org.
 */
export async function assertEditorContentTypesExclusive(
  editorId: string,
  contentTypes: ContentType[],
  orgUnitIds: string[],
): Promise<void> {
  if (contentTypes.length === 0) return;

  const spa = contentTypes.filter(isSpaContentType);
  if (spa.length > 0) {
    const result = await query<{ content_type: ContentType; email: string }>(
      `SELECT c.content_type, u.email
       FROM editor_content_type_claims c
       JOIN users u ON u.id = c.editor_id
       WHERE c.content_type = ANY($1::text[])
         AND c.org_unit_id IS NULL
         AND c.editor_id <> $2`,
      [spa, editorId],
    );
    if (result.rows.length > 0) {
      const conflicts = result.rows
        .map((r) => `${r.content_type} (held by ${r.email})`)
        .join(", ");
      throw new Error(`Content type(s) already assigned to another editor: ${conflicts}`);
    }
  }

  const research = contentTypes.filter(isResearchContentType);
  if (research.length > 0 && orgUnitIds.length > 0) {
    const result = await query<{
      content_type: ContentType;
      org_unit_id: string;
      email: string;
    }>(
      `SELECT c.content_type, c.org_unit_id, u.email
       FROM editor_content_type_claims c
       JOIN users u ON u.id = c.editor_id
       WHERE c.content_type = ANY($1::text[])
         AND c.org_unit_id = ANY($2::text[])
         AND c.editor_id <> $3`,
      [research, orgUnitIds, editorId],
    );
    if (result.rows.length > 0) {
      const conflicts = result.rows
        .map((r) => `${r.content_type}@${r.org_unit_id} (held by ${r.email})`)
        .join(", ");
      throw new Error(
        `Research content type(s) already assigned to another editor in the same org: ${conflicts}`,
      );
    }
  }
}

/** Each type must appear in the union of the given orgs' catalogs. */
export async function assertEditorTypesAllowedByOrgs(
  orgUnitIds: string[],
  contentTypes: ContentType[],
): Promise<void> {
  if (contentTypes.length === 0) return;
  const allowed = new Set(await getOrgUnitsContentTypeUnion(orgUnitIds));
  const bad = contentTypes.filter((t) => !allowed.has(t));
  if (bad.length > 0) {
    throw new Error(
      `Content type(s) not allowed by selected org catalog(s): ${bad.join(", ")}`,
    );
  }
}

async function syncEditorContentTypeClaims(
  editorId: string,
  contentTypes: ContentType[],
  orgUnitIds: string[],
) {
  await query(`DELETE FROM editor_content_type_claims WHERE editor_id = $1`, [editorId]);
  for (const ct of contentTypes) {
    if (isSpaContentType(ct)) {
      await query(
        `INSERT INTO editor_content_type_claims (content_type, editor_id, org_unit_id)
         VALUES ($1, $2, NULL)`,
        [ct, editorId],
      );
    } else if (isResearchContentType(ct)) {
      for (const orgId of orgUnitIds) {
        await query(
          `INSERT INTO editor_content_type_claims (content_type, editor_id, org_unit_id)
           VALUES ($1, $2, $3)`,
          [ct, editorId, orgId],
        );
      }
    }
  }
}

function slugifyOrgId(raw: string): string {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  return s;
}

/**
 * Super Admin: create a new org unit available for Editor/Reviewer scopes.
 */
export async function createOrgUnit(
  admin: SessionUser,
  input: {
    id?: string;
    nameAr: string;
    nameEn: string;
    kind: "centre_wide" | "research_dept";
    sortOrder?: number;
    contentTypes?: ContentType[];
  },
): Promise<OrgUnit> {
  if (admin.role !== "super_admin") throw new Error("Super Admin required");

  const nameAr = input.nameAr.trim();
  const nameEn = input.nameEn.trim();
  if (!nameAr || !nameEn) throw new Error("Arabic and English names are required.");
  if (input.kind !== "centre_wide" && input.kind !== "research_dept") {
    throw new Error("kind must be centre_wide or research_dept.");
  }

  const contentTypes = normalizeContentTypes(
    input.contentTypes ??
      (input.kind === "centre_wide" ? [...SPA_CONTENT_TYPES] : [...RESEARCH_CONTENT_TYPES]),
  );
  let id = slugifyOrgId(input.id?.trim() || nameEn);
  if (!id) throw new Error("Could not derive a valid id from the English name.");
  if (!/^[a-z][a-z0-9_]*$/.test(id)) {
    throw new Error("id must start with a letter and contain only a-z, 0-9, underscore.");
  }
  if (input.kind === "research_dept" && !id.startsWith("dept_") && id !== "centre_wide") {
    id = `dept_${id}`.slice(0, 64);
  }

  let sortOrder = input.sortOrder;
  if (sortOrder == null || Number.isNaN(sortOrder)) {
    const maxSort = await query<{ n: number }>(
      `SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM org_units`,
    );
    sortOrder = maxSort.rows[0]?.n ?? 1;
  }

  try {
    const result = await query<{
      id: string;
      name_ar: string;
      name_en: string;
      kind: "centre_wide" | "research_dept";
      sort_order: number;
    }>(
      `INSERT INTO org_units (id, name_ar, name_en, kind, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name_ar, name_en, kind, sort_order`,
      [id, nameAr, nameEn, input.kind, sortOrder],
    );
    const row = result.rows[0];
    await setOrgUnitContentTypes(id, contentTypes);
    await writeAudit({
      actor: admin,
      action: "org.create",
      entityType: "org_unit",
      entityId: id,
      summary: `Created org unit ${nameEn} (${id})`,
      metadata: { id, nameAr, nameEn, kind: input.kind, contentTypes },
    });
    return { ...row, content_types: contentTypes };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    if (message.includes("unique") || message.includes("duplicate")) {
      throw new Error(`Org unit id "${id}" already exists.`);
    }
    throw err;
  }
}

export async function updateOrgUnit(
  admin: SessionUser,
  id: string,
  input: {
    nameAr: string;
    nameEn: string;
    kind: "centre_wide" | "research_dept";
    sortOrder: number;
    contentTypes: ContentType[];
  },
): Promise<OrgUnit> {
  if (admin.role !== "super_admin") throw new Error("Super Admin required");
  const nameAr = input.nameAr.trim();
  const nameEn = input.nameEn.trim();
  if (!nameAr || !nameEn) throw new Error("Arabic and English names are required.");
  if (input.kind !== "centre_wide" && input.kind !== "research_dept") {
    throw new Error("kind must be centre_wide or research_dept.");
  }
  const sortOrder = Number(input.sortOrder);
  if (!Number.isFinite(sortOrder)) throw new Error("sortOrder must be a number.");

  const contentTypes = normalizeContentTypes(input.contentTypes);
  // Empty catalog allowed when exclusive types are held by other orgs.

  const result = await query<{
    id: string;
    name_ar: string;
    name_en: string;
    kind: "centre_wide" | "research_dept";
    sort_order: number;
  }>(
    `UPDATE org_units
     SET name_ar = $2, name_en = $3, kind = $4, sort_order = $5
     WHERE id = $1
     RETURNING id, name_ar, name_en, kind, sort_order`,
    [id, nameAr, nameEn, input.kind, sortOrder],
  );
  const row = result.rows[0];
  if (!row) throw new Error("Org unit not found.");

  await setOrgUnitContentTypes(id, contentTypes);

  await writeAudit({
    actor: admin,
    action: "org.update",
    entityType: "org_unit",
    entityId: id,
    summary: `Updated org unit ${nameEn} (${id})`,
    metadata: { id, nameAr, nameEn, kind: input.kind, sortOrder, contentTypes },
  });
  return { ...row, content_types: contentTypes };
}

export type OrgUnitDeleteImpact = {
  id: string;
  contentCount: number;
  userScopeCount: number;
  reviewerClaim: boolean;
};

export async function getOrgUnitDeleteImpact(id: string): Promise<OrgUnitDeleteImpact | null> {
  const exists = await query<{ id: string }>(`SELECT id FROM org_units WHERE id = $1`, [id]);
  if (!exists.rows[0]) return null;

  const content = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM content_items WHERE org_unit_id = $1`,
    [id],
  );
  const scopes = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM user_org_scopes WHERE org_unit_id = $1`,
    [id],
  );
  const claim = await query<{ reviewer_id: string }>(
    `SELECT reviewer_id FROM reviewer_org_claims WHERE org_unit_id = $1`,
    [id],
  );

  return {
    id,
    contentCount: Number(content.rows[0]?.count ?? 0),
    userScopeCount: Number(scopes.rows[0]?.count ?? 0),
    reviewerClaim: Boolean(claim.rows[0]),
  };
}

/**
 * Super Admin: delete org unit. Blocked if any content items reference it.
 * User scopes and reviewer claims cascade away.
 */
export async function deleteOrgUnit(admin: SessionUser, id: string): Promise<void> {
  if (admin.role !== "super_admin") throw new Error("Super Admin required");
  const impact = await getOrgUnitDeleteImpact(id);
  if (!impact) throw new Error("Org unit not found.");
  if (impact.contentCount > 0) {
    throw new Error(
      `Cannot delete: ${impact.contentCount} content item(s) still use this org. Reassign or move content first.`,
    );
  }

  await query(`DELETE FROM org_units WHERE id = $1`, [id]);
  await writeAudit({
    actor: admin,
    action: "org.delete",
    entityType: "org_unit",
    entityId: id,
    summary: `Deleted org unit ${id}`,
    metadata: {
      userScopeCount: impact.userScopeCount,
      hadReviewerClaim: impact.reviewerClaim,
    },
  });
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

export async function getManagedUserById(id: string): Promise<ManagedUser | null> {
  const users = await listUsers();
  return users.find((u) => u.id === id) ?? null;
}

/**
 * Reject if any org unit is already claimed by a different reviewer.
 */
export async function assertReviewerOrgsExclusive(
  reviewerId: string,
  orgUnitIds: string[],
): Promise<void> {
  if (orgUnitIds.length === 0) return;
  const result = await query<{ org_unit_id: string; reviewer_id: string; email: string }>(
    `SELECT c.org_unit_id, c.reviewer_id, u.email
     FROM reviewer_org_claims c
     JOIN users u ON u.id = c.reviewer_id
     WHERE c.org_unit_id = ANY($1::text[])
       AND c.reviewer_id <> $2`,
    [orgUnitIds, reviewerId],
  );
  if (result.rows.length > 0) {
    const conflicts = result.rows
      .map((r) => `${r.org_unit_id} (held by ${r.email})`)
      .join(", ");
    throw new Error(`Org unit(s) already assigned to another reviewer: ${conflicts}`);
  }
}

async function syncReviewerOrgClaims(userId: string, orgUnitIds: string[]) {
  await query(`DELETE FROM reviewer_org_claims WHERE reviewer_id = $1`, [userId]);
  for (const orgId of orgUnitIds) {
    await query(
      `INSERT INTO reviewer_org_claims (org_unit_id, reviewer_id) VALUES ($1, $2)`,
      [orgId, userId],
    );
  }
}

export async function replaceUserScopes(
  userId: string,
  orgUnitIds: string[],
  contentTypes: ContentType[],
  opts?: { role?: UserRole },
) {
  let role = opts?.role;
  if (!role) {
    const r = await query<{ role: UserRole }>(`SELECT role FROM users WHERE id = $1`, [userId]);
    role = r.rows[0]?.role;
  }
  if (!role) throw new Error("User not found");

  const types = normalizeContentTypes(contentTypes);

  if (role === "reviewer") {
    await assertReviewerOrgsExclusive(userId, orgUnitIds);
  }

  if (role === "editor") {
    await assertEditorTypesAllowedByOrgs(orgUnitIds, types);
    await assertEditorContentTypesExclusive(userId, types, orgUnitIds);
  }

  await query(`DELETE FROM user_org_scopes WHERE user_id = $1`, [userId]);
  await query(`DELETE FROM user_content_scopes WHERE user_id = $1`, [userId]);

  for (const orgId of orgUnitIds) {
    await query(`INSERT INTO user_org_scopes (user_id, org_unit_id) VALUES ($1, $2)`, [
      userId,
      orgId,
    ]);
  }
  for (const ct of types) {
    await query(`INSERT INTO user_content_scopes (user_id, content_type) VALUES ($1, $2)`, [
      userId,
      ct,
    ]);
  }

  if (role === "reviewer") {
    await syncReviewerOrgClaims(userId, orgUnitIds);
    await query(`DELETE FROM editor_content_type_claims WHERE editor_id = $1`, [userId]);
  } else if (role === "editor") {
    await query(`DELETE FROM reviewer_org_claims WHERE reviewer_id = $1`, [userId]);
    await syncEditorContentTypeClaims(userId, types, orgUnitIds);
  } else {
    await query(`DELETE FROM reviewer_org_claims WHERE reviewer_id = $1`, [userId]);
    await query(`DELETE FROM editor_content_type_claims WHERE editor_id = $1`, [userId]);
  }
}

/** Super Admin: all orgs (legacy helper for SA auto-scope). */
export async function allOrgUnitIds(): Promise<string[]> {
  const units = await listOrgUnits();
  return units.map((u) => u.id);
}

/**
 * Editors assigned to a Reviewer = Editors whose org scopes intersect the Reviewer's orgs.
 * Super Admin sees all Editors.
 */
export async function listAssignedEditors(actor: SessionUser): Promise<ManagedUser[]> {
  const all = await listUsers();
  const editors = all.filter((u) => u.role === "editor");
  if (actor.role === "super_admin") return editors;

  const reviewerOrgs = new Set(await getUserOrgIds(actor.id));
  if (reviewerOrgs.size === 0) return [];

  return editors.filter((ed) => ed.org_unit_ids.some((o) => reviewerOrgs.has(o)));
}

export async function isEditorAssignedToReviewer(
  reviewerId: string,
  editorId: string,
): Promise<boolean> {
  const editor = await getManagedUserById(editorId);
  if (!editor || editor.role !== "editor") return false;
  const reviewerOrgs = new Set(await getUserOrgIds(reviewerId));
  if (reviewerOrgs.size === 0) return false;
  return editor.org_unit_ids.some((o) => reviewerOrgs.has(o));
}

export async function updateEditorContentTypesOnly(
  actor: SessionUser,
  editorId: string,
  contentTypes: ContentType[],
): Promise<void> {
  const types = normalizeContentTypes(contentTypes);
  if (types.length === 0) throw new Error("Editors need at least one content type.");

  const editor = await getManagedUserById(editorId);
  if (!editor || editor.role !== "editor") throw new Error("Target must be an Editor.");

  if (actor.role === "reviewer") {
    if (!(await isEditorAssignedToReviewer(actor.id, editorId))) {
      throw new Error("Forbidden: Editor is not in your org scopes.");
    }
  } else if (actor.role !== "super_admin") {
    throw new Error("Forbidden");
  }

  await assertEditorTypesAllowedByOrgs(editor.org_unit_ids, types);
  await assertEditorContentTypesExclusive(editorId, types, editor.org_unit_ids);

  await query(`DELETE FROM user_content_scopes WHERE user_id = $1`, [editorId]);
  for (const ct of types) {
    await query(`INSERT INTO user_content_scopes (user_id, content_type) VALUES ($1, $2)`, [
      editorId,
      ct,
    ]);
  }
  await syncEditorContentTypeClaims(editorId, types, editor.org_unit_ids);

  await writeAudit({
    actor,
    action: "user.update_scopes",
    entityType: "user",
    entityId: editorId,
    summary: `Updated content types for editor ${editor.email}`,
    metadata: {
      by: actor.role === "reviewer" ? "reviewer" : "super_admin",
      contentTypes: types,
      orgUnitIds: editor.org_unit_ids,
    },
  });
}

export type DeleteImpactItem = {
  id: string;
  contentType: string;
  title: string;
  status: string;
};

export type DeleteImpact = {
  user: { id: string; email: string; role: UserRole; displayName: string };
  draftCount: number;
  nonDraftItems: DeleteImpactItem[];
  mediaCount: number;
  isLastSuperAdmin: boolean;
};

export async function getUserDeleteImpact(userId: string): Promise<DeleteImpact | null> {
  const u = await query<{
    id: string;
    email: string;
    role: UserRole;
    display_name: string;
  }>(`SELECT id, email, role, display_name FROM users WHERE id = $1`, [userId]);
  const user = u.rows[0];
  if (!user) return null;

  const drafts = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM content_items
     WHERE created_by = $1 AND status = 'draft'`,
    [userId],
  );
  const nonDrafts = await query<{
    id: string;
    content_type: string;
    title_ar: string;
    status: string;
  }>(
    `SELECT id, content_type, title_ar, status FROM content_items
     WHERE created_by = $1 AND status <> 'draft'
     ORDER BY updated_at DESC`,
    [userId],
  );
  const media = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM media_assets WHERE uploaded_by = $1`,
    [userId],
  );

  let isLastSuperAdmin = false;
  if (user.role === "super_admin") {
    const sa = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM users
       WHERE role = 'super_admin' AND is_active = TRUE`,
    );
    isLastSuperAdmin = Number(sa.rows[0]?.count ?? 0) <= 1;
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.display_name,
    },
    draftCount: Number(drafts.rows[0]?.count ?? 0),
    nonDraftItems: nonDrafts.rows.map((r) => ({
      id: r.id,
      contentType: r.content_type,
      title: r.title_ar || "(untitled)",
      status: r.status,
    })),
    mediaCount: Number(media.rows[0]?.count ?? 0),
    isLastSuperAdmin,
  };
}

/**
 * Hard-delete a user. Non-draft content must be reassigned first (pass reassignToUserId).
 * Drafts are deleted. Leftover FK refs move to reassign target or the deleting admin.
 */
export async function hardDeleteUser(
  admin: SessionUser,
  userId: string,
  opts?: { reassignToUserId?: string; confirmEmail?: string },
): Promise<void> {
  if (admin.role !== "super_admin") throw new Error("Super Admin required");
  if (userId === admin.id) throw new Error("You cannot delete your own account.");

  const impact = await getUserDeleteImpact(userId);
  if (!impact) throw new Error("User not found");
  if (impact.isLastSuperAdmin) {
    throw new Error("Cannot delete the last active Super Admin.");
  }
  if (opts?.confirmEmail && opts.confirmEmail.trim().toLowerCase() !== impact.user.email) {
    throw new Error("Confirmation email does not match.");
  }

  if (impact.nonDraftItems.length > 0) {
    if (!opts?.reassignToUserId) {
      throw new Error(
        "Reassignment target required: user has non-draft content. Reassign then delete.",
      );
    }
  }

  const fallbackId = opts?.reassignToUserId || admin.id;
  if (opts?.reassignToUserId) {
    const t = await query<{ id: string; is_active: boolean }>(
      `SELECT id, is_active FROM users WHERE id = $1`,
      [opts.reassignToUserId],
    );
    const target = t.rows[0];
    if (!target?.is_active) throw new Error("Reassignment target not found or inactive.");
    if (opts.reassignToUserId === userId) {
      throw new Error("Cannot reassign content to the user being deleted.");
    }

    await query(
      `UPDATE content_items SET created_by = $2, updated_by = $3, updated_at = NOW()
       WHERE created_by = $1 AND status <> 'draft'`,
      [userId, opts.reassignToUserId, admin.id],
    );
  }

  // Delete drafts (revisions/comments/preview cascade)
  await query(`DELETE FROM content_items WHERE created_by = $1 AND status = 'draft'`, [userId]);

  // Rehome remaining FKs that block user delete
  await query(`UPDATE content_revisions SET created_by = $2 WHERE created_by = $1`, [
    userId,
    fallbackId,
  ]);
  await query(`UPDATE content_comments SET author_id = $2 WHERE author_id = $1`, [
    userId,
    fallbackId,
  ]);
  await query(`UPDATE media_assets SET uploaded_by = $2 WHERE uploaded_by = $1`, [
    userId,
    fallbackId,
  ]);
  await query(`UPDATE content_items SET updated_by = $2 WHERE updated_by = $1`, [
    userId,
    fallbackId,
  ]);

  // Optional nullable ownership columns
  try {
    await query(
      `UPDATE content_items SET review_owner_id = $2 WHERE review_owner_id = $1`,
      [userId, fallbackId],
    );
  } catch {
    /* column may be absent in older DBs */
  }
  try {
    await query(
      `UPDATE content_items SET review_owner_proposed_id = NULL WHERE review_owner_proposed_id = $1`,
      [userId],
    );
  } catch {
    /* optional */
  }
  try {
    await query(
      `UPDATE content_items SET review_owner_proposed_by = NULL WHERE review_owner_proposed_by = $1`,
      [userId],
    );
  } catch {
    /* optional */
  }
  try {
    await query(
      `UPDATE content_items SET emergency_published_by = NULL WHERE emergency_published_by = $1`,
      [userId],
    );
  } catch {
    /* optional */
  }
  try {
    await query(
      `UPDATE users SET away_delegate_user_id = NULL WHERE away_delegate_user_id = $1`,
      [userId],
    );
  } catch {
    /* optional */
  }

  await query(`UPDATE audit_log SET actor_user_id = NULL WHERE actor_user_id = $1`, [userId]);

  await query(`DELETE FROM reviewer_org_claims WHERE reviewer_id = $1`, [userId]);

  const draftCount = impact.draftCount;
  const reassigned = impact.nonDraftItems.length;

  await query(`DELETE FROM users WHERE id = $1`, [userId]);

  await writeAudit({
    actor: admin,
    action: "user.delete",
    entityType: "user",
    entityId: userId,
    summary: `Hard-deleted user ${impact.user.email}`,
    metadata: {
      email: impact.user.email,
      role: impact.user.role,
      deletedDraftCount: draftCount,
      reassignedCount: reassigned,
      reassignedTo: opts?.reassignToUserId ?? null,
      fkFallback: fallbackId,
    },
  });
}
