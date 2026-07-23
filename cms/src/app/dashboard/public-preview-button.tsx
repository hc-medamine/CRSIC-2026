"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cmsToast } from "@/app/dashboard/cms-toast";

type Props = {
  contentId: string;
  disabled?: boolean;
};

/**
 * Creates an A1 preview token and opens the in-CMS preview page (always works).
 */
export function PublicPreviewButton({ contentId, disabled }: Props) {
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
        throw new Error(data.error || "Preview failed");
      }

      cmsToast.success("Opening preview…");
      router.push(`/dashboard/preview/${encodeURIComponent(data.token)}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Preview failed";
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
        {pending ? "Creating preview…" : "Open public preview"}
      </button>
      <p className="text-xs text-crs-muted">
        Opens a full candidate preview in the CMS (image, title, body). From there you can also open
        the public SPA if it is running.
      </p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
