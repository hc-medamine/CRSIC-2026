"use client";

import { useEffect, useState } from "react";
import { t } from "@/lib/i18n/labels";
import { useCmsLang } from "@/lib/i18n/cms-lang";

type Props = {
  spaUrl: string;
};

function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/** Only show the SPA preview link when the public origin responds. */
export function SpaPreviewLink({ spaUrl }: Props) {
  const lang = useCmsLang();
  const origin = originOf(spaUrl);
  const [ok, setOk] = useState<boolean | null>(origin ? null : false);

  useEffect(() => {
    if (!origin) return;
    let cancelled = false;
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 1500);

    fetch(`${origin}/`, { method: "GET", mode: "no-cors", signal: ctrl.signal })
      .then(() => {
        if (!cancelled) setOk(true);
      })
      .catch(() => {
        if (!cancelled) setOk(false);
      })
      .finally(() => window.clearTimeout(timer));

    return () => {
      cancelled = true;
      ctrl.abort();
      window.clearTimeout(timer);
    };
  }, [origin]);

  if (ok !== true) {
    if (ok === false) {
      return <p className="max-w-xs text-xs text-crs-muted">{t("previewSpaMissing", lang)}</p>;
    }
    return null;
  }

  return (
    <a
      href={spaUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 items-center rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-xs font-medium text-crs-ink hover:bg-crs-bg"
    >
      {t("previewOpenOnSite", lang)}
    </a>
  );
}
