"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cmsToast } from "@/app/dashboard/cms-toast";
import { FormStickyActions } from "@/app/dashboard/form-ux";
import { useCmsLang } from "@/lib/i18n/cms-lang";
import { t, tf, type CmsLang } from "@/lib/i18n/labels";

/** Opt-in list bulk (Reviewer + Super Admin). Lists without this prop have no chrome. */
export type ContentListBulkKind =
  | "news"
  | "event"
  | "publication"
  | "partner"
  | "alert"
  | "law"
  | "platform"
  | "research_group"
  | "research_project";

export type ContentListBulk = {
  apiPath:
    | "/api/news/bulk"
    | "/api/events/bulk"
    | "/api/publications/bulk"
    | "/api/partners/bulk"
    | "/api/alerts/bulk"
    | "/api/laws/bulk"
    | "/api/platforms/bulk"
    | "/api/research-groups/bulk"
    | "/api/research-projects/bulk";
  canRecycle: boolean;
  kind: ContentListBulkKind;
};

export type BulkAction = "unpublish" | "recycle" | "clone";

export type BulkDone = { id: string; title: string };
export type BulkSkip = { id: string; title: string; reason: string; detail?: string };

export type BulkDialog =
  | { kind: "confirm"; action: BulkAction }
  | { kind: "report"; action: BulkAction; done: BulkDone[]; skipped: BulkSkip[] };

const SKIP_KEYS: Record<string, string> = {
  not_found: "bulkSkipNotFound",
  four_eyes: "bulkSkipFourEyes",
  not_published: "bulkSkipNotPublished",
  away: "bulkSkipAway",
  reviewer_required: "bulkSkipReviewer",
  not_sa: "bulkSkipNotSa",
  wrong_status: "bulkSkipWrongStatus",
  already_binned: "bulkSkipAlreadyBinned",
  too_many: "bulkSkipTooMany",
  no_create: "bulkSkipNoCreate",
  wrong_type: "bulkSkipWrongType",
  other: "bulkSkipOther",
};

export function bulkSkipLabel(reason: string, detail: string | undefined, lang: CmsLang): string {
  const key = SKIP_KEYS[reason];
  if (key && reason !== "other") return t(key, lang);
  if (detail?.trim()) return detail;
  return t("bulkSkipOther", lang);
}

export function DeskListCheckbox({
  checked,
  onChange,
  label,
  indeterminate,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  indeterminate?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = Boolean(indeterminate);
  }, [indeterminate]);
  return (
    <label className="relative z-10 flex min-h-11 min-w-11 cursor-pointer items-center justify-center">
      <span className="sr-only">{label}</span>
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        onClick={(e) => e.stopPropagation()}
        className="h-4 w-4 accent-crs-primary"
      />
    </label>
  );
}

export function ContentListBulkBar({
  selectedCount,
  canRecycle,
  busy,
  onClear,
  onUnpublish,
  onRecycle,
  onDuplicate,
}: {
  selectedCount: number;
  canRecycle: boolean;
  busy: boolean;
  onClear: () => void;
  onUnpublish: () => void;
  onRecycle: () => void;
  onDuplicate: () => void;
}) {
  const lang = useCmsLang();
  if (selectedCount < 1) return null;
  return (
    <FormStickyActions>
      <p className="me-auto text-sm text-crs-ink">{tf("bulkSelected", lang, { n: selectedCount })}</p>
      <button
        type="button"
        disabled={busy}
        className="inline-flex min-h-11 items-center rounded-xl border border-crs-border bg-crs-surface px-4 py-2 text-sm text-crs-ink hover:bg-crs-bg disabled:opacity-50"
        onClick={onClear}
      >
        {t("bulkClear", lang)}
      </button>
      <button
        type="button"
        disabled={busy}
        className="inline-flex min-h-11 items-center rounded-xl border border-crs-border bg-crs-surface px-4 py-2 text-sm text-crs-ink hover:bg-crs-bg disabled:opacity-50"
        onClick={onDuplicate}
      >
        {t("actionDuplicate", lang)}
      </button>
      {canRecycle ? (
        <button
          type="button"
          disabled={busy}
          className="inline-flex min-h-11 items-center rounded-xl border border-crs-border bg-crs-surface px-4 py-2 text-sm text-crs-ink hover:bg-crs-bg disabled:opacity-50"
          onClick={onRecycle}
        >
          {t("actionRecycle", lang)}
        </button>
      ) : null}
      <button
        type="button"
        disabled={busy}
        className="inline-flex min-h-11 items-center rounded-xl bg-crs-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-crs-secondary disabled:opacity-50"
        onClick={onUnpublish}
      >
        {t("actionUnpublish", lang)}
      </button>
    </FormStickyActions>
  );
}

const UNPUBLISH_TITLE: Record<ContentListBulkKind, string> = {
  news: "bulkConfirmUnpublishTitle",
  event: "bulkConfirmUnpublishTitleEvent",
  publication: "bulkConfirmUnpublishTitlePub",
  partner: "bulkConfirmUnpublishTitleItems",
  alert: "bulkConfirmUnpublishTitleItems",
  law: "bulkConfirmUnpublishTitleItems",
  platform: "bulkConfirmUnpublishTitleItems",
  research_group: "bulkConfirmUnpublishTitleItems",
  research_project: "bulkConfirmUnpublishTitleItems",
};

