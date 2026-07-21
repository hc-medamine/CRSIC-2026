"use client";

import { formatDateTime } from "@/lib/format-datetime";

export type PersonDisplay = {
  displayName: string;
  email: string;
  role?: string;
} | null;

type Props = {
  status?: string;
  reviewNote?: string | null;
  editor?: PersonDisplay;
  reviewer?: PersonDisplay;
  publisher?: PersonDisplay;
  reviewOwner?: PersonDisplay;
  escalatedAt?: string | null;
};

function formatPerson(p: PersonDisplay): string {
  if (!p) return "—";
  const role = p.role ? ` (${p.role})` : "";
  return `${p.displayName}${role}`;
}

/** Status + editor / reviewer / publisher / review owner line for Edit/review forms. */
export function ItemWorkflowMeta({
  status,
  reviewNote,
  editor,
  reviewer,
  publisher,
  reviewOwner,
  escalatedAt,
}: Props) {
  if (!status) return null;
  return (
    <div className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
      <p>
        Status: <strong>{status}</strong>
        {reviewNote ? ` — ${reviewNote}` : ""}
        {escalatedAt ? (
          <span className="ml-2 text-amber-800">
            · Escalated {formatDateTime(escalatedAt)}
          </span>
        ) : null}
      </p>
      <dl className="mt-2 grid gap-1 text-xs text-zinc-600 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="font-medium text-zinc-800">Editor</dt>
          <dd title={editor?.email}>{formatPerson(editor ?? null)}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-800">Reviewer</dt>
          <dd title={reviewer?.email}>{formatPerson(reviewer ?? null)}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-800">Publisher</dt>
          <dd title={publisher?.email}>{formatPerson(publisher ?? null)}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-800">Review owner</dt>
          <dd title={reviewOwner?.email}>{formatPerson(reviewOwner ?? null)}</dd>
        </div>
      </dl>
    </div>
  );
}
