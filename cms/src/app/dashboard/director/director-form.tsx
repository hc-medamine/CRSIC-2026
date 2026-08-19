"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MediaUploadField } from "@/app/dashboard/media-upload-field";
import { cmsToast } from "@/app/dashboard/cms-toast";
import { FormBanner, FormSection, FormStickyActions, PublishButton } from "@/app/dashboard/form-ux";
import { t } from "@/lib/i18n/labels";
import { useCmsLang } from "@/lib/i18n/cms-lang";

type Initial = {
  quoteAr: string;
  quoteEn: string;
  nameAr: string;
  nameEn: string;
  roleAr: string;
  roleEn: string;
  portraitPath: string;
  portraitAltAr: string;
  portraitAltEn: string;
  publishedAt: string | null;
  updatedAt: string | null;
};

export function DirectorEditorForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const lang = useCmsLang();
  const [quoteAr, setQuoteAr] = useState(initial.quoteAr);
  const [quoteEn, setQuoteEn] = useState(initial.quoteEn);
  const [nameAr, setNameAr] = useState(initial.nameAr);
  const [nameEn, setNameEn] = useState(initial.nameEn);
  const [roleAr, setRoleAr] = useState(initial.roleAr);
  const [roleEn, setRoleEn] = useState(initial.roleEn);
  const [portraitPath, setPortraitPath] = useState(initial.portraitPath);
  const [portraitAltAr, setPortraitAltAr] = useState(initial.portraitAltAr);
  const [portraitAltEn, setPortraitAltEn] = useState(initial.portraitAltEn);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function fields() {
    return {
      quoteAr,
      quoteEn,
      nameAr,
      nameEn,
      roleAr,
      roleEn,
      portraitPath: portraitPath.trim() || null,
      portraitAltAr: portraitAltAr.trim() || null,
      portraitAltEn: portraitAltEn.trim() || null,
    };
  }

  async function run(action: "save" | "publish") {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      if (action === "publish") {
        const saveRes = await fetch("/api/director", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "save", fields: fields() }),
        });
        const saveData = (await saveRes.json()) as { ok: boolean; error?: string };
        if (!saveRes.ok || !saveData.ok) {
          const msg = saveData.error ?? t("actionFailed", lang);
          setError(msg);
          cmsToast.error(msg);
          return;
        }
      }
      const res = await fetch("/api/director", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "save" ? { action: "save", fields: fields() } : { action: "publish" },
        ),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        const msg = data.error ?? t("actionFailed", lang);
        setError(msg);
        cmsToast.error(msg);
        return;
      }
      const msg =
        action === "publish" ? t("directorPublished", lang) : t("directorSaved", lang);
      setMessage(msg);
      cmsToast.success(msg);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <FormBanner kind="error">{error}</FormBanner> : null}
      {message ? <FormBanner kind="success">{message}</FormBanner> : null}
      {initial.publishedAt ? (
        <p className="text-sm text-crs-muted">
          {t("directorLastPublished", lang)}:{" "}
          {initial.publishedAt.slice(0, 16).replace("T", " ")}
        </p>
      ) : (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {t("directorNeverPublished", lang)}
        </p>
      )}

      <form
        onSubmit={(e) => e.preventDefault()}
        className="flex flex-col gap-1 cms-form rounded-2xl border border-crs-border bg-crs-surface p-6 shadow-sm"
      >
        <FormSection step={1} title={t("directorSectionQuote", lang)}>
          <label className="text-sm">
            <span className="font-medium">{t("directorQuoteAr", lang)}</span>
            <textarea
              dir="rtl"
              required
              value={quoteAr}
              onChange={(e) => setQuoteAr(e.target.value)}
              className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
              rows={4}
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">{t("directorQuoteEn", lang)}</span>
            <textarea
              dir="ltr"
              required
              value={quoteEn}
              onChange={(e) => setQuoteEn(e.target.value)}
              className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
              rows={4}
            />
          </label>
        </FormSection>

        <FormSection step={2} title={t("directorSectionIdentity", lang)}>
          <label className="text-sm">
            <span className="font-medium">{t("directorNameAr", lang)}</span>
            <input
              dir="rtl"
              required
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">{t("directorNameEn", lang)}</span>
            <input
              dir="ltr"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">{t("directorRoleAr", lang)}</span>
            <input
              dir="rtl"
              required
              value={roleAr}
              onChange={(e) => setRoleAr(e.target.value)}
              className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">{t("directorRoleEn", lang)}</span>
            <input
              dir="ltr"
              value={roleEn}
              onChange={(e) => setRoleEn(e.target.value)}
              className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
            />
          </label>
        </FormSection>

        <FormSection step={3} title={t("directorSectionPortrait", lang)}>
          <MediaUploadField
            bucket="site"
            publicPath={portraitPath}
            imagesOnly
            label={t("directorPortrait", lang)}
            disabled={false}
            onUploaded={({ publicPath }) => setPortraitPath(publicPath)}
          />
          <label className="text-sm">
            <span className="font-medium">{t("directorPortraitAltAr", lang)}</span>
            <input
              dir="rtl"
              value={portraitAltAr}
              onChange={(e) => setPortraitAltAr(e.target.value)}
              className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">{t("directorPortraitAltEn", lang)}</span>
            <input
              dir="ltr"
              value={portraitAltEn}
              onChange={(e) => setPortraitAltEn(e.target.value)}
              className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
            />
          </label>
        </FormSection>

        <FormStickyActions>
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              disabled={pending}
              className="inline-flex min-h-11 items-center rounded-xl border border-crs-border bg-crs-surface px-4 py-2 text-sm text-crs-ink hover:bg-crs-bg disabled:opacity-60"
              onClick={() => void run("save")}
            >
              {t("actionSaveDraft", lang)}
            </button>
            <PublishButton
              pending={pending}
              onClick={() => void run("publish")}
              className="min-h-11 items-center rounded-xl bg-crs-primary px-4 py-2 text-sm font-medium text-white hover:bg-crs-secondary disabled:opacity-60"
            >
              {t("actionPublish", lang)}
            </PublishButton>
          </div>
        </FormStickyActions>
      </form>
    </div>
  );
}
