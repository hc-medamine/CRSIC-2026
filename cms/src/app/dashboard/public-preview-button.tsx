"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cmsToast } from "@/app/dashboard/cms-toast";
import { t } from "@/lib/i18n/labels";
import { useCmsLang } from "@/lib/i18n/cms-lang";

type Props = {
  contentId: string;
  disabled?: boolean;
};

/**
 * Creates an A1 preview token and opens the in-CMS preview page (always works).
 */
export function PublicPreviewButton({ contentId, disabled }: Props) {
  const lang = useCmsLang();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPreview() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/content/${contentId}/preview`, { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        token?: string;
      };
      if (!res.ok || !data.ok || !data.token) {
        throw new Error(data.error || t("previewFailed", lang));
      }

      cmsToast.success(t("previewOpening", lang));
      router.push(`/dashboard/preview/${encodeURIComponent(data.token)}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("previewFailed", lang);
      setError(msg);
      cmsToast.error(msg);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        disabled={disabled || pending || !contentId}
        onClick={() => void openPreview()}
        className="w-fit rounded-xl border border-sky-600 bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-900 disabled:opacity-60"
      >
        {pending ? t("previewCreating", lang) : t("previewOpen", lang)}
      </button>
      <p className="text-xs text-crs-muted">{t("previewHint", lang)}</p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
