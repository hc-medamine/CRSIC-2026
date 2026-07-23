"use client";

import { useEffect, useRef, useState } from "react";
import { META_DESCRIPTION_MAX, META_TITLE_MAX } from "@/lib/content/seo";
import type { MediaBucket } from "@/lib/media/config";

export type SeoFormState = {
  metaTitleAr: string;
  metaTitleEn: string;
  metaDescriptionAr: string;
  metaDescriptionEn: string;
  ogImage: string;
};

export const emptySeoFormState = (): SeoFormState => ({
  metaTitleAr: "",
  metaTitleEn: "",
  metaDescriptionAr: "",
  metaDescriptionEn: "",
  ogImage: "",
});

type Props = {
  value: SeoFormState;
  onChange: (next: SeoFormState) => void;
  disabled?: boolean;
  ogFallbackHint?: string;
  /**
   * Related CMS media folder for Browse (news → img/cms/news, etc.).
   * When omitted (e.g. partners/alerts), Browse is hidden — no related image bucket.
   */
  ogBucket?: MediaBucket;
  /** Optional: fill meta title AR from display title. */
  onCopyTitleAr?: () => void;
  /** Optional: fill meta description AR from summary. */
  onCopySummaryAr?: () => void;
};

type CmsImageItem = {
  id: string;
  bucket: string;
  originalFilename: string;
  mimeType: string;
  publicPath: string;
};

function Counter({ value, max }: { value: string; max: number }) {
  const n = value.trim().length;
  const over = n > max;
  return (
    <span className={over ? "text-xs text-red-700" : "text-xs text-crs-muted"}>
      {n}/{max}
    </span>
  );
}

