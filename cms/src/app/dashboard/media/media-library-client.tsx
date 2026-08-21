"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MediaUploadField } from "@/app/dashboard/media-upload-field";
import { MediaLightbox } from "@/app/dashboard/media-lightbox";
import { cmsMediaSrc, isPdfPath } from "@/lib/media/cms-src";
import type { MediaBucket } from "@/lib/media/config";
import { formatDateTime } from "@/lib/format-datetime";
import { t, tf, contentTypeLabel } from "@/lib/i18n/labels";
import { useCmsLang } from "@/lib/i18n/cms-lang";
import { DeskEmptyState, HonestyCount } from "@/app/dashboard/desk-ui";

export type MediaLibraryItem = {
  id: string;
  bucket: string;
  mimeType: string;
  publicPath: string;
  updatedAt: string;
  uploaderNameAr: string | null;
  uploaderNameEn: string | null;
  linkedTitleAr: string | null;
  linkedHref: string | null;
  linkedContentType: string | null;
  linkedCount: number;
  canManage: boolean;
  liveOnPublic: boolean;
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
  initialItems: MediaLibraryItem[];
  allowedBuckets: MediaBucket[];
  fetchLimit: number;
};

type FolderFilter = "all" | MediaBucket;

const BUCKET_LABEL_KEYS: Record<MediaBucket, string> = {
  news: "mediaBucketNews",
  events: "mediaBucketEvents",
  covers: "mediaBucketCovers",
  partners: "mediaBucketPartners",
  research: "mediaBucketResearch",
  alerts: "mediaBucketAlerts",
  laws: "mediaBucketLaws",
  platforms: "mediaBucketPlatforms",
  site: "mediaBucketSite",
};

function sourceLabel(ref: MediaRef, lang: "en" | "ar"): string {
  if (ref.source === "revision") {
    return ref.revisionNumber != null
      ? tf("sourceRevisionN", lang, { n: ref.revisionNumber })
      : t("sourceRevision", lang);
  }
  if (ref.source === "live_payload") return t("sourceLiveCopy", lang);
  if (ref.source === "attachments") return t("sourceAttachments", lang);
  if (ref.source === "og_image") return t("sourceOgImage", lang);
  if (ref.source === "image_path") return t("sourcePrimaryImage", lang);
  return ref.source;
}

