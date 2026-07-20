export type PublicMediaItem = {
  kind: "image" | "pdf";
  src: string;
  alt?: string;
};

export function normalizeAttachments(raw: unknown): PublicMediaItem[] {
  if (!Array.isArray(raw)) return [];
  const out: PublicMediaItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const kind = e.kind === "pdf" ? "pdf" : e.kind === "image" ? "image" : null;
    const src = typeof e.src === "string" ? e.src.trim() : "";
    if (!kind || !src) continue;
    const item: PublicMediaItem = { kind, src };
    if (typeof e.alt === "string" && e.alt.trim()) item.alt = e.alt.trim();
    out.push(item);
  }
  return out;
}

/** Prefer attachments; else fall back to a single primary image path. */
export function buildMediaList(
  attachments: unknown,
  imagePath: string | null | undefined,
  imageAlt?: string | null,
): PublicMediaItem[] {
  const fromAttachments = normalizeAttachments(attachments);
  if (fromAttachments.length > 0) return fromAttachments;
  const path = imagePath?.trim();
  if (!path) return [];
  const item: PublicMediaItem = { kind: "image", src: path };
  if (imageAlt?.trim()) item.alt = imageAlt.trim();
  return [item];
}

export function primaryImageSrc(media: PublicMediaItem[]): string | null {
  const img = media.find((m) => m.kind === "image");
  return img?.src ?? null;
}
