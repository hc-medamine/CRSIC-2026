/**
 * CMS-authenticated URL for a repo-relative public media path under `img/…`.
 * Next cannot serve the parent SPA `img/` tree; files are streamed via /api/media/file.
 * Supports CMS uploads (`img/cms/…`) and legacy public assets (`img/covers/…`, etc.).
 */
export function cmsMediaSrc(publicPath: string | null | undefined): string | null {
  const raw = (publicPath ?? "").trim().replace(/^\/+/, "");
  if (!raw || !raw.startsWith("img/")) return null;
  if (raw.includes("..") || raw.includes("\\")) return null;
  return `/api/media/file?path=${encodeURIComponent(raw)}`;
}

export function isPdfPath(publicPath: string): boolean {
  return publicPath.toLowerCase().endsWith(".pdf");
}
