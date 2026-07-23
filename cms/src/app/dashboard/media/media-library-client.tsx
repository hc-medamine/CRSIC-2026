"use client";

import { useMemo, useState } from "react";
import { MediaUploadField } from "@/app/dashboard/media-upload-field";
import { MediaLightbox } from "@/app/dashboard/media-lightbox";
import { cmsMediaSrc, isPdfPath } from "@/lib/media/cms-src";
import type { MediaBucket } from "@/lib/media/config";

type Item = {
  id: string;
  bucket: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  publicPath: string;
  createdAt: string;
};

type Props = {
  initialItems: Item[];
  allowedBuckets: MediaBucket[];
};

const BUCKET_LABELS: Record<MediaBucket, string> = {
  news: "news → img/cms/news/",
  events: "events → img/cms/events/",
  covers: "covers → img/cms/covers/",
};

export function MediaLibraryClient({ initialItems, allowedBuckets }: Props) {
  const buckets = useMemo(
    () => (allowedBuckets.length > 0 ? allowedBuckets : (["news"] as MediaBucket[])),
    [allowedBuckets],
  );
  const [bucket, setBucket] = useState<MediaBucket>(buckets[0]!);
  const [items, setItems] = useState(initialItems);
  const [lastPath, setLastPath] = useState("");
  const [lastId, setLastId] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  if (allowedBuckets.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-crs-border p-6 text-sm text-crs-muted">
        No media buckets in your content scopes.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 rounded-2xl border border-crs-border bg-crs-surface p-4 shadow-sm">
        <label className="text-sm">
          <span className="font-medium">Bucket</span>
          <select
            value={bucket}
            onChange={(e) => {
              setBucket(e.target.value as MediaBucket);
              setLastId(null);
              setLastPath("");
            }}
            className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
          >
            {buckets.map((b) => (
              <option key={b} value={b}>
                {BUCKET_LABELS[b]}
              </option>
            ))}
          </select>
        </label>
        <MediaUploadField
          bucket={bucket}
          publicPath={lastPath}
          mediaId={lastId}
          imagesOnly={false}
          label="Upload image or PDF"
          onUploaded={({ publicPath, mediaId }) => {
            setLastPath(publicPath);
            setLastId(mediaId);
            setItems((prev) => [
              {
                id: mediaId,
                bucket,
                originalFilename: publicPath.split("/").pop() ?? publicPath,
                mimeType: publicPath.endsWith(".pdf") ? "application/pdf" : "image/*",
                byteSize: 0,
                publicPath,
                createdAt: new Date().toISOString(),
              },
              ...prev.filter((i) => i.id !== mediaId),
            ]);
          }}
        />
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-crs-border p-6 text-sm text-crs-muted">
          No uploads yet.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const src = cmsMediaSrc(item.publicPath);
            const pdf = item.mimeType.includes("pdf") || isPdfPath(item.publicPath);
            return (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded-2xl border border-crs-border bg-crs-surface p-3 shadow-sm"
              >
                {pdf || !src ? (
                  <div className="flex h-36 items-center justify-center rounded-xl bg-crs-bg text-sm font-semibold uppercase text-crs-muted">
                    PDF
                  </div>
                ) : (
                  <button
                    type="button"
                    className="overflow-hidden rounded-xl ring-1 ring-crs-border"
                    onClick={() => setLightboxSrc(src)}
                    aria-label={`Preview ${item.originalFilename}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={item.originalFilename}
                      className="h-36 w-full object-cover"
                    />
                  </button>
                )}
                <p className="truncate text-sm font-medium text-crs-ink">{item.originalFilename}</p>
                <p className="break-all text-[11px] text-crs-muted">
                  {item.bucket} · <code>{item.publicPath}</code>
                </p>
                <button
                  type="button"
                  className="text-start text-xs text-crs-primary underline"
                  onClick={() => {
                    setBucket(item.bucket as MediaBucket);
                    setLastId(item.id);
                    setLastPath(item.publicPath);
                  }}
                >
                  Select to replace (same URL)
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <MediaLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
