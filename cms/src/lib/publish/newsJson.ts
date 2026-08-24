import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { query } from "@/lib/db";
import {
  buildMediaList,
  primaryImageSrc,
  type PublicMediaItem,
} from "@/lib/publish/media";
import { slugifyTitle, uniqueSlug } from "@/lib/publish/slug";
import { seoFromRow, withPublicSeo, type PublicSeoFields } from "@/lib/content/seo";
import { sanitizeBodyHtml } from "@/lib/content/sanitizeBody";
import {
  loadPublicByline,
  PUBLIC_PUBLISHER_AR,
  PUBLIC_PUBLISHER_EN,
  personPublicNames,
  resolveNewsStoryDate,
  resolvePublicPublisher,
  type PublicBylineFields,
} from "@/lib/publish/publicByline";
import { withPublicStoryFields, type StoryEnFields } from "@/lib/publish/storyPublic";

export type PublicNewsItem = {
  id: string;
  slug: string;
  img: string | null;
  label: string;
  title: string;
  summary: string;
  body: string;
  media: PublicMediaItem[];
  date: string;
  editor_ar: string;
  editor_en: string;
  reviewer_ar: string;
  reviewer_en: string;
  publisher_ar: string;
  publisher_en: string;
} & PublicSeoFields &
  StoryEnFields & { img_card?: string };

/** live_payload may keep source flags that public JSON does not emit. */
export type StoredNewsPayload = PublicNewsItem & {
  date_source?: "wp" | "cms";
  source_published_at?: string;
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
  meta_title_ar?: string | null;
  meta_title_en?: string | null;
  meta_description_ar?: string | null;
  meta_description_en?: string | null;
  og_image?: string | null;
  published_at?: Date | string | null;
  live_payload?: Partial<StoredNewsPayload> | null;
  wp_date?: string | null;
  en_status?: string | null;
  title_en?: string | null;
  summary_en?: string | null;
  body_en?: string | null;
  label_en?: string | null;
  image_card_path?: string | null;
} & Partial<PublicBylineFields>;

function bylineFromRow(row: PayloadSource): PublicBylineFields {
  const publisher = resolvePublicPublisher({
    nameAr: row.publisher_ar,
    nameEn: row.publisher_en,
    displayName: row.publisher_ar || row.publisher_en,
    role: "reviewer",
    isActive: true,
  });
  return {
    editor_ar: (row.editor_ar || "").trim(),
    editor_en: (row.editor_en || "").trim(),
    reviewer_ar: (row.reviewer_ar || "").trim(),
    reviewer_en: (row.reviewer_en || "").trim(),
    publisher_ar: publisher.ar,
    publisher_en: publisher.en,
  };
}

function toPublicNews(item: StoredNewsPayload): PublicNewsItem {
  const media = buildMediaList(item.media, item.img, undefined);
  return withPublicStoryFields(
    {
      id: item.id || `legacy-news-${item.slug || slugifyTitle(item.title || "item")}`,
      slug: item.slug || slugifyTitle(item.title || "item"),
      img: primaryImageSrc(media) ?? item.img ?? null,
      label: item.label?.trim() || "خبر",
      title: (item.title ?? "").trim(),
      summary: item.summary?.trim() || "",
      body: item.body?.trim() || "",
      media,
      date: item.date || "",
      editor_ar: item.editor_ar || "",
      editor_en: item.editor_en || "",
      reviewer_ar: item.reviewer_ar || "",
      reviewer_en: item.reviewer_en || "",
      publisher_ar: item.publisher_ar || PUBLIC_PUBLISHER_AR,
      publisher_en: item.publisher_en || PUBLIC_PUBLISHER_EN,
      ...seoFromRow(item),
    },
    item,
  );
}

