"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ItemWorkflowMeta, type PersonDisplay } from "@/app/dashboard/item-workflow-meta";
import { MediaUploadField } from "@/app/dashboard/media-upload-field";
import { PublicPreviewButton } from "@/app/dashboard/public-preview-button";
import {
  SeoFieldsSection,
  copyMetaTitleFrom,
  copyMetaDescriptionFrom,
  emptySeoFormState,
  type SeoFormState,
} from "@/app/dashboard/seo-fields";
import { cmsToast } from "@/app/dashboard/cms-toast";
import { AdvancedDisclosure, FormBanner, FormSection, FormStickyActions, PublishButton, messageForAction } from "@/app/dashboard/form-ux";
import { t } from "@/lib/i18n/labels";
import { useCmsLang } from "@/lib/i18n/cms-lang";

type OrgUnit = { id: string; name_ar: string; name_en: string };

type MemberRow = { nameAr: string; nameEn: string };

type Initial = {
  id?: string;
  orgUnitId: string;
  titleAr: string;
  titleEn: string;
  summaryAr: string;
  summaryEn: string;
  leadAr: string;
  leadEn: string;
  members: MemberRow[];
  imagePath?: string;
  enStatus: "pending" | "ready";
  status?: string;
  reviewNote?: string | null;
  editor?: PersonDisplay;
  reviewer?: PersonDisplay;
  publisher?: PersonDisplay;
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
};

function emptyMember(): MemberRow {
  return { nameAr: "", nameEn: "" };
}

