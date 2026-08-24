"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import type { MediaBucket } from "@/lib/media/config";
import { cmsMediaSrc } from "@/lib/media/cms-src";
import { cmsToast } from "@/app/dashboard/cms-toast";
import { MediaLightbox } from "./media-lightbox";
import { ImageCropModal } from "./image-crop-modal";
import { cardFileFromImage, loadImage, variantsFromCrop } from "./image-variants";
import { t } from "@/lib/i18n/labels";
import { useCmsLang } from "@/lib/i18n/cms-lang";

type UploadInfo = { publicPath: string; mediaId: string; cardPath?: string | null };

type Props = {
  bucket: MediaBucket;
  publicPath: string;
  mediaId?: string | null;
  disabled?: boolean;
  imagesOnly?: boolean;
  label?: string;
  /** When replacing a file that is already on the public site, confirm first. */
  liveReplaceConfirm?: boolean;
  /** Optional cover crop + card variant. Off for media library / director. */
  enableCrop?: boolean;
  onUploaded: (info: UploadInfo) => void;
};

export function MediaUploadField({
  bucket,
  publicPath,
  mediaId,
  disabled,
  imagesOnly = true,
  label,
  liveReplaceConfirm = false,
  enableCrop = false,
  onUploaded,
}: Props) {
  const lang = useCmsLang();
  const resolvedLabel = label ?? t("fieldImage", lang);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [pendingReplaceFile, setPendingReplaceFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  const cropEnabled = enableCrop && imagesOnly;

  const accept = imagesOnly
    ? "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
    : "image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf";

  const previewSrc = cmsMediaSrc(publicPath);
  const isPdf = publicPath.toLowerCase().endsWith(".pdf");

  const postFile = useCallback(
    async (file: File) => {
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
          const msg = data.error ?? t("uploadFailed", lang);
          setError(msg);
          cmsToast.error(msg);
          return;
        }
        let cardPath: string | null = null;
        if (cropEnabled) {
          try {
            const objectUrl = URL.createObjectURL(file);
            try {
              const img = await loadImage(objectUrl);
              const card = await cardFileFromImage(img);
              const cardForm = new FormData();
              cardForm.set("file", card);
              cardForm.set("bucket", bucket);
              cardForm.set("imagesOnly", "1");
              const cardRes = await fetch("/api/media", { method: "POST", body: cardForm });
              const cardData = (await cardRes.json()) as {
                ok: boolean;
                asset?: { publicPath: string };
              };
              if (cardRes.ok && cardData.ok && cardData.asset) cardPath = cardData.asset.publicPath;
            } finally {
              URL.revokeObjectURL(objectUrl);
            }
          } catch {
            /* card is optional if the browser cannot decode */
          }
        }
        onUploaded({ publicPath: data.asset.publicPath, mediaId: data.asset.id, cardPath });
        cmsToast.success(t("uploadedShort", lang));
      } finally {
        setPending(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [bucket, cropEnabled, imagesOnly, lang, mediaId, onUploaded],
  );

  const uploadFile = useCallback(
    async (file: File | null) => {
      if (!file || disabled) return;
      if (mediaId && liveReplaceConfirm) {
        setPendingReplaceFile(file);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
      await postFile(file);
    },
    [disabled, liveReplaceConfirm, mediaId, postFile],
  );

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (disabled || pending) return;
    void uploadFile(e.dataTransfer.files?.[0] ?? null);
  }

  return (
    <div className="grid gap-3 text-sm">
      <p className="font-medium text-crs-ink">{resolvedLabel}</p>
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
          {pending ? t("uploading", lang) : t("dragDropFile", lang)}
        </p>
        <p className="text-xs text-crs-muted">
          {t("max5mbPrefix", lang)}{" "}
          {imagesOnly ? t("imagesOnlyFormats", lang) : t("imagesPdfFormats", lang)} ·{" "}
          <code className="text-[11px]">img/cms/{bucket}/…</code>
        </p>
        <button
          type="button"
          disabled={disabled || pending}
          onClick={() => inputRef.current?.click()}
          className="mt-1 inline-flex min-h-11 items-center rounded-xl border border-crs-border bg-crs-surface px-4 text-sm font-medium text-crs-ink hover:bg-crs-bg disabled:opacity-60"
        >
          {t("browseFiles", lang)}
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
              aria-label={t("openImagePreview", lang)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewSrc} alt="" className="h-20 w-20 object-cover" />
            </button>
          )}
          <p className="min-w-0 flex-1 break-all text-xs text-crs-muted">
            Current: <code className="text-crs-ink">{publicPath}</code>
            {mediaId ? " · replace keeps the same URL" : ""}
          </p>
          {cropEnabled && previewSrc && !isPdf ? (
            <button
              type="button"
              disabled={disabled || pending}
              className="inline-flex min-h-11 items-center rounded-xl border border-crs-border px-3 text-sm font-medium hover:bg-crs-bg disabled:opacity-60"
              onClick={() => setCropOpen(true)}
            >
              {t("cropImage", lang)}
            </button>
          ) : null}
        </div>
      ) : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {pendingReplaceFile ? (
        <div
          className="cms-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="media-replace-title"
        >
          <div className="cms-modal-panel w-full max-w-md rounded-2xl border border-crs-border bg-crs-surface p-5 shadow-lg">
            <h2 id="media-replace-title" className="text-base font-semibold text-crs-ink">
              {t("mediaReplaceTitle", lang)}
            </h2>
            <p className="mt-2 text-sm text-crs-muted">{t("mediaLiveReplaceHint", lang)}</p>
            <p className="mt-2 text-xs text-crs-muted" dir="auto">
              {pendingReplaceFile.name}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-crs-border px-3 py-2 text-sm"
                disabled={pending}
                onClick={() => setPendingReplaceFile(null)}
              >
                {t("mediaCancel", lang)}
              </button>
              <button
                type="button"
                className="rounded-xl bg-crs-primary px-3 py-2 text-sm text-white disabled:opacity-60"
                disabled={pending}
                onClick={() => {
                  const next = pendingReplaceFile;
                  setPendingReplaceFile(null);
                  void postFile(next);
                }}
              >
                {pending ? t("uploading", lang) : t("mediaReplaceConfirm", lang)}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <MediaLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      {cropOpen && previewSrc ? (
        <ImageCropModal
          src={previewSrc}
          onCancel={() => setCropOpen(false)}
          onApply={(crop) => {
            const imgEl = new Image();
            imgEl.onload = () => {
              void variantsFromCrop(imgEl, crop)
                .then(({ master }) => {
                  setCropOpen(false);
                  return postFile(master);
                })
                .catch((err) => {
                  const msg = err instanceof Error ? err.message : t("actionFailed", lang);
                  setError(msg);
                  cmsToast.error(msg);
                });
            };
            imgEl.src = previewSrc;
          }}
        />
      ) : null}
    </div>
  );
}
