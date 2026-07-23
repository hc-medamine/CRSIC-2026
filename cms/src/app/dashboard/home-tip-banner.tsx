"use client";

import { useEffect, useState } from "react";
import { t, type CmsLang } from "@/lib/i18n/labels";

/** Session-only dismiss so the tip can return next visit. */
const TIP_KEY = "cms_home_tip_dismissed_session";

export function HomeTipBanner({ lang }: { lang: CmsLang }) {
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setVisible(sessionStorage.getItem(TIP_KEY) !== "1");
    } catch {
      setVisible(true);
    }
    setReady(true);
  }, []);

  if (!ready) return null;

  if (!visible) {
    return (
      <button
        type="button"
        className="self-start text-xs text-zinc-500 underline hover:text-zinc-800"
        onClick={() => {
          try {
            sessionStorage.removeItem(TIP_KEY);
          } catch {
            /* ignore */
          }
          setVisible(true);
        }}
      >
        {t("showTip", lang)}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p>{t("homeTip", lang)}</p>
      <button
        type="button"
        className="shrink-0 rounded border border-amber-300 bg-white px-2 py-1 text-xs hover:bg-amber-100"
        onClick={() => {
          try {
            sessionStorage.setItem(TIP_KEY, "1");
          } catch {
            /* ignore */
          }
          setVisible(false);
        }}
      >
        {t("dismissTip", lang)}
      </button>
    </div>
  );
}
