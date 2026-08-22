"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cmsToast } from "@/app/dashboard/cms-toast";
import { contentTypeLabel, localizedDisplayName, t, tf } from "@/lib/i18n/labels";
import { useCmsLang } from "@/lib/i18n/cms-lang";
import { IconArrow, IconShield, IconUsers } from "@/app/dashboard/cms-icons";

export type AlignRebuildStatusView = {
  lastSuccessAt: string | null;
  lastSuccessActorEmail: string | null;
  lastSuccessNewsCount: number | null;
  lastSuccessEventCount: number | null;
  lastSuccessSkipped: boolean;
  lastAttemptAt: string | null;
  lastAttemptOk: boolean | null;
  lastAttemptError: string | null;
};

export type AlignPreviewView = {
  scanned: number;
  alreadyAligned: number;
  skipped: { type: string; id: string; reason: string }[];
  sampleMoves: {
    id: string;
    content_type: string;
    title: string;
    fromEmail: string;
    toEmail: string;
    publisherAction: "set" | "keep" | "none";
  }[];
  moreMoves: number;
  byType: Record<string, number>;
  covers: { count: number; toEmail: string | null; inScope: boolean };
  publisherSet: number;
  publisherKept: number;
  publishedNewsTouched: number;
  publishedEventsTouched: number;
  claimMap: {
    editors: {
      content_type: string;
      org_unit_id: string | null;
      org_name_ar: string | null;
      org_name_en: string | null;
      editor_email: string;
      editor_display_name: string;
    }[];
    reviewers: {
      org_unit_id: string;
      org_name_ar: string | null;
      org_name_en: string | null;
      reviewer_email: string;
      reviewer_display_name: string;
    }[];
  };
  rebuild: AlignRebuildStatusView;
};

function StatTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "default" | "action" | "ok" | "warn";
}) {
  const surface =
    tone === "action"
      ? "border-crs-primary/25 bg-crs-primary/8 text-crs-primary"
      : tone === "ok"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : tone === "warn"
          ? "border-amber-200 bg-amber-50 text-amber-950"
          : "border-crs-border bg-crs-bg text-crs-ink";
  return (
    <div className={`rounded-2xl border px-4 py-3 ${surface}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs opacity-80">{hint}</p> : null}
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-crs-border bg-crs-bg px-2.5 py-1 text-xs text-crs-ink">
      {children}
    </span>
  );
}

export function RebuildBadge({ rebuild }: { rebuild: AlignRebuildStatusView }) {
  const lang = useCmsLang();
  const failed = rebuild.lastAttemptOk === false;
  const never = !rebuild.lastSuccessAt && rebuild.lastAttemptOk == null;

  let tone = "border-crs-border bg-crs-bg text-crs-muted";
  let dot = "bg-crs-muted";
  let label = t("alignRebuildNever", lang);
  if (failed) {
    tone = "border-amber-200 bg-amber-50 text-amber-950";
    dot = "bg-amber-500";
    label = t("alignRebuildStale", lang);
  } else if (rebuild.lastSuccessAt) {
    tone = "border-emerald-200 bg-emerald-50 text-emerald-900";
    dot = "bg-emerald-500";
    if (rebuild.lastSuccessSkipped) {
      label = t("alignRebuildSkipped", lang);
    } else {
      label = tf("alignRebuildOk", lang, {
        news: rebuild.lastSuccessNewsCount ?? 0,
        events: rebuild.lastSuccessEventCount ?? 0,
      });
    }
  }

  const when = rebuild.lastSuccessAt
    ? new Date(rebuild.lastSuccessAt).toLocaleString(lang === "ar" ? "ar-DZ" : "en-GB")
    : null;

  return (
    <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${tone}`}>
      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} aria-hidden />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
          {t("alignRebuildBadge", lang)}
        </p>
        <p className="mt-0.5 font-medium">{never ? t("alignRebuildNever", lang) : label}</p>
        {when ? (
          <p className="mt-1 text-xs opacity-80">
            {when}
            {rebuild.lastSuccessActorEmail ? ` · ${rebuild.lastSuccessActorEmail}` : ""}
          </p>
        ) : null}
        {failed && rebuild.lastAttemptError ? (
          <p className="mt-1 text-xs">{rebuild.lastAttemptError}</p>
        ) : null}
      </div>
    </div>
  );
}

