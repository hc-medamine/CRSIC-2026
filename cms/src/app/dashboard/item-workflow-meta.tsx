"use client";

import { formatDateTime } from "@/lib/format-datetime";
import { EnStatusBadge } from "@/app/dashboard/en-status-badge";

export type PersonDisplay = {
  displayName: string;
  email: string;
  role?: string;
} | null;

type Props = {
  status?: string;
  enStatus?: "pending" | "ready" | string | null;
  reviewNote?: string | null;
  editor?: PersonDisplay;
  reviewer?: PersonDisplay;
  publisher?: PersonDisplay;
  reviewOwner?: PersonDisplay;
  escalatedAt?: string | null;
  needsPostReview?: boolean;
};

function formatPerson(p: PersonDisplay): string {
  if (!p) return "—";
  const role = p.role ? ` (${p.role})` : "";
  return `${p.displayName}${role}`;
}

/** Status + editor / reviewer / publisher / review owner line for Edit/review forms. */
export function ItemWorkflowMeta({
  status,
  enStatus,
  reviewNote,
  editor,
  reviewer,
  publisher,
  reviewOwner,
  escalatedAt,
  needsPostReview,
}: Props) {
  if (!status) return null;
  return (
    <div className="rounded-2xl border border-crs-border bg-crs-bg/70 px-4 py-3 text-sm text-crs-ink">
      <p className="flex flex-wrap items-center gap-2">
        <span>
          Status: <strong>{status}</strong>
          {reviewNote ? ` — ${reviewNote}` : ""}
        </span>
        <EnStatusBadge status={enStatus} />
        {escalatedAt ? (
          <span className="text-amber-800">· Escalated {formatDateTime(escalatedAt)}</span>
        ) : null}
        {needsPostReview ? (
          <span className="text-red-800">· Emergency · needs post-review</span>
        ) : null}
      </p>
      <dl className="mt-2 grid gap-1 text-xs text-crs-muted sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="font-medium text-crs-ink">Editor</dt>
          <dd title={editor?.email}>{formatPerson(editor ?? null)}</dd>
        </div>
        <div>
          <dt className="font-medium text-crs-ink">Reviewer</dt>
          <dd title={reviewer?.email}>{formatPerson(reviewer ?? null)}</dd>
        </div>
        <div>
          <dt className="font-medium text-crs-ink">Publisher</dt>
          <dd title={publisher?.email}>{formatPerson(publisher ?? null)}</dd>
        </div>
        <div>
          <dt className="font-medium text-crs-ink">Review owner</dt>
          <dd title={reviewOwner?.email}>{formatPerson(reviewOwner ?? null)}</dd>
        </div>
      </dl>
    </div>
  );
}
