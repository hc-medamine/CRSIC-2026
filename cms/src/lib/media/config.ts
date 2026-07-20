export const MEDIA_MAX_BYTES = 5 * 1024 * 1024;

export type MediaBucket = "news" | "events" | "covers";

export const MEDIA_BUCKETS: MediaBucket[] = ["news", "events", "covers"];

/** MIME → canonical extension (allowlist) */
export const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function isMediaBucket(value: string): value is MediaBucket {
  return MEDIA_BUCKETS.includes(value as MediaBucket);
}

export function publicPathFor(bucket: MediaBucket, id: string, extension: string): string {
  const key = id.replace(/-/g, "");
  return `img/cms/${bucket}/${key}.${extension}`;
}
