/**
 * Pure Align-to-desks helpers (no DB). Same editor matching as
 * cms/scripts/reassign-to-editor-claims.ts.
 */

export type EditorClaim = {
  content_type: string;
  org_unit_id: string | null;
  editor_id: string;
  email: string;
  display_name: string;
};

export type PublisherSnapshot = {
  id: string;
  role: string;
  is_active: boolean;
  claimedOrgIds: string[];
};

export function editorFor(
  claims: EditorClaim[],
  contentType: string,
  orgUnitId: string | null,
): EditorClaim | null {
  if (contentType === "research_group" || contentType === "research_project") {
    const exact = claims.find(
      (c) => c.content_type === contentType && c.org_unit_id === orgUnitId,
    );
    if (exact) return exact;
    return claims.find((c) => c.content_type === contentType) ?? null;
  }
  return (
    claims.find((c) => c.content_type === contentType && c.org_unit_id == null) ??
    claims.find((c) => c.content_type === contentType) ??
    null
  );
}

/** R1: Reviewer Align only includes items whose org they exclusively claim. */
export function itemInReviewerScope(
  orgUnitId: string | null | undefined,
  claimedOrgIds: ReadonlySet<string>,
): boolean {
  if (!orgUnitId) return false;
  return claimedOrgIds.has(orgUnitId);
}

/**
 * Bulk Align sets publisher to the org Reviewer only when the current value is
 * empty or no longer a scoped active Reviewer.
 */
export function shouldAssignOrgPublisher(
  current: PublisherSnapshot | null,
  itemOrgId: string | null,
  orgReviewerId: string | null,
): boolean {
  if (!orgReviewerId) return false;
  if (!current) return true;
  if (!current.is_active) return true;
  if (current.role !== "reviewer") return true;
  if (!itemOrgId || !current.claimedOrgIds.includes(itemOrgId)) return true;
  return false;
}

export const ALIGN_PREVIEW_SAMPLE = 20;
