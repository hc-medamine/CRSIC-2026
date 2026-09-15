export const FEATURED_NEWS_MAX = 10;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type FeaturedContentType = "news" | "event";

export type FeaturedPlaylistEntry = {
  type: FeaturedContentType;
  id: string;
};

export function isUuid(id: string): boolean {
  return UUID_RE.test(id);
}

function entryKey(type: string, id: string): string {
  return `${type}:${id}`;
}

/**
 * Normalize API/DB playlist payloads.
 * Accepts `{ type, id }[]`, legacy bare UUID strings (→ news), or `{ ids: string[] }`.
 * Refuse an 11th item (no silent drop). Dedupes by (type,id).
 */
export function sanitizePlaylistEntries(raw: unknown): FeaturedPlaylistEntry[] {
  let list: unknown[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown }).items)) {
    list = (raw as { items: unknown[] }).items;
  } else if (raw && typeof raw === "object" && Array.isArray((raw as { ids?: unknown }).ids)) {
    list = (raw as { ids: unknown[] }).ids;
  } else {
    throw new Error("Playlist must be an array of items");
  }

  if (list.length > FEATURED_NEWS_MAX) {
    throw new Error("Playlist cannot exceed 10 items");
  }

  const out: FeaturedPlaylistEntry[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    let type: FeaturedContentType = "news";
    let id = "";
    if (typeof item === "string" || typeof item === "number") {
      id = String(item || "").trim().toLowerCase();
    } else if (item && typeof item === "object") {
      const rec = item as { type?: unknown; id?: unknown };
      const t = String(rec.type || "news").trim().toLowerCase();
      if (t !== "news" && t !== "event") {
        throw new Error("Playlist item type must be news or event");
      }
      type = t;
      id = String(rec.id || "").trim().toLowerCase();
    } else {
      continue;
    }
    if (!id) continue;
    if (!UUID_RE.test(id)) {
      throw new Error("Invalid id in playlist");
    }
    const key = entryKey(type, id);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ type, id });
  }
  return out;
}

/** @deprecated Prefer sanitizePlaylistEntries — bare UUID lists mean news. */
export function sanitizePlaylistIds(raw: unknown): string[] {
  return sanitizePlaylistEntries(raw)
    .filter((e) => e.type === "news")
    .map((e) => e.id);
}

export function isUsingFallback(
  row: { published_at: Date | string | null } | null,
  livePublicCount: number,
): boolean {
  if (!row?.published_at) return true;
  return livePublicCount === 0;
}

export function parseItemsColumn(raw: unknown): FeaturedPlaylistEntry[] {
  try {
    return sanitizePlaylistEntries(raw);
  } catch {
    return [];
  }
}

export function newsIdsFromEntries(entries: FeaturedPlaylistEntry[]): string[] {
  return entries.filter((e) => e.type === "news").map((e) => e.id);
}