export function SeoFieldsSection({
  value,
  onChange,
  disabled,
  ogFallbackHint,
  ogBucket,
  onCopyTitleAr,
  onCopySummaryAr,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<CmsImageItem[]>([]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const canBrowse = Boolean(ogBucket);

  function set<K extends keyof SeoFormState>(key: K, v: string) {
    onChange({ ...value, [key]: v });
  }

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (pickerOpen && !el.open) el.showModal();
    if (!pickerOpen && el.open) el.close();
  }, [pickerOpen]);

  async function loadImages(bucket: MediaBucket) {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ imagesOnly: "1", bucket });
      const res = await fetch(`/api/media?${qs.toString()}`);
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        items?: CmsImageItem[];
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not list images");
        setItems([]);
        return;
      }
      setItems(data.items ?? []);
    } catch {
      setError("Could not list images");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  function openPicker() {
    if (disabled || !ogBucket) return;
    setPickerOpen(true);
    void loadImages(ogBucket);
  }

  function pick(path: string) {
    set("ogImage", path);
    setPickerOpen(false);
  }

  return (
    <fieldset className="grid gap-3 rounded border border-crs-border bg-crs-bg/80 p-3">
      <legend className="px-1 text-sm font-semibold text-crs-ink">SEO / share</legend>
      <p className="text-xs text-crs-muted">
        Optional. Empty fields fall back to title / summary / primary image on the public site. Max{" "}
        {META_TITLE_MAX} (title) / {META_DESCRIPTION_MAX} (description).
      </p>
      {(onCopyTitleAr || onCopySummaryAr) && !disabled ? (
        <div className="flex flex-wrap gap-2 text-xs">
          {onCopyTitleAr ? (
            <button type="button" className="underline" onClick={onCopyTitleAr}>
              Copy meta title from AR title
            </button>
          ) : null}
          {onCopySummaryAr ? (
            <button type="button" className="underline" onClick={onCopySummaryAr}>
              Copy meta description from AR summary
            </button>
          ) : null}
        </div>
      ) : null}

      <label className="text-sm">
        <span className="flex items-center justify-between font-medium">
          Meta title (AR)
          <Counter value={value.metaTitleAr} max={META_TITLE_MAX} />
        </span>
        <input
          disabled={disabled}
          value={value.metaTitleAr}
          maxLength={META_TITLE_MAX + 20}
          onChange={(e) => set("metaTitleAr", e.target.value)}
          className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
        />
      </label>
      <label className="text-sm">
        <span className="flex items-center justify-between font-medium">
          Meta title (EN)
          <Counter value={value.metaTitleEn} max={META_TITLE_MAX} />
        </span>
        <input
          disabled={disabled}
          value={value.metaTitleEn}
          maxLength={META_TITLE_MAX + 20}
          onChange={(e) => set("metaTitleEn", e.target.value)}
          className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
        />
      </label>
      <label className="text-sm">
        <span className="flex items-center justify-between font-medium">
          Meta description (AR)
          <Counter value={value.metaDescriptionAr} max={META_DESCRIPTION_MAX} />
        </span>
        <textarea
          disabled={disabled}
          value={value.metaDescriptionAr}
          rows={2}
          maxLength={META_DESCRIPTION_MAX + 40}
          onChange={(e) => set("metaDescriptionAr", e.target.value)}
          className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
        />
      </label>
      <label className="text-sm">
        <span className="flex items-center justify-between font-medium">
          Meta description (EN)
          <Counter value={value.metaDescriptionEn} max={META_DESCRIPTION_MAX} />
        </span>
        <textarea
          disabled={disabled}
          value={value.metaDescriptionEn}
          rows={2}
          maxLength={META_DESCRIPTION_MAX + 40}
          onChange={(e) => set("metaDescriptionEn", e.target.value)}
          className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
        />
      </label>
      <div className="text-sm">
        <span className="font-medium">OG image path</span>
        <div className="mt-1 flex flex-wrap gap-2">
          <input
            disabled={disabled}
            value={value.ogImage}
            onChange={(e) => set("ogImage", e.target.value)}
            placeholder={ogFallbackHint || "img/cms/..."}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 font-mono text-xs text-crs-ink"
          />
          {canBrowse ? (
            <button
              type="button"
              disabled={disabled}
              onClick={openPicker}
              className="rounded border border-crs-border bg-white px-3 py-2 text-xs font-medium text-crs-ink hover:bg-crs-bg disabled:opacity-50"
            >
              Browse…
            </button>
          ) : null}
          {value.ogImage && !disabled ? (
            <button
              type="button"
              onClick={() => set("ogImage", "")}
              className="rounded border border-crs-border bg-white px-3 py-2 text-xs text-crs-muted hover:bg-crs-bg"
            >
              Clear
            </button>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-crs-muted">
          {canBrowse ? (
            <>
              Browse lists images in{" "}
              <code className="text-[11px]">img/cms/{ogBucket}/</code> that you can access
              (editors: your uploads; reviewers/SA: all in this folder).
            </>
          ) : (
            <>Type a path under <code className="text-[11px]">img/cms/</code>, or leave empty for fallback.</>
          )}
        </p>
      </div>

      {canBrowse ? (
        <dialog
          ref={dialogRef}
          className="w-[min(36rem,calc(100vw-2rem))] max-h-[80vh] rounded-lg border border-crs-border bg-white p-0 shadow-xl backdrop:bg-black/40"
          onClose={() => setPickerOpen(false)}
        >
          <div className="flex items-center justify-between border-b border-crs-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-crs-ink">Select OG image</p>
              <p className="font-mono text-xs text-crs-muted">img/cms/{ogBucket}/</p>
            </div>
            <button
              type="button"
              className="text-sm underline"
              onClick={() => setPickerOpen(false)}
            >
              Close
            </button>
          </div>
          <div className="max-h-[50vh] overflow-y-auto p-3">
            {loading ? <p className="text-sm text-crs-muted">Loading…</p> : null}
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {!loading && !error && items.length === 0 ? (
              <p className="text-sm text-crs-muted">
                No accessible images in this folder yet. Upload via the related image field first.
              </p>
            ) : null}
            <ul className="grid gap-2">
              {items.map((item) => {
                const selected = value.ogImage === item.publicPath;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => pick(item.publicPath)}
                      className={`flex w-full items-center gap-3 rounded border px-2 py-2 text-left hover:bg-crs-bg ${
                        selected ? "border-crs-primary bg-crs-primary/10" : "border-crs-border"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/${item.publicPath}`}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded object-cover bg-crs-bg"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {item.originalFilename}
                        </span>
                        <span className="block truncate font-mono text-[11px] text-crs-muted">
                          {item.publicPath}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </dialog>
      ) : null}
    </fieldset>
  );
}

export function copyMetaTitleFrom(titleAr: string, current: SeoFormState): SeoFormState {
  if (!titleAr.trim()) return current;
  return { ...current, metaTitleAr: titleAr.trim().slice(0, META_TITLE_MAX) };
}

export function copyMetaDescriptionFrom(summaryAr: string, current: SeoFormState): SeoFormState {
  if (!summaryAr.trim()) return current;
  return {
    ...current,
    metaDescriptionAr: summaryAr.trim().slice(0, META_DESCRIPTION_MAX),
  };
}
