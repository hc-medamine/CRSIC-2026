export const FEATURED_NEWS_MAX = 10;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(id: string): boolean {
  return UUID_RE.test(id);
}

/**
 * Refuse an 11th item (no silent drop). Dedupes while keeping first-seen order.
 */
export function sanitizePlaylistIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    throw new Error("Playlist must be an array of news ids");
  }
  if (raw.length > FEATURED_NEWS_MAX) {
    throw new Error("Playlist cannot exceed 10 news items");
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const id = String(item || "").trim().toLowerCase();
    if (!id) continue;
    if (!UUID_RE.test(id)) {
      throw new Error("Invalid news id in playlist");
    }
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function isUsingFallback(
  row: { published_at: Date | string | null } | null,
  livePublicCount: number,
): boolean {
  if (!row?.published_at) return true;
  return livePublicCount === 0;
}