export function MediaLibraryClient({ initialItems, allowedBuckets, fetchLimit }: Props) {
  const lang = useCmsLang();
  const buckets = useMemo(
    () => (allowedBuckets.length > 0 ? allowedBuckets : (["news"] as MediaBucket[])),
    [allowedBuckets],
  );
  const [filter, setFilter] = useState<FolderFilter>("all");
  const [uploadBucket, setUploadBucket] = useState<MediaBucket>(buckets[0]!);
  const [items, setItems] = useState(initialItems);
  const [lastPath, setLastPath] = useState("");
  const [lastId, setLastId] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [blockedRefs, setBlockedRefs] = useState<MediaRef[] | null>(null);
  const [blockedTitle, setBlockedTitle] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete(item: MediaLibraryItem) {
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
        setBlockedTitle(item.linkedTitleAr || t("mediaUnused", lang));
        setBlockedRefs(data.references ?? []);
        setPendingDeleteId(null);
        return;
      }
      if (!res.ok || !data.ok) {
        setDeleteError(data.error || t("mediaDeleteFailed", lang));
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      if (lastId === item.id) {
        setLastId(null);
        setLastPath("");
      }
      setPendingDeleteId(null);
    } catch {
      setDeleteError(t("loginNetworkError", lang));
    } finally {
      setDeleting(false);
    }
  }

  if (allowedBuckets.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-crs-border p-6 text-sm text-crs-muted">
        {t("mediaNoBuckets", lang)}
      </p>
    );
  }

  const pendingItem = pendingDeleteId
    ? items.find((i) => i.id === pendingDeleteId) ?? null
    : null;

  const selectedItem = lastId ? items.find((i) => i.id === lastId) ?? null : null;
  const liveReplaceConfirm = Boolean(selectedItem?.liveOnPublic);

  const visibleItems =
    filter === "all" ? items : items.filter((item) => item.bucket === filter);

  function selectFolder(next: FolderFilter) {
    setFilter(next);
    setLastId(null);
    setLastPath("");
    if (next !== "all") setUploadBucket(next);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 rounded-2xl border border-crs-border bg-crs-surface p-5 shadow-[var(--crs-shadow-soft)]">
        <label className="text-sm">
          <span className="font-medium">{t("fieldBucket", lang)}</span>
          <select
            value={filter}
            onChange={(e) => selectFolder(e.target.value as FolderFilter)}
            className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
          >
            <option value="all">{t("mediaBucketAll", lang)}</option>
            {buckets.map((b) => (
              <option key={b} value={b}>
                {t(BUCKET_LABEL_KEYS[b], lang)}
              </option>
            ))}
          </select>
        </label>
        {filter === "all" ? (
          <label className="text-sm">
            <span className="font-medium">{t("mediaUploadTo", lang)}</span>
            <select
              value={uploadBucket}
              onChange={(e) => {
                setUploadBucket(e.target.value as MediaBucket);
                setLastId(null);
                setLastPath("");
              }}
              className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
            >
              {buckets.map((b) => (
                <option key={b} value={b}>
                  {t(BUCKET_LABEL_KEYS[b], lang)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-crs-muted">{t("mediaSelectFolderToUpload", lang)}</p>
          </label>
        ) : null}
        {liveReplaceConfirm ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {t("mediaLiveReplaceHint", lang)}
          </p>
        ) : null}
        <MediaUploadField
          bucket={uploadBucket}
          publicPath={lastPath}
          mediaId={lastId}
          imagesOnly={false}
          label={t("uploadImageOrPdf", lang)}
          liveReplaceConfirm={liveReplaceConfirm}
          onUploaded={({ publicPath, mediaId }) => {
            setLastPath(publicPath);
            setLastId(mediaId);
            setItems((prev) => {
              const prevItem = prev.find((i) => i.id === mediaId);
              return [
                {
                  id: mediaId,
                  bucket: uploadBucket,
                  mimeType: publicPath.endsWith(".pdf") ? "application/pdf" : "image/*",
                  publicPath,
                  updatedAt: new Date().toISOString(),
                  uploaderNameAr: prevItem?.uploaderNameAr ?? null,
                  uploaderNameEn: prevItem?.uploaderNameEn ?? null,
                  linkedTitleAr: prevItem?.linkedTitleAr ?? null,
                  linkedHref: prevItem?.linkedHref ?? null,
                  linkedContentType: prevItem?.linkedContentType ?? null,
                  linkedCount: prevItem?.linkedCount ?? 0,
                  canManage: true,
                  liveOnPublic: prevItem?.liveOnPublic ?? false,
                },
                ...prev.filter((i) => i.id !== mediaId),
              ];
            });
          }}
        />
      </div>

      {deleteError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {deleteError}
        </p>
      ) : null}

      {visibleItems.length === 0 ? (
        <DeskEmptyState>
          <p className="text-sm text-crs-muted">{t("mediaEmpty", lang)}</p>
        </DeskEmptyState>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-crs-border bg-crs-surface shadow-[var(--crs-shadow-soft)]">
        <ul className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleItems.map((item) => {
            const src = cmsMediaSrc(item.publicPath);
            const pdf = item.mimeType.includes("pdf") || isPdfPath(item.publicPath);
            const title = item.linkedTitleAr || t("mediaUnused", lang);
            const typeLabel = contentTypeLabel(item.linkedContentType, lang);
            const uploader =
              (lang === "ar"
                ? item.uploaderNameAr || item.uploaderNameEn
                : item.uploaderNameEn || item.uploaderNameAr) || "—";
            return (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded-2xl border border-crs-border bg-crs-bg/40 p-3"
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
                    aria-label={t("mediaPreview", lang)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-36 w-full object-cover" />
                  </button>
                )}
                <div className="min-w-0">
                  {item.linkedHref ? (
                    <Link
                      href={item.linkedHref}
                      className="line-clamp-2 text-sm font-medium text-crs-ink hover:text-crs-primary hover:underline"
                      dir="auto"
                    >
                      {title}
                    </Link>
                  ) : (
                    <p className="line-clamp-2 text-sm font-medium text-crs-muted" dir="auto">
                      {title}
                    </p>
                  )}
                  {typeLabel ? (
                    <p className="mt-0.5 text-xs text-crs-muted">{typeLabel}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-crs-muted">
                    {t("mediaUpdated", lang)}: {formatDateTime(item.updatedAt)}
                  </p>
                  <p className="text-xs text-crs-muted" dir="auto">
                    {t("mediaBy", lang)}: {uploader}
                  </p>
                  {item.liveOnPublic ? (
                    <p className="mt-0.5 text-xs font-medium text-amber-800">
                      {t("mediaOnPublicSite", lang)}
                    </p>
                  ) : null}
                  {item.linkedCount > 1 ? (
                    <p className="mt-0.5 text-xs text-crs-muted">
                      {tf("mediaAlsoUsed", lang, { n: item.linkedCount - 1 })}
                    </p>
                  ) : null}
                </div>
                {item.canManage ? (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="text-start text-xs text-crs-primary underline"
                    onClick={() => {
                      const b = item.bucket as MediaBucket;
                      setFilter(b);
                      setUploadBucket(b);
                      setLastId(item.id);
                      setLastPath(item.publicPath);
                    }}
                  >
                    {t("mediaSelectReplace", lang)}
                  </button>
                  <button
                    type="button"
                    className="text-start text-xs text-red-700 underline"
                    onClick={() => {
                      setDeleteError("");
                      setPendingDeleteId(item.id);
                    }}
                  >
                    {t("mediaDelete", lang)}
                  </button>
                </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        <HonestyCount
          count={visibleItems.length}
          loadedCount={items.length}
          fetchLimit={fetchLimit}
        />
        </div>
      )}

      {pendingItem ? (
        <div
          className="cms-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="media-delete-title"
        >
          <div className="cms-modal-panel w-full max-w-md rounded-2xl border border-crs-border bg-crs-surface p-5 shadow-lg">
            <h2 id="media-delete-title" className="text-base font-semibold text-crs-ink">
              {t("mediaDeleteTitle", lang)}
            </h2>
            <p className="mt-2 text-sm text-crs-muted" dir="auto">
              {tf("mediaDeleteLinked", lang, {
                title: pendingItem.linkedTitleAr || t("mediaUnused", lang),
              })}
            </p>
            <p className="mt-2 text-sm text-crs-muted">{t("mediaCannotUndo", lang)}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-crs-border px-3 py-2 text-sm"
                disabled={deleting}
                onClick={() => setPendingDeleteId(null)}
              >
                {t("mediaCancel", lang)}
              </button>
              <button
                type="button"
                className="rounded-xl bg-red-700 px-3 py-2 text-sm text-white disabled:opacity-60"
                disabled={deleting}
                onClick={() => void confirmDelete(pendingItem)}
              >
                {deleting ? t("mediaDeleting", lang) : t("mediaDelete", lang)}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {blockedRefs ? (
        <div
          className="cms-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="media-blocked-title"
        >
          <div className="cms-modal-panel max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-crs-border bg-crs-surface p-5 shadow-lg">
            <h2 id="media-blocked-title" className="text-base font-semibold text-crs-ink">
              {t("mediaBlockedTitle", lang)}
            </h2>
            <p className="mt-2 text-sm text-crs-muted" dir="auto">
              {blockedTitle}
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
                    dir="auto"
                  >
                    {ref.titleAr || ref.contentItemId}
                  </Link>
                  <p className="text-xs text-crs-muted">
                    {contentTypeLabel(ref.contentType, lang)} · {ref.status} ·{" "}
                    {sourceLabel(ref, lang)}
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
                  setBlockedTitle("");
                }}
              >
                {t("mediaClose", lang)}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <MediaLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
