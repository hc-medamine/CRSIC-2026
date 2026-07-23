"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import type { MediaBucket } from "@/lib/media/config";
import { cmsMediaSrc, isPdfPath } from "@/lib/media/cms-src";
import type { PublicMediaItem } from "@/lib/publish/media";
import { cmsToast } from "@/app/dashboard/cms-toast";
import { MediaLightbox } from "./media-lightbox";

type Props = {
  bucket: MediaBucket;
  items: PublicMediaItem[];
  disabled?: boolean;
  onChange: (items: PublicMediaItem[]) => void;
};

export function MediaAttachmentsField({ bucket, items, disabled, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const uploadFile = useCallback(
    async (file: File | null) => {
      if (!file || disabled) return;
      setPending(true);
      setError(null);
      try {
        const form = new FormData();
        form.set("file", file);
        form.set("bucket", bucket);
        const res = await fetch("/api/media", { method: "POST", body: form });
        const data = (await res.json()) as {
          ok: boolean;
          error?: string;
          asset?: { publicPath: string; mimeType?: string };
        };
        if (!res.ok || !data.ok || !data.asset) {
          const msg = data.error ?? "Upload failed";
          setError(msg);
          cmsToast.error(msg);
          return;
        }
        const kind: PublicMediaItem["kind"] =
          file.type === "application/pdf" || data.asset.publicPath.toLowerCase().endsWith(".pdf")
            ? "pdf"
            : "image";
        onChange([...items, { kind, src: data.asset.publicPath }]);
        cmsToast.success("Uploaded.");
      } finally {
        setPending(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [bucket, disabled, items, onChange],
  );

  function removeAt(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...items];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j]!, next[index]!];
    onChange(next);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (disabled || pending) return;
    void uploadFile(e.dataTransfer.files?.[0] ?? null);
  }

  return (
    <div className="grid gap-3 text-sm">
      <p className="font-medium text-crs-ink">Attachments (images + PDFs)</p>
      <p className="text-xs text-crs-muted">
        First image is the public card cover. Max 5 MB each · JPEG / PNG / WebP / PDF.
      </p>

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
          Max 5 MB · JPEG / PNG / WebP / PDF ·{" "}
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
          accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
          disabled={disabled || pending}
          className="sr-only"
          onChange={(e) => void uploadFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-crs-muted">No attachments yet.</p>
      ) : (
        <ul className="grid gap-2">
          {items.map((item, i) => {
            const src = cmsMediaSrc(item.src);
            const pdf = item.kind === "pdf" || isPdfPath(item.src);
            return (
              <li
                key={`${item.src}-${i}`}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-crs-border bg-crs-surface p-2"
              >
                {pdf || !src ? (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-crs-bg text-[10px] font-semibold uppercase text-crs-muted">
                    PDF
                  </div>
                ) : (
                  <button
                    type="button"
                    className="shrink-0 overflow-hidden rounded-lg ring-1 ring-crs-border"
                    onClick={() => setLightboxSrc(src)}
                    aria-label="Open image preview"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-16 w-16 object-cover" />
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase text-crs-muted">
                    {item.kind}
                    {i === 0 && item.kind === "image" ? " · card cover" : ""}
                  </p>
                  <p className="break-all text-xs text-crs-ink">{item.src}</p>
                </div>
                <span className="flex gap-1">
                  <button
                    type="button"
                    disabled={disabled || i === 0}
                    className="min-h-9 rounded-lg border border-crs-border px-2 text-xs disabled:opacity-40"
                    onClick={() => move(i, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={disabled || i === items.length - 1}
                    className="min-h-9 rounded-lg border border-crs-border px-2 text-xs disabled:opacity-40"
                    onClick={() => move(i, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    className="min-h-9 rounded-lg border border-red-200 px-2 text-xs text-red-700"
                    onClick={() => removeAt(i)}
                  >
                    Remove
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <MediaLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
