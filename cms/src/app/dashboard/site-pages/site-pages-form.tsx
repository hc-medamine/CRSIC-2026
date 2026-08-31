"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { cmsToast } from "@/app/dashboard/cms-toast";
import { FormBanner, FormSection, FormStickyActions, PublishButton } from "@/app/dashboard/form-ux";
import { t } from "@/lib/i18n/labels";
import { useCmsLang } from "@/lib/i18n/cms-lang";
import { SITE_PAGE_SECTIONS, isLongSitePageField } from "@/lib/content/sitePageKeys";

type Initial = {
  fieldsAr: Record<string, string>;
  fieldsEn: Record<string, string>;
  email: string;
  phone: string;
  webmailUrl: string;
  webmailText: string;
  publishedAt: string | null;
  updatedAt: string | null;
};

const SECTION_TITLE: Record<(typeof SITE_PAGE_SECTIONS)[number]["id"], string> = {
  about: "sitePagesSectionAbout",
  org: "sitePagesSectionOrg",
  contact: "sitePagesSectionContact",
  cooperation: "sitePagesSectionCoop",
};

const fieldClass =
  "mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink";

export function SitePagesEditorForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const lang = useCmsLang();
  const [fieldsAr, setFieldsAr] = useState<Record<string, string>>(initial.fieldsAr);
  const [fieldsEn, setFieldsEn] = useState<Record<string, string>>(initial.fieldsEn);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone);
  const [webmailUrl, setWebmailUrl] = useState(initial.webmailUrl);
  const [webmailText, setWebmailText] = useState(initial.webmailText);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function setAr(key: string, value: string) {
    setFieldsAr((prev) => ({ ...prev, [key]: value }));
  }
  function setEn(key: string, value: string) {
    setFieldsEn((prev) => ({ ...prev, [key]: value }));
  }

  function payloadFields() {
    return { fieldsAr, fieldsEn, email, phone, webmailUrl, webmailText };
  }

  async function run(action: "save" | "publish") {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      if (action === "publish") {
        const saveRes = await fetch("/api/site-pages", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "save", fields: payloadFields() }),
        });
        const saveData = (await saveRes.json()) as { ok: boolean; error?: string };
        if (!saveRes.ok || !saveData.ok) {
          const msg = saveData.error ?? t("actionFailed", lang);
          setError(msg);
          cmsToast.error(msg);
          return;
        }
      }
      const res = await fetch("/api/site-pages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "save" ? { action: "save", fields: payloadFields() } : { action: "publish" },
        ),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        const msg =
          action === "publish"
            ? t("sitePagesPublishFailed", lang)
            : (data.error ?? t("actionFailed", lang));
        setError(msg);
        cmsToast.error(msg);
        return;
      }
      const msg = action === "publish" ? t("sitePagesPublished", lang) : t("sitePagesSaved", lang);
      setMessage(msg);
      cmsToast.success(msg);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  function bilingualField(key: string) {
    const long = isLongSitePageField(key);
    const onAr = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setAr(key, e.target.value);
    const onEn = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setEn(key, e.target.value);
    return (
      <div key={key} className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          <span className="font-medium">
            {key} ({t("sitePagesArabic", lang)})
          </span>
          {long ? (
            <textarea
              dir="rtl"
              rows={4}
              value={fieldsAr[key] ?? ""}
              onChange={onAr}
              className={fieldClass}
            />
          ) : (
            <input
              dir="rtl"
              value={fieldsAr[key] ?? ""}
              onChange={onAr}
              className={fieldClass}
            />
          )}
        </label>
        <label className="text-sm">
          <span className="font-medium">
            {key} ({t("sitePagesEnglish", lang)})
          </span>
          {long ? (
            <textarea
              dir="ltr"
              rows={4}
              value={fieldsEn[key] ?? ""}
              onChange={onEn}
              className={fieldClass}
            />
          ) : (
            <input
              dir="ltr"
              value={fieldsEn[key] ?? ""}
              onChange={onEn}
              className={fieldClass}
            />
          )}
        </label>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <FormBanner kind="error">{error}</FormBanner> : null}
      {message ? <FormBanner kind="success">{message}</FormBanner> : null}
      {initial.publishedAt ? (
        <p className="text-sm text-crs-muted">
          {t("sitePagesLastPublished", lang)}: {initial.publishedAt.slice(0, 16).replace("T", " ")}
        </p>
      ) : (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {t("sitePagesNeverPublished", lang)}
        </p>
      )}

      <form
        onSubmit={(e) => e.preventDefault()}
        className="flex flex-col gap-1 cms-form rounded-2xl border border-crs-border bg-crs-surface p-6 shadow-sm"
      >
        {SITE_PAGE_SECTIONS.map((section, idx) => (
          <FormSection key={section.id} step={idx + 1} title={t(SECTION_TITLE[section.id], lang)}>
            {section.id === "about" ? (
              <div className="rounded-xl border border-crs-border bg-crs-bg px-3 py-3 text-sm">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-crs-muted">
                  {t("sitePagesPreview", lang)}
                </p>
                <p dir="rtl" className="font-medium text-crs-ink">
                  {fieldsAr.about_hero_h1 || "—"}
                </p>
                <p dir="rtl" className="mt-1 text-crs-muted">
                  {fieldsAr.about_vision_p || "—"}
                </p>
              </div>
            ) : null}
            {section.keys.map((key) => bilingualField(key))}
            {section.id === "contact" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm">
                  <span className="font-medium">{t("sitePagesEmail", lang)}</span>
                  <input
                    dir="ltr"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={fieldClass}
                  />
                </label>
                <label className="text-sm">
                  <span className="font-medium">{t("sitePagesPhone", lang)}</span>
                  <input
                    dir="ltr"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={fieldClass}
                  />
                </label>
                <label className="text-sm">
                  <span className="font-medium">{t("sitePagesWebmailUrl", lang)}</span>
                  <input
                    dir="ltr"
                    value={webmailUrl}
                    onChange={(e) => setWebmailUrl(e.target.value)}
                    className={fieldClass}
                  />
                </label>
                <label className="text-sm">
                  <span className="font-medium">{t("sitePagesWebmailText", lang)}</span>
                  <input
                    dir="ltr"
                    value={webmailText}
                    onChange={(e) => setWebmailText(e.target.value)}
                    className={fieldClass}
                  />
                </label>
              </div>
            ) : null}
          </FormSection>
        ))}

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
