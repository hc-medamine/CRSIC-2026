import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { query } from "@/lib/db";
import {
  buildMediaList,
  primaryImageSrc,
  type PublicMediaItem,
} from "@/lib/publish/media";
import { slugifyTitle, uniqueSlug } from "@/lib/publish/slug";

export type PublicNewsItem = {
  id: string;
  slug: string;
  img: string | null;
  label: string;
  title: string;
  summary: string;
  body: string;
  media: PublicMediaItem[];
};

type PayloadSource = {
  id: string;
  title_ar: string;
  label_ar: string | null;
  summary_ar: string | null;
  body_ar: string | null;
  image_path: string | null;
  image_alt_ar: string | null;
  public_slug: string | null;
  attachments?: unknown;
};

/** Public object for a news row (persisted to content_items.live_payload). */
export function buildNewsPayload(row: PayloadSource, usedSlugs?: Set<string>): PublicNewsItem {
  const media = buildMediaList(row.attachments, row.image_path, row.image_alt_ar);
  const base = row.public_slug?.trim() || slugifyTitle(row.title_ar);
  const slug = usedSlugs ? uniqueSlug(base, usedSlugs) : base;
  if (usedSlugs) usedSlugs.add(slug);
  return {
    id: row.id,
    slug,
    img: primaryImageSrc(media) ?? row.image_path ?? null,
    label: row.label_ar?.trim() || "خبر",
    title: row.title_ar.trim(),
    summary: row.summary_ar?.trim() || "",
    body: row.body_ar?.trim() || "",
    media,
  };
}

function publicNewsPath(): string {
  return join(process.cwd(), "..", "data", "news.json");
}

/**
 * Emits every row whose live_payload is set (published, or under revision with the public
 * copy still live), NOT just status = 'published'.
 */
export async function rebuildPublicNewsJson(): Promise<{ count: number; path: string }> {
  const result = await query<{ live_payload: PublicNewsItem }>(
    `SELECT live_payload
     FROM content_items
     WHERE content_type = 'news' AND live_payload IS NOT NULL
     ORDER BY live_at DESC NULLS LAST, created_at ASC`,
  );

  const news: PublicNewsItem[] = result.rows.map((row) => {
    const p = row.live_payload;
    const media = buildMediaList(p.media, p.img, undefined);
    return {
      id: p.id || `legacy-news-${p.slug || slugifyTitle(p.title || "item")}`,
      slug: p.slug || slugifyTitle(p.title || "item"),
      img: primaryImageSrc(media) ?? p.img ?? null,
      label: p.label?.trim() || "خبر",
      title: (p.title ?? "").trim(),
      summary: p.summary?.trim() || "",
      body: p.body?.trim() || "",
      media,
    };
  });

  const path = publicNewsPath();
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  if (existsSync(path)) {
    writeFileSync(`${path}.bak`, readFileSync(path));
  }

  const payload = JSON.stringify({ news }, null, 4);
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, payload, "utf8");
  renameSync(tmp, path);

  const check = JSON.parse(readFileSync(path, "utf8")) as { news: PublicNewsItem[] };
  if (!Array.isArray(check.news)) {
    throw new Error("Published news.json invalid after write");
  }

  return { count: check.news.length, path };
}
