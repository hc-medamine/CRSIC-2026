"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { MediaUploadField } from "@/app/dashboard/media-upload-field";
import { MediaAttachmentsField } from "@/app/dashboard/media-attachments-field";
import { PublishPreview } from "@/app/dashboard/publish-preview";
import { PublicPreviewButton } from "@/app/dashboard/public-preview-button";
import { ItemWorkflowMeta, type PersonDisplay } from "@/app/dashboard/item-workflow-meta";
import {
  SeoFieldsSection,
  copyMetaDescriptionFrom,
  copyMetaTitleFrom,
  emptySeoFormState,
  type SeoFormState,
} from "@/app/dashboard/seo-fields";
import { RichBodyEditor } from "@/app/dashboard/rich-body-editor";
import { cmsToast } from "@/app/dashboard/cms-toast";
import { AdvancedDisclosure, FormBanner, FormSection, FormStickyActions, PublishButton, messageForAction } from "@/app/dashboard/form-ux";
import { t } from "@/lib/i18n/labels";
import { useCmsLang } from "@/lib/i18n/cms-lang";
import type { PublicMediaItem } from "@/lib/publish/media";

type OrgUnit = { id: string; name_ar: string; name_en: string };

type Initial = {
  id?: string;
  orgUnitId: string;
  titleAr: string;
  titleEn: string;
  labelAr: string;
  labelEn: string;
  summaryAr: string;
  summaryEn: string;
  bodyAr: string;
  bodyEn: string;
  imagePath: string;
  imageCardPath?: string;
  imageMediaId?: string | null;
  imageAltAr: string;
  imageAltEn: string;
  enStatus: "pending" | "ready";
  attachments?: PublicMediaItem[];
  publicSlug?: string | null;
  status?: string;
  reviewNote?: string | null;
  editor?: PersonDisplay;
  reviewer?: PersonDisplay;
  publisher?: PersonDisplay;
  reviewOwner?: PersonDisplay;
  escalatedAt?: string | null;
  needsPostReview?: boolean;
  metaTitleAr?: string;
  metaTitleEn?: string;
  metaDescriptionAr?: string;
  metaDescriptionEn?: string;
  ogImage?: string;
};

type Props = {
  mode: "create" | "edit";
  orgUnits: OrgUnit[];
  initial?: Initial;
  canSubmit?: boolean;
  canReview?: boolean;
  isAuthor?: boolean;
  canDelete?: boolean;
  currentUserId?: string;
};

