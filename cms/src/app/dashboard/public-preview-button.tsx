"use client";

import { useState } from "react";

type Props = {
  contentId: string;
  disabled?: boolean;
};

/**
 * Opens the public SPA in A1 preview mode (#preview/{token}).
 * Requires PUBLIC_SITE_URL in CMS env for a full URL; otherwise copies the hash.
 */
export function PublicPreviewButton({ contentId, disabled }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  async function openPreview() {
    setPending(true);
    setError(null);
    setHint(null);
    try {
      const res = await fetch(`/api/content/${contentId}/preview`, { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        publicUrl?: string | null;
        hash?: string;
        expiresAt?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Preview failed");
      }
      if (data.publicUrl) {
        window.open(data.publicUrl, "_blank", "noopener,noreferrer");
        setHint(`Preview opens for ~30 minutes (until ${data.expiresAt ?? "expiry"}).`);
      } else if (data.hash) {
        await navigator.clipboard?.writeText(data.hash);
        setHint(
          `Set PUBLIC_SITE_URL in CMS .env.local, then reopen. Hash copied: ${data.hash}`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-1">
      <button
        type="button"
        disabled={disabled || pending || !contentId}
        onClick={() => void openPreview()}
        className="w-fit rounded border border-sky-600 bg-sky-50 px-4 py-2 text-sm text-sky-900 disabled:opacity-60"
      >
        {pending ? "Creating preview…" : "Open public preview"}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {hint ? <p className="text-xs text-zinc-600">{hint}</p> : null}
    </div>
  );
}
