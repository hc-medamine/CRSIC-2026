"use client";

import { useRef, useState } from "react";
import type { MediaBucket } from "@/lib/media/config";

type Props = {
  bucket: MediaBucket;
  publicPath: string;
  mediaId?: string | null;
  disabled?: boolean;
  imagesOnly?: boolean;
  label?: string;
  onUploaded: (info: { publicPath: string; mediaId: string }) => void;
};

export function MediaUploadField({
  bucket,
  publicPath,
  mediaId,
  disabled,
  imagesOnly = true,
  label = "Image",
  onUploaded,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFileChange(file: File | null) {
    if (!file || disabled) return;
    setPending(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("bucket", bucket);
      if (imagesOnly) form.set("imagesOnly", "1");

      const url = mediaId ? `/api/media/${mediaId}` : "/api/media";
      const res = await fetch(url, { method: "POST", body: form });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        asset?: { id: string; publicPath: string };
      };
      if (!res.ok || !data.ok || !data.asset) {
        setError(data.error ?? "Upload failed");
        return;
      }
      onUploaded({ publicPath: data.asset.publicPath, mediaId: data.asset.id });
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const accept = imagesOnly ? "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" : "image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf";

  return (
    <div className="grid gap-2 rounded border border-zinc-200 bg-zinc-50 p-3 text-sm">
      <p className="font-medium">{label}</p>
      <p className="text-xs text-zinc-500">
        Max 5 MB · {imagesOnly ? "JPEG / PNG / WebP" : "JPEG / PNG / WebP / PDF"} · path{" "}
        <code className="text-[11px]">img/cms/{bucket}/…</code>
        {mediaId ? " · replace keeps the same URL" : ""}
      </p>
      {publicPath ? (
        <p className="break-all text-xs text-zinc-700">
          Current: <code>{publicPath}</code>
        </p>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled || pending}
        onChange={(e) => void onFileChange(e.target.files?.[0] ?? null)}
        className="text-xs"
      />
      {pending ? <p className="text-xs text-zinc-500">Uploading…</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
