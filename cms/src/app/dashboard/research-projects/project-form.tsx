"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ItemWorkflowMeta, type PersonDisplay } from "@/app/dashboard/item-workflow-meta";
import { PublicPreviewButton } from "@/app/dashboard/public-preview-button";
import { RichBodyEditor } from "@/app/dashboard/rich-body-editor";
import {
  SeoFieldsSection,
  copyMetaTitleFrom,
  emptySeoFormState,
  type SeoFormState,
} from "@/app/dashboard/seo-fields";
import { cmsToast } from "@/app/dashboard/cms-toast";
import { AdvancedDisclosure, FormBanner, FormSection, FormStickyActions, PublishButton, messageForAction } from "@/app/dashboard/form-ux";
import { t } from "@/lib/i18n/labels";
import { useCmsLang } from "@/lib/i18n/cms-lang";

type OrgUnit = { id: string; name_ar: string; name_en: string };

type BilingualRow = { ar: string; en: string };

type ResearchGroupOption = { id: string; title_ar: string; title_en: string | null };

type Initial = {
  id?: string;
  orgUnitId: string;
  researchGroupId: string;
  titleAr: string;
  titleEn: string;
  leadAr: string;
  leadEn: string;
  bodyAr: string;
  bodyEn: string;
  questionsAr: string;
  questionsEn: string;
  axes: BilingualRow[];
  durationAr: string;
  durationEn: string;
  impacts: BilingualRow[];
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
  /** Current research group, kept in the picker even if not in the fetched (published-only) list. */
  initialGroupOption?: ResearchGroupOption | null;
  canSubmit?: boolean;
  canReview?: boolean;
  isAuthor?: boolean;
  canDelete?: boolean;
};

function emptyRow(): BilingualRow {
  return { ar: "", en: "" };
}