/** Public object for a news row (persisted to content_items.live_payload). */
export function buildNewsPayload(row: PayloadSource, usedSlugs?: Set<string>): StoredNewsPayload {
  const media = buildMediaList(row.attachments, row.image_path, row.image_alt_ar);
  const base = row.public_slug?.trim() || slugifyTitle(row.title_ar);
  const slug = usedSlugs ? uniqueSlug(base, usedSlugs) : base;
  if (usedSlugs) usedSlugs.add(slug);
  const live = row.live_payload || {};
  const story = resolveNewsStoryDate({
    publishedAt: row.published_at,
    liveDate: live.date,
    liveDateSource: live.date_source,
    liveSourcePublishedAt: live.source_published_at,
    wpDate: row.wp_date,
  });
  const byline = bylineFromRow(row);
  const publicBase = withPublicStoryFields(
    withPublicSeo(
      {
        id: row.id,
        slug,
        img: primaryImageSrc(media) ?? row.image_path ?? null,
        label: row.label_ar?.trim() || "خبر",
        title: row.title_ar.trim(),
        summary: row.summary_ar?.trim() || "",
        body: sanitizeBodyHtml(row.body_ar) || "",
        media,
        date: story.date,
        ...byline,
      },
      row,
    ),
    {
      en_status: row.en_status,
      title_en: row.title_en,
      summary_en: row.summary_en,
      body_en: sanitizeBodyHtml(row.body_en) || null,
      label_en: row.label_en,
      image_card_path: row.image_card_path,
    },
  );
  const stored: StoredNewsPayload = {
    ...publicBase,
    date_source: story.date_source,
  };
  if (story.date_source === "wp" && story.date) stored.source_published_at = story.date;
  else if (live.source_published_at) stored.source_published_at = live.source_published_at;
  return stored;
}

/** Fetch editor/reviewer names, then build the public/live payload. */
export async function buildNewsPayloadForItem(
  row: PayloadSource,
  usedSlugs?: Set<string>,
): Promise<StoredNewsPayload> {
  const byline = row.id ? await loadPublicByline(row.id) : bylineFromRow(row);
  return buildNewsPayload({ ...row, ...byline }, usedSlugs);
}

function publicNewsPath(): string {
  return join(process.cwd(), "..", "data", "news.json");
}

type RebuildRow = {
  live_payload: StoredNewsPayload;
  published_at: Date | null;
  editor_name_ar: string | null;
  editor_name_en: string | null;
  editor_display: string | null;
  reviewer_name_ar: string | null;
  reviewer_name_en: string | null;
  reviewer_display: string | null;
  publisher_name_ar: string | null;
  publisher_name_en: string | null;
  publisher_display: string | null;
  publisher_role: string | null;
  publisher_active: boolean | null;
};

/**
 * Emits every row whose live_payload is set (published, or under revision with the public
 * copy still live), NOT just status = 'published'.
 */
export async function rebuildPublicNewsJson(): Promise<{ count: number; path: string }> {
  const result = await query<RebuildRow>(
    `SELECT c.live_payload, c.published_at,
            e.name_ar AS editor_name_ar, e.name_en AS editor_name_en, e.display_name AS editor_display,
            r.name_ar AS reviewer_name_ar, r.name_en AS reviewer_name_en, r.display_name AS reviewer_display,
            p.name_ar AS publisher_name_ar, p.name_en AS publisher_name_en, p.display_name AS publisher_display,
            p.role AS publisher_role, p.is_active AS publisher_active
     FROM content_items c
     LEFT JOIN users e ON e.id = c.created_by
     LEFT JOIN users r ON r.id = c.review_owner_id
     LEFT JOIN users p ON p.id = c.publisher_id
     WHERE c.content_type = 'news' AND c.live_payload IS NOT NULL
     ORDER BY NULLIF(c.live_payload->>'date', '') DESC NULLS LAST,
              c.live_at DESC NULLS LAST, c.created_at ASC`,
  );

  const news: PublicNewsItem[] = result.rows.map((row) => {
    const p = row.live_payload;
    const editor = personPublicNames({
      nameAr: row.editor_name_ar,
      nameEn: row.editor_name_en,
      displayName: row.editor_display,
    });
    const reviewer = personPublicNames({
      nameAr: row.reviewer_name_ar,
      nameEn: row.reviewer_name_en,
      displayName: row.reviewer_display,
    });
    const publisher = resolvePublicPublisher(
      row.publisher_display || row.publisher_name_ar || row.publisher_name_en
        ? {
            nameAr: row.publisher_name_ar,
            nameEn: row.publisher_name_en,
            displayName: row.publisher_display,
            role: row.publisher_role,
            isActive: row.publisher_active,
          }
        : null,
    );
    const story = resolveNewsStoryDate({
      publishedAt: row.published_at,
      liveDate: p.date,
      liveDateSource: p.date_source,
      liveSourcePublishedAt: p.source_published_at,
    });
    return toPublicNews({
      ...p,
      date: story.date,
      editor_ar: editor.ar || p.editor_ar || "",
      editor_en: editor.en || p.editor_en || "",
      reviewer_ar: reviewer.ar || p.reviewer_ar || "",
      reviewer_en: reviewer.en || p.reviewer_en || "",
      publisher_ar: publisher.ar,
      publisher_en: publisher.en,
    });
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
