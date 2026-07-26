"use client";

import { CMS_LANG_COOKIE, t, type CmsLang } from "@/lib/i18n/labels";

type Props = { lang: CmsLang };

export function LoginLangToggle({ lang }: Props) {
  function toggleLang() {
    const next: CmsLang = lang === "ar" ? "en" : "ar";
    document.cookie = `${CMS_LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  }

  return (
    <button
      type="button"
      onClick={toggleLang}
      className="min-h-11 rounded-xl border border-crs-border bg-crs-surface/95 px-3 text-xs font-medium text-crs-ink shadow-sm backdrop-blur hover:bg-crs-bg"
      aria-label={t("langToggleAria", lang)}
    >
      {t("langToggle", lang)}
    </button>
  );
}