export function NewsEditorForm({
  mode,
  orgUnits,
  initial,
  canSubmit,
  canReview,
  isAuthor,
  canDelete,
}: Props) {
  const router = useRouter();
  const lang = useCmsLang();
  const [orgUnitId, setOrgUnitId] = useState(initial?.orgUnitId ?? orgUnits[0]?.id ?? "");
  const [titleAr, setTitleAr] = useState(initial?.titleAr ?? "");
  const [titleEn, setTitleEn] = useState(initial?.titleEn ?? "");
  const [labelAr, setLabelAr] = useState(initial?.labelAr ?? "");
  const [labelEn, setLabelEn] = useState(initial?.labelEn ?? "");
  const [summaryAr, setSummaryAr] = useState(initial?.summaryAr ?? "");
  const [summaryEn, setSummaryEn] = useState(initial?.summaryEn ?? "");
  const [bodyAr, setBodyAr] = useState(initial?.bodyAr ?? "");
  const [bodyEn, setBodyEn] = useState(initial?.bodyEn ?? "");
  const [imagePath, setImagePath] = useState(initial?.imagePath ?? "");
  const [imageCardPath, setImageCardPath] = useState(initial?.imageCardPath ?? "");
  const [imageMediaId, setImageMediaId] = useState(initial?.imageMediaId ?? null);
  const [imageAltAr, setImageAltAr] = useState(initial?.imageAltAr ?? "");
  const [imageAltEn, setImageAltEn] = useState(initial?.imageAltEn ?? "");
  const [enStatus, setEnStatus] = useState<"pending" | "ready">(initial?.enStatus ?? "pending");
  const [attachments, setAttachments] = useState<PublicMediaItem[]>(() => {
    if (initial?.attachments?.length) return initial.attachments;
    if (initial?.imagePath) {
      return [
        {
          kind: "image",
          src: initial.imagePath,
          ...(initial.imageAltAr ? { alt: initial.imageAltAr } : {}),
        },
      ];
    }
    return [];
  });
  const [publicSlug, setPublicSlug] = useState(initial?.publicSlug ?? "");
  const [seo, setSeo] = useState<SeoFormState>(() => ({
    ...emptySeoFormState(),
    metaTitleAr: initial?.metaTitleAr ?? "",
    metaTitleEn: initial?.metaTitleEn ?? "",
    metaDescriptionAr: initial?.metaDescriptionAr ?? "",
    metaDescriptionEn: initial?.metaDescriptionEn ?? "",
    ogImage: initial?.ogImage ?? "",
  }));
  const [checklist, setChecklist] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const editable =
    mode === "create" ||
    initial?.status === "draft" ||
    initial?.status === "changes_requested";

  function fields() {
    const media =
      attachments.length > 0
        ? attachments
        : imagePath.trim()
          ? [
              {
                kind: "image" as const,
                src: imagePath.trim(),
                ...(imageAltAr.trim() ? { alt: imageAltAr.trim() } : {}),
              },
            ]
          : [];
    const primary =
      (media.find((m) => m.kind === "image")?.src ?? imagePath.trim()) || null;
    return {
      orgUnitId,
      titleAr,
      titleEn,
      labelAr,
      labelEn,
      summaryAr,
      summaryEn,
      bodyAr,
      bodyEn,
      imagePath: primary,
      imageCardPath: imageCardPath.trim() || null,
      imageAltAr,
      imageAltEn,
      attachments: media,
      publicSlug: publicSlug.trim() || null,
      enStatus,
      metaTitleAr: seo.metaTitleAr,
      metaTitleEn: seo.metaTitleEn,
      metaDescriptionAr: seo.metaDescriptionAr,
      metaDescriptionEn: seo.metaDescriptionEn,
      ogImage: seo.ogImage.trim() || null,
    };
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields()),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; item?: { id: string } };
      if (!res.ok || !data.ok || !data.item) {
        const msg = data.error ?? t("createFailed", lang);
        setError(msg);
        cmsToast.error(msg);
        return;
      }
      cmsToast.success(t("draftCreated", lang));
      router.push(`/dashboard/news/${data.item.id}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function run(action: string, extra?: Record<string, unknown>) {
    if (!initial?.id) return;
    if (action === "delete") {
      const ok = window.confirm(
        t("confirmRecycle", lang),
      );
      if (!ok) return;
    }
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/news/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; deleted?: boolean };
      if (!res.ok || !data.ok) {
        const msg = data.error ?? t("actionFailed", lang);
        setError(msg);
        cmsToast.error(msg);
        return;
      }
      if (data.deleted) {
        cmsToast.success(t("recycledShort", lang));
        router.push("/dashboard/recycle-bin");
        router.refresh();
        return;
      }
      const key = messageForAction(action);
      const msg = key ? t(key, lang) : t("savedShort", lang);
      setMessage(msg);
      cmsToast.success(msg);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {initial?.status ? (
        <ItemWorkflowMeta
          status={initial.status}
          enStatus={initial.enStatus}
          reviewNote={initial.reviewNote}
          editor={initial.editor}
          reviewer={initial.reviewer}
          publisher={initial.publisher}
          reviewOwner={initial.reviewOwner}
          escalatedAt={initial.escalatedAt}
          needsPostReview={initial.needsPostReview}
        />
      ) : null}

      {error ? <FormBanner kind="error">{error}</FormBanner> : null}
      {message ? <FormBanner kind="success">{message}</FormBanner> : null}

      <form
        onSubmit={mode === "create" ? create : (e) => e.preventDefault()}
        className="flex flex-col gap-1 cms-form rounded-2xl border border-crs-border bg-crs-surface p-6 shadow-sm"
      >
        <FormSection step={1} title={t("sectionIdentity", lang)}>
          <label className="text-sm">
            <span className="font-medium">{t("fieldOrgUnit", lang)}</span>
            <select
              disabled={!editable}
              value={orgUnitId}
              onChange={(e) => setOrgUnitId(e.target.value)}
              className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
            >
              {orgUnits.map((o) => (
                <option key={o.id} value={o.id}>
                  {lang === "ar" ? o.name_ar : o.name_en || o.name_ar}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="font-medium">{t("fieldTitleAr", lang)}</span>
            <input
              dir="rtl"
              required
              disabled={!editable}
              value={titleAr}
              onChange={(e) => setTitleAr(e.target.value)}
              className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">{t("fieldLabelAr", lang)}</span>
            <input
              dir="rtl"
              disabled={!editable}
              value={labelAr}
              onChange={(e) => setLabelAr(e.target.value)}
              className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">{t("fieldSummaryAr", lang)}</span>
            <textarea
              dir="rtl"
              disabled={!editable}
              value={summaryAr}
              onChange={(e) => setSummaryAr(e.target.value)}
              className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
              rows={2}
            />
          </label>
        </FormSection>

        <FormSection step={2} title={t("sectionBody", lang)}>
          <RichBodyEditor
            label={t("fieldBodyAr", lang)}
            dir="rtl"
            disabled={!editable}
            value={bodyAr}
            onChange={setBodyAr}
          />
        </FormSection>

        <FormSection step={3} title={t("sectionMedia", lang)}>
          <MediaUploadField
            bucket="news"
            publicPath={imagePath}
            mediaId={imageMediaId}
            disabled={!editable}
            imagesOnly
            label={t("fieldNewsImage", lang)}
            enableCrop
            onUploaded={({ publicPath, mediaId, cardPath }) => {
              setImagePath(publicPath);
              setImageMediaId(mediaId);
              if (cardPath !== undefined) setImageCardPath(cardPath ?? "");
              setAttachments((prev) => {
                const withoutPrimary = prev.filter((a) => a.src !== imagePath);
                return [{ kind: "image", src: publicPath }, ...withoutPrimary];
              });
            }}
          />
          <MediaAttachmentsField
            bucket="news"
            items={attachments}
            disabled={!editable}
            onChange={(next) => {
              setAttachments(next);
              const firstImg = next.find((a) => a.kind === "image");
              if (firstImg) setImagePath(firstImg.src);
            }}
          />
          <label className="text-sm">
            <span className="font-medium">{t("fieldImageAltAr", lang)}</span>
            <input
              dir="rtl"
              disabled={!editable}
              value={imageAltAr}
              onChange={(e) => setImageAltAr(e.target.value)}
              className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
            />
          </label>
        </FormSection>

        <AdvancedDisclosure
          step={4}
          title={t("sectionAdvanced", lang)}
          hint={t("sectionAdvancedHint", lang)}
        >
          <label className="text-sm">
            <span className="font-medium">{t("fieldTitleEn", lang)}</span>
            <input
              disabled={!editable}
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">{t("fieldLabelEn", lang)}</span>
            <input
              disabled={!editable}
              value={labelEn}
              onChange={(e) => setLabelEn(e.target.value)}
              className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">{t("fieldSummaryEn", lang)}</span>
            <textarea
              disabled={!editable}
              value={summaryEn}
              onChange={(e) => setSummaryEn(e.target.value)}
              className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
              rows={2}
            />
          </label>
          <RichBodyEditor
            label={t("fieldBodyEn", lang)}
            dir="ltr"
            disabled={!editable}
            value={bodyEn}
            onChange={setBodyEn}
          />
          <label className="text-sm">
            <span className="font-medium">{t("fieldImageAltEn", lang)}</span>
            <input
              disabled={!editable}
              value={imageAltEn}
              onChange={(e) => setImageAltEn(e.target.value)}
              className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">{t("fieldPublicSlug", lang)}</span>
            <input
              dir="auto"
              disabled={!editable}
              value={publicSlug}
              onChange={(e) => setPublicSlug(e.target.value)}
              className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink font-mono text-xs"
              placeholder={t("fieldPublicSlugPh", lang)}
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">{t("enStatus", lang)}</span>
            <select
              disabled={!editable}
              value={enStatus}
              onChange={(e) => setEnStatus(e.target.value as "pending" | "ready")}
              className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
            >
              <option value="pending">{t("enStatusPending", lang)}</option>
              <option value="ready">{t("enStatusReady", lang)}</option>
            </select>
          </label>
          <SeoFieldsSection
            value={seo}
            onChange={setSeo}
            disabled={!editable}
            ogBucket="news"
            ogFallbackHint={imagePath.trim() || "img/cms/..."}
            onCopyTitleAr={() => setSeo((s) => copyMetaTitleFrom(titleAr, s))}
            onCopySummaryAr={() => setSeo((s) => copyMetaDescriptionFrom(summaryAr, s))}
          />
        </AdvancedDisclosure>

        <FormStickyActions>
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            {mode === "create" ? (
              <button
                type="submit"
                disabled={pending}
                className="inline-flex min-h-11 items-center rounded-xl bg-crs-primary px-4 py-2 text-sm font-medium text-white hover:bg-crs-secondary disabled:opacity-60"
              >
                {pending ? t("actionSaving", lang) : t("actionCreateDraft", lang)}
              </button>
            ) : null}

            {mode === "edit" && editable && isAuthor ? (
              <>
                <button
                  type="button"
                  disabled={pending}
                  className="inline-flex min-h-11 items-center rounded-xl border border-crs-border bg-crs-surface px-4 py-2 text-sm text-crs-ink hover:bg-crs-bg disabled:opacity-60"
                  onClick={() => void run("save", { fields: fields() })}
                >
                  {t("actionSaveDraft", lang)}
                </button>
                {canSubmit ? (
                  <label className="me-auto flex items-center gap-2 text-sm text-crs-ink">
                    <input
                      type="checkbox"
                      checked={checklist}
                      onChange={(e) => setChecklist(e.target.checked)}
                    />
                    {t("actionChecklistOk", lang)}
                  </label>
                ) : null}
                {canSubmit ? (
                  <button
                    type="button"
                    disabled={pending || !checklist}
                    className="inline-flex min-h-11 items-center rounded-xl bg-crs-primary px-4 py-2 text-sm font-medium text-white hover:bg-crs-secondary disabled:opacity-60"
                    onClick={() => void run("submit", { checklistConfirmed: checklist })}
                  >
                    {t("actionSubmit", lang)}
                  </button>
                ) : null}
              </>
            ) : null}

            {mode === "edit" && initial?.status === "submitted" && isAuthor ? (
              <button
                type="button"
                disabled={pending}
                className="inline-flex min-h-11 items-center rounded-xl border border-crs-border bg-crs-surface px-4 py-2 text-sm text-crs-ink hover:bg-crs-bg"
                onClick={() => void run("withdraw")}
              >
                {t("actionWithdraw", lang)}
              </button>
            ) : null}
          </div>
        </FormStickyActions>
      </form>

      {mode === "edit" && canReview && initial?.status === "submitted" ? (
        <div className="grid gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium">{t("actionReviewerActions", lang)}</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("actionNotePlaceholder", lang)}
            className="w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
            rows={2}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              className="rounded-lg bg-crs-primary hover:bg-crs-secondary px-3 py-1.5 text-sm text-white"
              onClick={() => void run("approve")}
            >
              {t("actionApprove", lang)}
            </button>
            <button
              type="button"
              disabled={pending}
              className="inline-flex min-h-11 items-center rounded-lg border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink hover:bg-crs-bg"
              onClick={() => void run("request_changes", { note })}
            >
              {t("actionRequestChanges", lang)}
            </button>
            <button
              type="button"
              disabled={pending}
              className="inline-flex min-h-11 items-center rounded-lg border border-red-300 bg-crs-surface px-3 py-2 text-sm text-red-700 hover:bg-red-50"
              onClick={() => void run("reject", { note })}
            >
              {t("actionReject", lang)}
            </button>
          </div>
        </div>
      ) : null}

      {mode === "edit" && initial?.id && (isAuthor || canReview) ? (
        <PublicPreviewButton contentId={initial.id} disabled={pending} />
      ) : null}

      {mode === "edit" ? (
        <PublishPreview
          kind="news"
          img={imagePath.trim()}
          label={labelAr}
          title={titleAr}
          slug={publicSlug.trim() || undefined}
          mediaCount={attachments.length}
        />
      ) : null}

      {mode === "edit" && canReview && (initial?.status === "approved" || initial?.status === "unpublished") ? (
        <PublishButton pending={pending} onClick={() => void run("publish")}>
          {t("actionPublish", lang)}
        </PublishButton>
      ) : null}

      {mode === "edit" && (isAuthor || canReview) && initial?.status === "published" ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            className="w-fit rounded border border-crs-secondary/40 px-4 py-2 text-sm text-crs-primary"
            onClick={() => void run("start_revision")}
          >{t("actionStartRevision", lang)}
          </button>
          {canReview ? (
            <button
              type="button"
              disabled={pending}
              className="w-fit inline-flex min-h-11 items-center rounded-lg border border-crs-border bg-crs-surface px-4 py-2 text-sm text-crs-ink hover:bg-crs-bg"
              onClick={() => void run("unpublish")}
            >
              {t("actionUnpublish", lang)}
            </button>
          ) : null}
        </div>
      ) : null}

      {mode === "edit" && isAuthor && initial?.status === "rejected" ? (
        <button
          type="button"
          disabled={pending}
          className="w-fit rounded border border-amber-300 px-4 py-2 text-sm text-amber-900"
          onClick={() => void run("reopen_rejected")}
        >
          {t("actionReopenDraft", lang)}
        </button>
      ) : null}

      {mode === "edit" &&
      canDelete ? (
        <button
          type="button"
          disabled={pending}
          className="inline-flex min-h-11 w-fit items-center rounded-xl border border-crs-border bg-crs-surface px-4 py-2 text-sm text-crs-ink hover:bg-crs-bg disabled:opacity-60"
          onClick={() => void run("delete")}
        >
          {t("actionRecycle", lang)}
        </button>
      ) : null}
    </div>
  );
}
