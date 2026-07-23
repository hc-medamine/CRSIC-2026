"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ItemWorkflowMeta, type PersonDisplay } from "@/app/dashboard/item-workflow-meta";
import {
  SeoFieldsSection,
  copyMetaTitleFrom,
  emptySeoFormState,
  type SeoFormState,
} from "@/app/dashboard/seo-fields";
import { cmsToast } from "@/app/dashboard/cms-toast";
import { AdvancedDisclosure, FormBanner, FormSection, FormStickyActions, messageForAction } from "@/app/dashboard/form-ux";
import { t } from "@/lib/i18n/labels";

type OrgUnit = { id: string; name_ar: string; name_en: string };

type Initial = {
  id?: string;
  orgUnitId: string;
  titleAr: string;
  titleEn: string;
  labelAr: string;
  labelEn: string;
  enStatus: "pending" | "ready";
  partnerScope: "intl" | "nat";
  partnerDate: string;
  partnerEmoji: string;
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

export function PartnerEditorForm({
  mode,
  orgUnits,
  initial,
  canSubmit,
  canReview,
  isAuthor,
  canDelete,
}: Props) {
  const router = useRouter();
  const [orgUnitId, setOrgUnitId] = useState(initial?.orgUnitId ?? orgUnits[0]?.id ?? "");
  const [titleAr, setTitleAr] = useState(initial?.titleAr ?? "");
  const [titleEn, setTitleEn] = useState(initial?.titleEn ?? "");
  const [labelAr, setLabelAr] = useState(initial?.labelAr ?? "");
  const [labelEn, setLabelEn] = useState(initial?.labelEn ?? "");
  const [enStatus, setEnStatus] = useState<"pending" | "ready">(initial?.enStatus ?? "pending");
  const [partnerScope, setPartnerScope] = useState<"intl" | "nat">(initial?.partnerScope ?? "nat");
  const [partnerDate, setPartnerDate] = useState(initial?.partnerDate ?? "");
  const [partnerEmoji, setPartnerEmoji] = useState(initial?.partnerEmoji ?? "");
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

  function fields() {
    return {
      orgUnitId,
      titleAr,
      titleEn,
      labelAr,
      labelEn,
      enStatus,
      partnerScope,
      partnerDate,
      partnerEmoji,
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
      const res = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields()),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; item?: { id: string } };
      if (!res.ok || !data.ok || !data.item) {
        const msg = data.error ?? "Create failed";
        setError(msg);
        cmsToast.error(msg);
        return;
      }
      cmsToast.success("Draft created.");
      router.push(`/dashboard/partners/${data.item.id}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function run(action: string, extra?: Record<string, unknown>) {
    if (!initial?.id) return;
    if (action === "delete") {
      const ok = window.confirm(
        "Permanently delete this item? This cannot be undone.",
      );
      if (!ok) return;
    }
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/partners/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; deleted?: boolean };
      if (!res.ok || !data.ok) {
        const msg = data.error ?? "Action failed";
        setError(msg);
        cmsToast.error(msg);
        return;
      }
      if (data.deleted) {
        cmsToast.success("Deleted.");
        router.push("/dashboard");
        router.refresh();
        return;
      }
      const key = messageForAction(action);
      const msg = t(key || "savedStay", "en");
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
        <FormSection step={1} title={t("sectionIdentity", "en")}>
          <label className="text-sm">
            <span className="font-medium">Organisation unit</span>
            <select
              disabled={!editable}
              value={orgUnitId}
              onChange={(e) => setOrgUnitId(e.target.value)}
              className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
            >
              {orgUnits.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name_en} ({o.name_ar})
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="font-medium">Scope</span>
              <select
                disabled={!editable}
                value={partnerScope}
                onChange={(e) => setPartnerScope(e.target.value as "intl" | "nat")}
                className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
              >
                <option value="nat">National (nat)</option>
                <option value="intl">International (intl)</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="font-medium">Date *</span>
              <input dir="rtl" disabled={!editable} value={partnerDate} onChange={(e) => setPartnerDate(e.target.value)} className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink" placeholder="يونيو 2023" />
            </label>
          </div>

          <label className="text-sm">
            <span className="font-medium">Partner name (AR) *</span>
            <input dir="rtl" required disabled={!editable} value={titleAr} onChange={(e) => setTitleAr(e.target.value)} className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink" />
          </label>
          <label className="text-sm">
            <span className="font-medium">Country (AR) *</span>
            <input dir="rtl" disabled={!editable} value={labelAr} onChange={(e) => setLabelAr(e.target.value)} className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink" />
          </label>
          <label className="text-sm">
            <span className="font-medium">Emoji (optional)</span>
            <input disabled={!editable} value={partnerEmoji} onChange={(e) => setPartnerEmoji(e.target.value)} className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink" placeholder="🇰🇷" />
          </label>
        </FormSection>

        <AdvancedDisclosure
          step={2}
          title={t("sectionAdvanced", "en")}
          hint={t("sectionAdvancedHint", "en")}
        >
          <label className="text-sm">
            <span className="font-medium">Partner name (EN)</span>
            <input disabled={!editable} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink" />
          </label>
          <label className="text-sm">
            <span className="font-medium">Country (EN)</span>
            <input disabled={!editable} value={labelEn} onChange={(e) => setLabelEn(e.target.value)} className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink" />
          </label>
          <label className="text-sm">
            <span className="font-medium">EN status</span>
            <select disabled={!editable} value={enStatus} onChange={(e) => setEnStatus(e.target.value as "pending" | "ready")} className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink">
              <option value="pending">pending</option>
              <option value="ready">ready</option>
            </select>
          </label>
          <SeoFieldsSection
            value={seo}
            onChange={setSeo}
            disabled={!editable}
            onCopyTitleAr={() => setSeo((s) => copyMetaTitleFrom(titleAr, s))}
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
                {pending ? "Saving…" : "Create draft"}
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
                  Save draft
                </button>
                {canSubmit ? (
                  <label className="me-auto flex items-center gap-2 text-sm text-crs-ink">
                    <input type="checkbox" checked={checklist} onChange={(e) => setChecklist(e.target.checked)} />
                    Checklist OK
                  </label>
                ) : null}
                {canSubmit ? (
                  <button
                    type="button"
                    disabled={pending || !checklist}
                    className="inline-flex min-h-11 items-center rounded-xl bg-crs-primary px-4 py-2 text-sm font-medium text-white hover:bg-crs-secondary disabled:opacity-60"
                    onClick={() => void run("submit", { checklistConfirmed: checklist })}
                  >
                    Submit for review
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
                Withdraw
              </button>
            ) : null}
          </div>
        </FormStickyActions>
      </form>

      {mode === "edit" && canReview && initial?.status === "submitted" ? (
        <div className="grid gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium">Reviewer actions</p>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for changes / rejection" className="w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink" rows={2} />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending} className="rounded-lg bg-crs-primary hover:bg-crs-secondary px-3 py-1.5 text-sm text-white" onClick={() => void run("approve")}>Approve</button>
            <button type="button" disabled={pending} className="inline-flex min-h-11 items-center rounded-lg border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink hover:bg-crs-bg" onClick={() => void run("request_changes", { note })}>Request changes</button>
            <button type="button" disabled={pending} className="inline-flex min-h-11 items-center rounded-lg border border-red-300 bg-crs-surface px-3 py-2 text-sm text-red-700 hover:bg-red-50" onClick={() => void run("reject", { note })}>Reject</button>
          </div>
        </div>
      ) : null}

      {mode === "edit" && canReview && (initial?.status === "approved" || initial?.status === "unpublished") ? (
        <button type="button" disabled={pending} className="w-fit rounded bg-crs-primary px-4 py-2 text-sm text-white" onClick={() => void run("publish")}>
          Publish to public partners.json
        </button>
      ) : null}

      {mode === "edit" && (isAuthor || canReview) && initial?.status === "published" ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={pending} className="w-fit rounded border border-crs-secondary/40 px-4 py-2 text-sm text-crs-primary" onClick={() => void run("start_revision")}>
            Create revision (public stays live)
          </button>
          {canReview ? (
            <button type="button" disabled={pending} className="w-fit inline-flex min-h-11 items-center rounded-lg border border-crs-border bg-crs-surface px-4 py-2 text-sm text-crs-ink hover:bg-crs-bg" onClick={() => void run("unpublish")}>
              Unpublish
            </button>
          ) : null}
        </div>
      ) : null}

      {mode === "edit" && isAuthor && initial?.status === "rejected" ? (
        <button type="button" disabled={pending} className="w-fit rounded border border-amber-300 px-4 py-2 text-sm text-amber-900" onClick={() => void run("reopen_rejected")}>
          Reopen as draft
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
          Delete permanently
        </button>
      ) : null}
    </div>
  );
}
