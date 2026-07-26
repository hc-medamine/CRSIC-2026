"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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

type MediaRef = {
  contentItemId: string;
  contentType: string;
  titleAr: string;
  status: string;
  source: string;
  revisionId?: string;
  revisionNumber?: number;
  dashboardPath: string;
};

type Props = {
  initialItems: Item[];
  allowedBuckets: MediaBucket[];
};

const BUCKET_LABELS: Record<MediaBucket, string> = {
  news: "news → img/cms/news/",
  events: "events → img/cms/events/",
  covers: "covers → img/cms/covers/",
  partners: "partners → img/cms/partners/",
  research: "research → img/cms/research/",
  alerts: "alerts → img/cms/alerts/",
};

function sourceLabel(ref: MediaRef): string {
  if (ref.source === "revision") {
    return ref.revisionNumber != null ? `Revision #${ref.revisionNumber}` : "Revision";
  }
  if (ref.source === "live_payload") return "Live public copy";
  if (ref.source === "attachments") return "Attachments";
  if (ref.source === "og_image") return "OG image";
  if (ref.source === "image_path") return "Primary image";
  return ref.source;
}

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
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [blockedRefs, setBlockedRefs] = useState<MediaRef[] | null>(null);
  const [blockedPath, setBlockedPath] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete(item: Item) {
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/media/${item.id}`, { method: "DELETE" });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        code?: string;
        publicPath?: string;
        references?: MediaRef[];
      };
      if (res.status === 409 && data.code === "MEDIA_IN_USE") {
        setBlockedPath(data.publicPath ?? item.publicPath);
        setBlockedRefs(data.references ?? []);
        setPendingDeleteId(null);
        return;
      }
      if (!res.ok || !data.ok) {
        setDeleteError(data.error || "Delete failed");
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      if (lastId === item.id) {
        setLastId(null);
        setLastPath("");
      }
      setPendingDeleteId(null);
    } catch {
      setDeleteError("Network error");
    } finally {
      setDeleting(false);
    }
  }

  if (allowedBuckets.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-crs-border p-6 text-sm text-crs-muted">
        No media buckets in your content scopes.
      </p>
    );
  }

  const pendingItem = pendingDeleteId
    ? items.find((i) => i.id === pendingDeleteId) ?? null
    : null;

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

      {deleteError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {deleteError}
        </p>
      ) : null}

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
                <div className="flex flex-wrap gap-3">
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
                  <button
                    type="button"
                    className="text-start text-xs text-red-700 underline"
                    onClick={() => {
                      setDeleteError("");
                      setPendingDeleteId(item.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {pendingItem ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="media-delete-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-crs-border bg-crs-surface p-5 shadow-lg">
            <h2 id="media-delete-title" className="text-base font-semibold text-crs-ink">
              Delete this media?
            </h2>
            <p className="mt-2 text-sm text-crs-muted">
              <span className="font-medium text-crs-ink">{pendingItem.originalFilename}</span>
              <br />
              <code className="break-all text-[11px]">{pendingItem.publicPath}</code>
            </p>
            <p className="mt-2 text-sm text-crs-muted">This cannot be undone.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-crs-border px-3 py-2 text-sm"
                disabled={deleting}
                onClick={() => setPendingDeleteId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-xl bg-red-700 px-3 py-2 text-sm text-white disabled:opacity-60"
                disabled={deleting}
                onClick={() => void confirmDelete(pendingItem)}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {blockedRefs ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="media-blocked-title"
        >
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-crs-border bg-crs-surface p-5 shadow-lg">
            <h2 id="media-blocked-title" className="text-base font-semibold text-crs-ink">
              Cannot delete — still in use
            </h2>
            <p className="mt-2 break-all text-xs text-crs-muted">
              <code>{blockedPath}</code>
            </p>
            <ul className="mt-4 flex flex-col gap-2">
              {blockedRefs.map((ref) => (
                <li
                  key={`${ref.contentItemId}-${ref.source}-${ref.revisionId ?? ""}`}
                  className="rounded-xl border border-crs-border px-3 py-2 text-sm"
                >
                  <Link
                    href={ref.dashboardPath}
                    className="font-medium text-crs-primary underline"
                  >
                    {ref.titleAr || ref.contentItemId}
                  </Link>
                  <p className="text-xs text-crs-muted">
                    {ref.contentType} · {ref.status} · {sourceLabel(ref)}
                  </p>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="rounded-xl border border-crs-border px-3 py-2 text-sm"
                onClick={() => {
                  setBlockedRefs(null);
                  setBlockedPath("");
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <MediaLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