const UNPUBLISH_BODY: Record<ContentListBulkKind, string> = {
  news: "bulkConfirmUnpublish",
  event: "bulkConfirmUnpublishEvent",
  publication: "bulkConfirmUnpublishPub",
  partner: "bulkConfirmUnpublishItems",
  alert: "bulkConfirmUnpublishItems",
  law: "bulkConfirmUnpublishItems",
  platform: "bulkConfirmUnpublishItems",
  research_group: "bulkConfirmUnpublishItems",
  research_project: "bulkConfirmUnpublishItems",
};

export function ContentListBulkModal({
  dialog,
  busy,
  selectedCount,
  publishedCount,
  kind,
  onCancel,
  onConfirm,
  onDismiss,
}: {
  dialog: BulkDialog;
  busy: boolean;
  selectedCount: number;
  publishedCount: number;
  kind: ContentListBulkKind;
  onCancel: () => void;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  const lang = useCmsLang();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) {
        if (dialog.kind === "confirm") onCancel();
        else onDismiss();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, dialog.kind, onCancel, onDismiss]);

  const title =
    dialog.kind === "report"
      ? t("bulkReportTitle", lang)
      : dialog.action === "unpublish"
        ? t(UNPUBLISH_TITLE[kind], lang)
        : dialog.action === "clone"
          ? t("bulkConfirmCloneTitle", lang)
          : t("bulkConfirmRecycleTitle", lang);

  let body: ReactNode;
  if (dialog.kind === "confirm") {
    body = (
      <>
        <p className="mt-2 text-sm text-crs-muted">
          {dialog.action === "unpublish"
            ? tf(UNPUBLISH_BODY[kind], lang, { n: selectedCount })
            : dialog.action === "clone"
              ? tf("bulkConfirmClone", lang, { n: selectedCount })
              : tf("bulkConfirmRecycle", lang, { n: selectedCount })}
        </p>
        {dialog.action === "recycle" && publishedCount > 0 ? (
          <p className="mt-2 text-sm text-crs-muted">
            {tf("bulkConfirmRecyclePublished", lang, { n: publishedCount })}
          </p>
        ) : null}
      </>
    );
  } else {
    const summaryKey =
      dialog.action === "unpublish"
        ? "bulkReportUnpublish"
        : dialog.action === "clone"
          ? "bulkReportClone"
          : "bulkReportRecycle";
    body = (
      <>
        <p className="mt-2 text-sm text-crs-muted">
          {tf(summaryKey, lang, { done: dialog.done.length, skipped: dialog.skipped.length })}
        </p>
        {dialog.skipped.length > 0 ? (
          <div className="mt-3 max-h-48 overflow-y-auto rounded-xl border border-crs-border bg-crs-bg/60 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-crs-muted">
              {t("bulkSkippedHeading", lang)}
            </p>
            <ul className="mt-2 space-y-2 text-sm text-crs-ink">
              {dialog.skipped.map((row) => (
                <li key={`${row.id}-${row.reason}`}>
                  <span dir="auto">{row.title || t("untitled", lang)}</span>
                  <span className="text-crs-muted"> — {bulkSkipLabel(row.reason, row.detail, lang)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div
      className="cms-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-dialog-title"
    >
      <div className="cms-modal-panel w-full max-w-md rounded-2xl border border-crs-border bg-crs-surface p-5 shadow-lg">
        <h2 id="bulk-dialog-title" className="text-base font-semibold text-crs-ink">
          {title}
        </h2>
        {body}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {dialog.kind === "confirm" ? (
            <>
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-xl border border-crs-border bg-crs-surface px-4 py-2 text-sm text-crs-ink hover:bg-crs-bg disabled:opacity-50"
                disabled={busy}
                onClick={onCancel}
              >
                {t("actionCancel", lang)}
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-xl bg-crs-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-crs-secondary disabled:opacity-60"
                disabled={busy || selectedCount < 1}
                onClick={onConfirm}
              >
                {dialog.action === "unpublish"
                  ? t("actionUnpublish", lang)
                  : dialog.action === "clone"
                    ? t("actionDuplicate", lang)
                    : t("actionRecycle", lang)}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="inline-flex min-h-11 items-center rounded-xl bg-crs-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-crs-secondary"
              onClick={onDismiss}
            >
              {t("bulkDismiss", lang)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export async function postNewsBulk(
  apiPath: ContentListBulk["apiPath"],
  action: BulkAction,
  ids: string[],
  failLabel: string,
): Promise<{ done: BulkDone[]; skipped: BulkSkip[] }> {
  const res = await fetch(apiPath, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ids }),
  });
  const data = (await res.json()) as {
    ok?: boolean;
    error?: string;
    done?: BulkDone[];
    skipped?: BulkSkip[];
  };
  if (!res.ok || !data.ok) {
    throw new Error(data.error ?? failLabel);
  }
  return {
    done: Array.isArray(data.done) ? data.done : [],
    skipped: Array.isArray(data.skipped) ? data.skipped : [],
  };
}

export function toastBulkNetworkError(message: string) {
  cmsToast.error(message);
}