export function AuthorshipClient({
  initial,
  desksDirty = false,
}: {
  initial: AlignPreviewView;
  desksDirty?: boolean;
}) {
  const lang = useCmsLang();
  const router = useRouter();
  const [preview, setPreview] = useState(initial);
  const [pending, setPending] = useState<"apply" | "rebuild" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wouldUpdate = preview.sampleMoves.length + preview.moreMoves;
  const work =
    wouldUpdate > 0 || preview.covers.count > 0 || preview.publisherSet > 0;

  async function run(action: "apply" | "rebuild") {
    setPending(action);
    setError(null);
    try {
      const res = await fetch("/api/authorship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        preview?: AlignPreviewView;
        applied?: boolean;
        rebuildError?: string;
        rebuild?: AlignRebuildStatusView;
      };
      if (!res.ok || !data.ok) {
        const msg = data.error ?? t("alignFailed", lang);
        setError(msg);
        cmsToast.error(msg);
        if (data.rebuild) setPreview((p) => ({ ...p, rebuild: data.rebuild! }));
        return;
      }
      if (data.preview) setPreview(data.preview);
      if (data.rebuild) setPreview((p) => ({ ...p, rebuild: data.rebuild! }));
      if (action === "apply") {
        if (data.applied === false) {
          cmsToast.success(t("alignNothingToDo", lang));
        } else if (data.rebuildError) {
          setError(data.rebuildError);
          cmsToast.error(data.rebuildError);
        } else {
          cmsToast.success(t("alignApplied", lang));
        }
      } else {
        cmsToast.success(t("alignRebuildRetryOk", lang));
      }
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  function publisherLabel(action: string) {
    if (action === "set") return t("alignPublisherActionSet", lang);
    if (action === "keep") return t("alignPublisherActionKeep", lang);
    return t("alignPublisherActionNone", lang);
  }

  const coverHint = !preview.covers.inScope
    ? t("alignCoversOutOfScope", lang)
    : preview.covers.toEmail
      ? `${preview.covers.count} → ${preview.covers.toEmail}`
      : String(preview.covers.count);

  return (
    <div className="overflow-hidden rounded-2xl border border-crs-border bg-crs-surface shadow-[var(--crs-shadow-soft)]">
      <div className="flex flex-col gap-4 border-b border-crs-border/70 bg-gradient-to-br from-crs-surface via-crs-surface to-crs-accent/10 p-5 lg:p-6">
        <RebuildBadge rebuild={preview.rebuild} />
        <p className="text-sm text-crs-muted">{t("alignDisclaimer", lang)}</p>
        {desksDirty ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {t("alignSaveDesksFirst", lang)}
          </p>
        ) : null}
      </div>

      {preview.claimMap.reviewers.length > 0 ? (
        <div className="border-b border-crs-border/70 px-5 py-4 lg:px-6">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-crs-muted">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-crs-primary/10 text-crs-primary">
              <IconShield className="h-4 w-4" />
            </span>
            {t("alignReviewerClaims", lang)}
          </div>
          <ul className="flex flex-wrap gap-2">
            {preview.claimMap.reviewers.map((row) => (
              <li
                key={row.org_unit_id}
                className="rounded-xl border border-crs-border bg-crs-bg px-3 py-2 text-sm"
              >
                <p className="font-medium text-crs-ink">
                  {localizedDisplayName(
                    {
                      displayName: row.org_name_en || row.org_unit_id,
                      nameAr: row.org_name_ar,
                      nameEn: row.org_name_en,
                    },
                    lang,
                  )}
                </p>
                <p className="mt-0.5 text-xs text-crs-muted">
                  {row.reviewer_display_name}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4 lg:p-6">
        <StatTile
          label={t("alignWouldMove", lang)}
          value={wouldUpdate}
          tone={wouldUpdate > 0 ? "action" : "default"}
        />
        <StatTile
          label={t("alignAlready", lang)}
          value={preview.alreadyAligned}
          tone={wouldUpdate === 0 && preview.alreadyAligned > 0 ? "ok" : "default"}
        />
        <StatTile label={t("alignScanned", lang)} value={preview.scanned} />
        <StatTile
          label={t("alignSkipped", lang)}
          value={preview.skipped.length}
          tone={preview.skipped.length > 0 ? "warn" : "default"}
        />
      </div>

      <div className="flex flex-wrap gap-2 px-5 pb-4 lg:px-6">
        <Chip>
          {t("alignPublisherSet", lang)}: {preview.publisherSet}
        </Chip>
        <Chip>
          {t("alignPublisherKept", lang)}: {preview.publisherKept}
        </Chip>
        <Chip>
          {t("alignCovers", lang)}: {coverHint}
        </Chip>
        {Object.entries(preview.byType).map(([type, n]) => (
          <Chip key={type}>
            {contentTypeLabel(type, lang)}: {n}
          </Chip>
        ))}
      </div>

      <div className="border-t border-crs-border/70 px-5 py-4 lg:px-6">
        {preview.sampleMoves.length > 0 ? (
          <ul className="grid gap-2">
            {preview.sampleMoves.map((m) => (
              <li
                key={m.id}
                className="rounded-xl border border-crs-border bg-crs-bg px-3 py-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-crs-primary/10 px-2 py-0.5 text-[11px] font-semibold text-crs-primary">
                    {contentTypeLabel(m.content_type, lang)}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium text-crs-ink" dir="auto">
                    {m.title}
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-crs-muted ring-1 ring-crs-border">
                    {publisherLabel(m.publisherAction)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-crs-muted">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-crs-surface px-2 py-1 ring-1 ring-crs-border">
                    <IconUsers className="h-3.5 w-3.5" />
                    {m.fromEmail}
                  </span>
                  <IconArrow className="h-3.5 w-3.5 shrink-0 text-crs-primary rtl:rotate-180" />
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-crs-surface px-2 py-1 font-medium text-crs-ink ring-1 ring-crs-primary/20">
                    {m.toEmail}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-start gap-3 rounded-xl border border-dashed border-crs-border bg-crs-bg px-4 py-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <IconShield className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-crs-ink">{t("alignNothingToDo", lang)}</p>
              <p className="mt-1 text-xs text-crs-muted">{t("alignDisclaimer", lang)}</p>
            </div>
          </div>
        )}
        {preview.moreMoves > 0 ? (
          <p className="mt-3 text-xs text-crs-muted">
            {tf("alignMoreMoves", lang, { n: preview.moreMoves })}
          </p>
        ) : null}
      </div>

      {error ? <p className="px-5 pb-2 text-sm text-red-600 lg:px-6">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-3 border-t border-crs-border/70 bg-crs-bg/60 px-5 py-4 lg:px-6">
        <button
          type="button"
          disabled={pending !== null || !work || desksDirty}
          onClick={() => void run("apply")}
          className="inline-flex min-h-11 items-center rounded-lg bg-crs-primary px-4 py-2 text-sm font-medium text-white hover:bg-crs-secondary disabled:opacity-60"
        >
          {pending === "apply" ? t("actionSaving", lang) : t("alignApply", lang)}
        </button>
        {preview.rebuild.lastAttemptOk === false ? (
          <button
            type="button"
            disabled={pending !== null}
            onClick={() => void run("rebuild")}
            className="inline-flex min-h-11 items-center rounded-lg border border-crs-border bg-crs-surface px-4 py-2 text-sm text-crs-ink hover:bg-crs-bg disabled:opacity-60"
          >
            {pending === "rebuild" ? t("actionSaving", lang) : t("alignRetryRebuild", lang)}
          </button>
        ) : null}
        <Link
          href="/dashboard/notifications"
          className="text-sm text-crs-primary underline-offset-2 hover:underline"
        >
          {t("notifications", lang)}
        </Link>
        <Link
          href="/dashboard/audit"
          className="text-sm text-crs-primary underline-offset-2 hover:underline"
        >
          {t("audit", lang)}
        </Link>
      </div>
    </div>
  );
}