export function ResearchGroupForm({
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
  const [summaryAr, setSummaryAr] = useState(initial?.summaryAr ?? "");
  const [summaryEn, setSummaryEn] = useState(initial?.summaryEn ?? "");
  const [leadAr, setLeadAr] = useState(initial?.leadAr ?? "");
  const [leadEn, setLeadEn] = useState(initial?.leadEn ?? "");
  const [members, setMembers] = useState<MemberRow[]>(
    initial?.members && initial.members.length > 0 ? initial.members : [emptyMember()],
  );
  const [enStatus, setEnStatus] = useState<"pending" | "ready">(initial?.enStatus ?? "pending");
  const [imagePath, setImagePath] = useState(initial?.imagePath ?? "");
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

  const editable = mode === "create" || initial?.status === "draft" || initial?.status === "changes_requested";

  function updateMember(index: number, patch: Partial<MemberRow>) {
    setMembers((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  }

  function addMember() {
    setMembers((prev) => [...prev, emptyMember()]);
  }

  function removeMember(index: number) {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  }

  function fields() {
    return {
      orgUnitId,
      titleAr,
      titleEn,
      summaryAr,
      summaryEn,
      leadAr,
      leadEn,
      members: members
        .filter((m) => m.nameAr.trim())
        .map((m) => ({ nameAr: m.nameAr, nameEn: m.nameEn })),
      imagePath: imagePath.trim() || null,
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
      const res = await fetch("/api/research-groups", {
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
      router.push(`/dashboard/research-groups/${data.item.id}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function run(action: string, extra?: Record<string, unknown>) {
    if (!initial?.id) return;
    if (action === "delete") {
      const ok = window.confirm(t("confirmRecycle", lang));
      if (!ok) return;
    }
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/research-groups/${initial.id}`, {
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
      const msg = t(key || "savedStay", lang);
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
            <span className="font-medium">{t("fieldGroupNameAr", lang)}</span>
            <input dir="rtl" required disabled={!editable} value={titleAr} onChange={(e) => setTitleAr(e.target.value)} className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink" />
          </label>
          <label className="text-sm">
            <span className="font-medium">{t("fieldSummaryArRequired", lang)}</span>
            <textarea dir="rtl" disabled={!editable} value={summaryAr} onChange={(e) => setSummaryAr(e.target.value)} rows={3} className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink" />
          </label>
          <label className="text-sm">
            <span className="font-medium">{t("fieldLeadArRequired", lang)}</span>
            <input dir="rtl" disabled={!editable} value={leadAr} onChange={(e) => setLeadAr(e.target.value)} className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink" />
          </label>
        </FormSection>

        <FormSection step={2} title={t("sectionMembers", lang)}>
          <fieldset className="grid gap-2 rounded border border-crs-border bg-crs-bg/80 p-3">
            <legend className="px-1 text-sm font-semibold text-crs-ink">{t("sectionMembers", lang)}</legend>
            {members.map((m, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input
                  dir="rtl"
                  disabled={!editable}
                  placeholder={t("phNameAr", lang)}
                  value={m.nameAr}
                  onChange={(e) => updateMember(i, { nameAr: e.target.value })}
                  className="min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
                />
                <input
                  disabled={!editable}
                  placeholder={t("phNameEn", lang)}
                  value={m.nameEn}
                  onChange={(e) => updateMember(i, { nameEn: e.target.value })}
                  className="min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
                />
                {editable ? (
                  <button
                    type="button"
                    onClick={() => removeMember(i)}
                    className="rounded border border-red-300 px-3 py-2 text-xs text-red-700"
                  >
                    {t("actionRemove", lang)}
                  </button>
                ) : null}
              </div>
            ))}
            {editable ? (
              <button type="button" onClick={addMember} className="w-fit text-xs underline">
                {t("actionAddMember", lang)}
              </button>
            ) : null}
          </fieldset>
        </FormSection>

        <AdvancedDisclosure
          step={3}
          title={t("sectionAdvanced", lang)}
          hint={t("sectionAdvancedHint", lang)}
        >
          <label className="text-sm">
            <span className="font-medium">{t("fieldGroupNameEn", lang)}</span>
            <input disabled={!editable} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink" />
          </label>
          <label className="text-sm">
            <span className="font-medium">{t("fieldSummaryEn", lang)}</span>
            <textarea disabled={!editable} value={summaryEn} onChange={(e) => setSummaryEn(e.target.value)} rows={3} className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink" />
          </label>
          <label className="text-sm">
            <span className="font-medium">{t("fieldLeadEn", lang)}</span>
            <input disabled={!editable} value={leadEn} onChange={(e) => setLeadEn(e.target.value)} className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink" />
          </label>
          <label className="text-sm">
            <span className="font-medium">{t("enStatus", lang)}</span>
            <select disabled={!editable} value={enStatus} onChange={(e) => setEnStatus(e.target.value as "pending" | "ready")} className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink">
              <option value="pending">{t("enStatusPending", lang)}</option>
              <option value="ready">{t("enStatusReady", lang)}</option>
            </select>
          </label>
          <MediaUploadField
            bucket="research"
            publicPath={imagePath}
            imagesOnly
            label={t("fieldGroupImage", lang)}
            disabled={!editable}
            onUploaded={({ publicPath }) => setImagePath(publicPath)}
          />
          <SeoFieldsSection
            value={seo}
            onChange={setSeo}
            disabled={!editable}
            ogBucket="research"
            ogFallbackHint={imagePath.trim() || "img/cms/research/..."}
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
                    <input type="checkbox" checked={checklist} onChange={(e) => setChecklist(e.target.checked)} />
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
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("actionNotePlaceholder", lang)} className="w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink" rows={2} />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending} className="rounded-lg bg-crs-primary hover:bg-crs-secondary px-3 py-1.5 text-sm text-white" onClick={() => void run("approve")}>{t("actionApprove", lang)}</button>
            <button type="button" disabled={pending} className="inline-flex min-h-11 items-center rounded-lg border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink hover:bg-crs-bg" onClick={() => void run("request_changes", { note })}>{t("actionRequestChanges", lang)}</button>
            <button type="button" disabled={pending} className="inline-flex min-h-11 items-center rounded-lg border border-red-300 bg-crs-surface px-3 py-2 text-sm text-red-700 hover:bg-red-50" onClick={() => void run("reject", { note })}>{t("actionReject", lang)}</button>
          </div>
        </div>
      ) : null}

      {mode === "edit" && canReview && (initial?.status === "approved" || initial?.status === "unpublished") ? (
        <PublishButton pending={pending} onClick={() => void run("publish")}>
          {t("actionPublish", lang)}
        </PublishButton>
      ) : null}

      {mode === "edit" && initial?.id ? (
        <PublicPreviewButton contentId={initial.id} disabled={pending} />
      ) : null}

      {mode === "edit" && (isAuthor || canReview) && initial?.status === "published" ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={pending} className="w-fit rounded border border-crs-secondary/40 px-4 py-2 text-sm text-crs-primary" onClick={() => void run("start_revision")}>{t("actionStartRevision", lang)}
          </button>
          {canReview ? (
            <button type="button" disabled={pending} className="w-fit inline-flex min-h-11 items-center rounded-lg border border-crs-border bg-crs-surface px-4 py-2 text-sm text-crs-ink hover:bg-crs-bg" onClick={() => void run("unpublish")}>
              {t("actionUnpublish", lang)}
            </button>
          ) : null}
        </div>
      ) : null}

      {mode === "edit" && isAuthor && initial?.status === "rejected" ? (
        <button type="button" disabled={pending} className="w-fit rounded border border-amber-300 px-4 py-2 text-sm text-amber-900" onClick={() => void run("reopen_rejected")}>
          {t("actionReopenDraft", lang)}
        </button>
      ) : null}

      {mode === "edit" &&
      canDelete &&
      (initial?.status === "unpublished" || initial?.status === "rejected") ? (
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
