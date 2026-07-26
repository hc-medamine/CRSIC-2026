"use client";

import { formatDateTime } from "@/lib/format-datetime";
import { EnStatusBadge } from "@/app/dashboard/en-status-badge";
import { useCmsLang } from "@/lib/i18n/cms-lang";
import { roleLabel, statusLabel, t, localizedDisplayName } from "@/lib/i18n/labels";

export type PersonDisplay = {
  displayName: string;
  nameAr?: string | null;
  nameEn?: string | null;
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

function formatPerson(p: PersonDisplay, lang: "en" | "ar"): string {
  if (!p) return "—";
  const role = p.role ? ` (${roleLabel(p.role, lang)})` : "";
  return `${localizedDisplayName(p, lang)}${role}`;
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
  const lang = useCmsLang();
  if (!status) return null;
  return (
    <div className="rounded-2xl border border-crs-border bg-crs-bg/70 px-4 py-3 text-sm text-crs-ink">
      <p className="flex flex-wrap items-center gap-2">
        <span>
          {t("statusLabel", lang)}: <strong>{statusLabel(status, lang)}</strong>
          {reviewNote ? ` — ${reviewNote}` : ""}
        </span>
        <EnStatusBadge status={enStatus} />
        {escalatedAt ? (
          <span className="text-amber-800">
            · {t("escalated", lang)} {formatDateTime(escalatedAt)}
          </span>
        ) : null}
        {needsPostReview ? (
          <span className="text-red-800">· {t("emergencyNeedsPostReview", lang)}</span>
        ) : null}
      </p>
      <dl className="mt-2 grid gap-1 text-xs text-crs-muted sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="font-medium text-crs-ink">{t("labelEditor", lang)}</dt>
          <dd title={editor?.email}>{formatPerson(editor ?? null, lang)}</dd>
        </div>
        <div>
          <dt className="font-medium text-crs-ink">{t("labelReviewer", lang)}</dt>
          <dd title={reviewer?.email}>{formatPerson(reviewer ?? null, lang)}</dd>
        </div>
        <div>
          <dt className="font-medium text-crs-ink">{t("labelPublisher", lang)}</dt>
          <dd title={publisher?.email}>{formatPerson(publisher ?? null, lang)}</dd>
        </div>
        <div>
          <dt className="font-medium text-crs-ink">{t("labelReviewOwner", lang)}</dt>
          <dd title={reviewOwner?.email}>{formatPerson(reviewOwner ?? null, lang)}</dd>
        </div>
      </dl>
    </div>
  );
}