export function ResearchProjectForm({
  mode,
  orgUnits,
  initial,
  initialGroupOption,
  canSubmit,
  canReview,
  isAuthor,
  canDelete,
}: Props) {
  const router = useRouter();
  const lang = useCmsLang();
  const [orgUnitId, setOrgUnitId] = useState(initial?.orgUnitId ?? orgUnits[0]?.id ?? "");
  const [researchGroupId, setResearchGroupId] = useState(initial?.researchGroupId ?? "");
  const [groups, setGroups] = useState<ResearchGroupOption[]>(
    initialGroupOption ? [initialGroupOption] : [],
  );
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [titleAr, setTitleAr] = useState(initial?.titleAr ?? "");
  const [titleEn, setTitleEn] = useState(initial?.titleEn ?? "");
  const [leadAr, setLeadAr] = useState(initial?.leadAr ?? "");
  const [leadEn, setLeadEn] = useState(initial?.leadEn ?? "");
  const [bodyAr, setBodyAr] = useState(initial?.bodyAr ?? "");
  const [bodyEn, setBodyEn] = useState(initial?.bodyEn ?? "");
  const [questionsAr, setQuestionsAr] = useState(initial?.questionsAr ?? "");
  const [questionsEn, setQuestionsEn] = useState(initial?.questionsEn ?? "");
  const [axes, setAxes] = useState<BilingualRow[]>(
    initial?.axes && initial.axes.length > 0 ? initial.axes : [emptyRow()],
  );
  const [durationAr, setDurationAr] = useState(initial?.durationAr ?? "");
  const [durationEn, setDurationEn] = useState(initial?.durationEn ?? "");
  const [impacts, setImpacts] = useState<BilingualRow[]>(
    initial?.impacts && initial.impacts.length > 0 ? initial.impacts : [emptyRow()],
  );
  const [enStatus, setEnStatus] = useState<"pending" | "ready">(initial?.enStatus ?? "pending");
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

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!orgUnitId) {
        setGroups([]);
        return;
      }
      setGroupsLoading(true);
      try {
        const res = await fetch(`/api/research-groups?orgUnitId=${encodeURIComponent(orgUnitId)}`);
        const data = (await res.json()) as { ok: boolean; items?: ResearchGroupOption[] };
        if (cancelled || !data.ok || !data.items) return;
        const fetched = data.items;
        const keep =
          initialGroupOption && orgUnitId === initial?.orgUnitId && !fetched.some((g) => g.id === initialGroupOption.id)
            ? [initialGroupOption]
            : [];
        setGroups([...keep, ...fetched]);
      } finally {
        if (!cancelled) setGroupsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [orgUnitId, initial?.orgUnitId, initialGroupOption]);

  function updateRow(list: BilingualRow[], set: (r: BilingualRow[]) => void, index: number, patch: Partial<BilingualRow>) {
    set(list.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function fields() {
    return {
      orgUnitId,
      researchGroupId,
      titleAr,
      titleEn,
      leadAr,
      leadEn,
      bodyAr,
      bodyEn,
      questionsAr,
      questionsEn,
      axes: axes.filter((a) => a.ar.trim()).map((a) => ({ ar: a.ar, en: a.en })),
      durationAr,
      durationEn,
      impacts: impacts.filter((i) => i.ar.trim()).map((i) => ({ ar: i.ar, en: i.en })),
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
      const res = await fetch("/api/research-projects", {
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
      router.push(`/dashboard/research-projects/${data.item.id}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function run(action: string, extra?: Record<string, unknown>) {
    if (!initial?.id) return;
    if (action === "delete") {
      const ok = window.confirm(t("confirmDelete", lang));
      if (!ok) return;
    }
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/research-projects/${initial.id}`, {
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
        cmsToast.success(t("deletedShort", lang));
        router.push("/dashboard");
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
              onChange={(e) => {
                setOrgUnitId(e.target.value);
                setResearchGroupId("");
              }}
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
            <span className="font-medium">{t("fieldResearchGroupRequired", lang)}</span>
            <select
              disabled={!editable || groupsLoading}
              value={researchGroupId}
              onChange={(e) => setResearchGroupId(e.target.value)}
              className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
            >
              <option value="">— select a group —</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title_ar} {g.title_en ? `(${g.title_en})` : ""}
                </option>
              ))}
            </select>
            {groupsLoading ? <p className="mt-1 text-xs text-crs-muted">{t("loadingGroups", lang)}</p> : null}
            {!groupsLoading && groups.length === 0 ? (
              <p className="mt-1 text-xs text-amber-700">{t("noPublishedGroups", lang)}</p>
            ) : null}
          </label>
          <label className="text-sm">
            <span className="font-medium">{t("fieldProjectTitleAr", lang)}</span>
            <input dir="rtl" required disabled={!editable} value={titleAr} onChange={(e) => setTitleAr(e.target.value)} className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink" />
          </label>

          <label className="text-sm">
            <span className="font-medium">{t("fieldLeadArRequired", lang)}</span>
            <input dir="rtl" disabled={!editable} value={leadAr} onChange={(e) => setLeadAr(e.target.value)} className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink" />
          </label>
        </FormSection>

        <FormSection step={2} title={t("sectionBody", lang)}>
          <RichBodyEditor label={t("fieldDibajaAr", lang)} value={bodyAr} onChange={setBodyAr} disabled={!editable} dir="rtl" />

          <label className="text-sm">
            <span className="font-medium">{t("fieldQuestionsAr", lang)}</span>
            <textarea dir="rtl" disabled={!editable} value={questionsAr} onChange={(e) => setQuestionsAr(e.target.value)} rows={3} className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink" />
          </label>
        </FormSection>

        <FormSection step={3} title={t("sectionDetails", lang)}>
          <fieldset className="grid gap-2 rounded border border-crs-border bg-crs-bg/80 p-3">
            <legend className="px-1 text-sm font-semibold text-crs-ink">{t("fieldResearchAxes", lang)}</legend>
            {axes.map((row, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input dir="rtl" disabled={!editable} placeholder={t("phAxisAr", lang)} value={row.ar} onChange={(e) => updateRow(axes, setAxes, i, { ar: e.target.value })} className="min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink" />
                <input disabled={!editable} placeholder={t("phAxisEn", lang)} value={row.en} onChange={(e) => updateRow(axes, setAxes, i, { en: e.target.value })} className="min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink" />
                {editable ? (
                  <button type="button" onClick={() => setAxes((prev) => prev.filter((_, j) => j !== i))} className="rounded border border-red-300 px-3 py-2 text-xs text-red-700">
                    {t("actionRemove", lang)}
                  </button>
                ) : null}
              </div>
            ))}
            {editable ? (
              <button type="button" onClick={() => setAxes((prev) => [...prev, emptyRow()])} className="w-fit text-xs underline">
                {t("actionAddAxis", lang)}
              </button>
            ) : null}
          </fieldset>

          <label className="text-sm">
            <span className="font-medium">{t("fieldDurationAr", lang)}</span>
            <input dir="rtl" disabled={!editable} value={durationAr} onChange={(e) => setDurationAr(e.target.value)} className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink" />
          </label>

          <fieldset className="grid gap-2 rounded border border-crs-border bg-crs-bg/80 p-3">
            <legend className="px-1 text-sm font-semibold text-crs-ink">{t("fieldImpacts", lang)}</legend>
            {impacts.map((row, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input dir="rtl" disabled={!editable} placeholder={t("phImpactAr", lang)} value={row.ar} onChange={(e) => updateRow(impacts, setImpacts, i, { ar: e.target.value })} className="min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink" />
                <input disabled={!editable} placeholder={t("phImpactEn", lang)} value={row.en} onChange={(e) => updateRow(impacts, setImpacts, i, { en: e.target.value })} className="min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink" />
                {editable ? (
                  <button type="button" onClick={() => setImpacts((prev) => prev.filter((_, j) => j !== i))} className="rounded border border-red-300 px-3 py-2 text-xs text-red-700">
                    {t("actionRemove", lang)}
                  </button>
                ) : null}
              </div>
            ))}
            {editable ? (
              <button type="button" onClick={() => setImpacts((prev) => [...prev, emptyRow()])} className="w-fit text-xs underline">
                {t("actionAddImpact", lang)}
              </button>
            ) : null}
          </fieldset>
        </FormSection>

        <AdvancedDisclosure
          step={4}
          title={t("sectionAdvanced", lang)}
          hint={t("sectionAdvancedHint", lang)}
        >
          <label className="text-sm">
            <span className="font-medium">{t("fieldProjectTitleEn", lang)}</span>
            <input disabled={!editable} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink" />
          </label>
          <label className="text-sm">
            <span className="font-medium">{t("fieldLeadEn", lang)}</span>
            <input disabled={!editable} value={leadEn} onChange={(e) => setLeadEn(e.target.value)} className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink" />
          </label>
          <RichBodyEditor label={t("fieldDibajaEn", lang)} value={bodyEn} onChange={setBodyEn} disabled={!editable} dir="ltr" />
          <label className="text-sm">
            <span className="font-medium">{t("fieldQuestionsEn", lang)}</span>
            <textarea disabled={!editable} value={questionsEn} onChange={(e) => setQuestionsEn(e.target.value)} rows={3} className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink" />
          </label>
          <label className="text-sm">
            <span className="font-medium">{t("fieldDurationEn", lang)}</span>
            <input disabled={!editable} value={durationEn} onChange={(e) => setDurationEn(e.target.value)} className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink" />
          </label>
          <label className="text-sm">
            <span className="font-medium">{t("enStatus", lang)}</span>
            <select disabled={!editable} value={enStatus} onChange={(e) => setEnStatus(e.target.value as "pending" | "ready")} className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink">
              <option value="pending">{t("enStatusPending", lang)}</option>
              <option value="ready">{t("enStatusReady", lang)}</option>
            </select>
          </label>
          <SeoFieldsSection
            value={seo}
            onChange={setSeo}
            disabled={!editable}
            ogBucket="research"
            ogFallbackHint="img/cms/research/..."
            onCopyTitleAr={() => setSeo((s) => copyMetaTitleFrom(titleAr, s))}
          />
        </AdvancedDisclosure>

        <FormStickyActions>
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            {mode === "create" ? (
              <button
                type="submit"
                disabled={pending || !researchGroupId}
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

      {mode === "edit" && initial?.id ? (
        <PublicPreviewButton contentId={initial.id} disabled={pending} />
      ) : null}

      {mode === "edit" && canReview && (initial?.status === "approved" || initial?.status === "unpublished") ? (
        <PublishButton pending={pending} onClick={() => void run("publish")}>
          {t("actionPublish", lang)}
        </PublishButton>
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
          className="w-fit rounded border border-red-300 px-4 py-2 text-sm text-red-800"
          onClick={() => void run("delete")}
        >
          {t("actionDelete", lang)}
        </button>
      ) : null}
    </div>
  );
}
