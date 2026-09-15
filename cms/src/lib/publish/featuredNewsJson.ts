import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type { FeaturedPlaylistEntry } from "@/lib/content/featuredNewsIds";
import { FEATURED_NEWS_MAX } from "@/lib/content/featuredNewsIds";

export const FEATURED_NEWS_JSON_MAX = FEATURED_NEWS_MAX;

export type PublicFeaturedItem = {
  type: "news" | "event";
  id: string;
};

export type PublicFeaturedNews = {
  /** Typed playlist (preferred). */
  items: PublicFeaturedItem[];
  /** Legacy news-only ids — kept for older SPA caches; same order as news items. */
  ids: string[];
};

function publicFeaturedNewsPath(): string {
  return join(process.cwd(), "..", "data", "featured-news.json");
}

/**
 * Public ids may be legacy slugs / non-UUID payload ids — do not run CMS UUID sanitize here.
 */
function normalizePublicEntries(
  entries: FeaturedPlaylistEntry[] | string[] | PublicFeaturedItem[],
): PublicFeaturedItem[] {
  const list = Array.isArray(entries) ? entries : [];
  const out: PublicFeaturedItem[] = [];
  const seen = new Set<string>();
  for (const raw of list) {
    let type: "news" | "event" = "news";
    let id = "";
    if (typeof raw === "string") {
      id = String(raw || "").trim();
    } else if (raw && typeof raw === "object") {
      const t = String((raw as { type?: unknown }).type || "news").trim().toLowerCase();
      type = t === "event" ? "event" : "news";
      id = String((raw as { id?: unknown }).id || "").trim();
    }
    if (!id) continue;
    const key = `${type}:${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ type, id });
    if (out.length >= FEATURED_NEWS_JSON_MAX) break;
  }
  return out;
}

export function writePublicFeaturedNewsJson(
  entries: FeaturedPlaylistEntry[] | string[] | PublicFeaturedItem[],
): { path: string; count: number } {
  const items = normalizePublicEntries(entries);
  const ids = items.filter((i) => i.type === "news").map((i) => i.id);
  const payload: PublicFeaturedNews = { items, ids };
  const path = publicFeaturedNewsPath();
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (existsSync(path)) writeFileSync(`${path}.bak`, readFileSync(path));
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(payload, null, 4)}\n`, "utf8");
  renameSync(tmp, path);
  return { path, count: items.length };
}
