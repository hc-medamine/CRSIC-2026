/** Statuses where a Reviewer may approve, request changes, or reject. */
export function isReviewerDecisionStatus(status: string): boolean {
  return status === "submitted" || status === "approved";
}

/** Statuses where the author (or SA) may edit draft fields. */
export function isEditableStatus(status: string): boolean {
  return status === "draft" || status === "changes_requested" || status === "unpublished";
}

/** Normalize legacy `unpublished` rows to `draft` on save. */
export function normalizeStatusOnEdit(status: string): string {
  return status === "unpublished" ? "draft" : status;
}

/** Statuses where the author may submit for review. */
export function canSubmitStatus(status: string): boolean {
  return isEditableStatus(status);
}

/** Actionable message when submit is blocked by workflow status. */
export function submitStatusError(status: string): string {
  if (status === "submitted") {
    return "Already submitted for review — refresh the page or withdraw first";
  }
  if (status === "approved") {
    return "Item is approved — ask the reviewer to request changes before resubmitting";
  }
  if (status === "rejected") {
    return "Item was rejected — reopen as draft before submitting again";
  }
  if (status === "published") {
    return "Cannot submit in this status — start a revision or unpublish first";
  }
  return `Cannot submit in current status (${status})`;
}
