"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import type { MediaBucket } from "@/lib/media/config";
import { cmsMediaSrc } from "@/lib/media/cms-src";
import { cmsToast } from "@/app/dashboard/cms-toast";
import { MediaLightbox } from "./media-lightbox";

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
  const [dragOver, setDragOver] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const accept = imagesOnly
    ? "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
    : "image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf";

  const previewSrc = cmsMediaSrc(publicPath);
  const isPdf = publicPath.toLowerCase().endsWith(".pdf");

  const uploadFile = useCallback(
    async (file: File | null) => {
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
          const msg = data.error ?? "Upload failed";
          setError(msg);
          cmsToast.error(msg);
          return;
        }
        onUploaded({ publicPath: data.asset.publicPath, mediaId: data.asset.id });
        cmsToast.success("Uploaded.");
      } finally {
        setPending(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [bucket, disabled, imagesOnly, mediaId, onUploaded],
  );

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (disabled || pending) return;
    void uploadFile(e.dataTransfer.files?.[0] ?? null);
  }

  return (
    <div className="grid gap-3 text-sm">
      <p className="font-medium text-crs-ink">{label}</p>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
          dragOver ? "border-crs-primary bg-crs-primary/5" : "border-crs-border bg-crs-bg/50"
        } ${disabled ? "opacity-60" : ""}`}
      >
        <p className="text-sm font-medium text-crs-ink">
          {pending ? "Uploading…" : "Drag & drop a file here"}
        </p>
        <p className="text-xs text-crs-muted">
          Max 5 MB · {imagesOnly ? "JPEG / PNG / WebP" : "JPEG / PNG / WebP / PDF"} ·{" "}
          <code className="text-[11px]">img/cms/{bucket}/…</code>
        </p>
        <button
          type="button"
          disabled={disabled || pending}
          onClick={() => inputRef.current?.click()}
          className="mt-1 inline-flex min-h-11 items-center rounded-xl border border-crs-border bg-crs-surface px-4 text-sm font-medium text-crs-ink hover:bg-crs-bg disabled:opacity-60"
        >
          Browse files
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={disabled || pending}
          className="sr-only"
          onChange={(e) => void uploadFile(e.target.files?.[0] ?? null)}
        />
      </div>
      {publicPath ? (
        <div className="flex flex-wrap items-center gap-3">
          {isPdf || !previewSrc ? (
            <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-crs-bg text-[10px] font-semibold uppercase text-crs-muted ring-1 ring-crs-border">
              {isPdf ? "PDF" : "—"}
            </div>
          ) : (
            <button
              type="button"
              className="overflow-hidden rounded-xl ring-1 ring-crs-border"
              onClick={() => setLightboxSrc(previewSrc)}
              aria-label="Open image preview"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewSrc} alt="" className="h-20 w-20 object-cover" />
            </button>
          )}
          <p className="min-w-0 flex-1 break-all text-xs text-crs-muted">
            Current: <code className="text-crs-ink">{publicPath}</code>
            {mediaId ? " · replace keeps the same URL" : ""}
          </p>
        </div>
      ) : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <MediaLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
