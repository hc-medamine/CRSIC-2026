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
  type PublicBylineFields,
} from "@/lib/publish/publicByline";

export type PublicEventItem = {
  id: string;
  slug: string;
  day: string;
  month: string;
  year: string;
  title: string;
  type: string;
  status: "done" | "upcoming" | "ongoing";
  img?: string;
  summary: string;
  body: string;
  media: PublicMediaItem[];
  editor_ar: string;
  editor_en: string;
  reviewer_ar: string;
  reviewer_en: string;
  publisher_ar: string;
  publisher_en: string;
} & PublicSeoFields;

/** Public item plus the scope used to bucket it into intl/nat on rebuild. */
export type StoredEventPayload = PublicEventItem & { scope: "intl" | "nat" };

type PayloadSource = {
  id: string;
  title_ar: string;
  summary_ar: string | null;
  body_ar: string | null;
  event_day: string | null;
  event_month: string | null;
  event_year: string | null;
  event_type_ar: string | null;
  event_display_status: "upcoming" | "ongoing" | "done" | null;
  event_scope: "intl" | "nat" | null;
  image_path: string | null;
  image_alt_ar: string | null;
  public_slug: string | null;
  attachments?: unknown;
  meta_title_ar?: string | null;
  meta_title_en?: string | null;
  meta_description_ar?: string | null;
  meta_description_en?: string | null;
  og_image?: string | null;
} & Partial<PublicBylineFields>;

/** Public object for an event row (persisted to content_items.live_payload). */
export function buildEventPayload(
  row: PayloadSource,
  usedSlugs?: Set<string>,
): StoredEventPayload {
  const media = buildMediaList(row.attachments, row.image_path, row.image_alt_ar);
  const base = row.public_slug?.trim() || slugifyTitle(row.title_ar);
  const slug = usedSlugs ? uniqueSlug(base, usedSlugs) : base;
  if (usedSlugs) usedSlugs.add(slug);
  const primary = primaryImageSrc(media) ?? row.image_path ?? undefined;
  const publicBase = withPublicSeo(
    {
      id: row.id,
      slug,
      day: row.event_day?.trim() || "01",
      month: row.event_month?.trim() || "",
      year: row.event_year?.trim() || "",
      title: row.title_ar.trim(),
      type: row.event_type_ar?.trim() || "فعالية",
      status:
        row.event_display_status === "done"
          ? ("done" as const)
          : row.event_display_status === "ongoing"
            ? ("ongoing" as const)
            : ("upcoming" as const),
      summary: row.summary_ar?.trim() || "",
      body: sanitizeBodyHtml(row.body_ar) || "",
      media,
      editor_ar: (row.editor_ar || "").trim(),
      editor_en: (row.editor_en || "").trim(),
      reviewer_ar: (row.reviewer_ar || "").trim(),
      reviewer_en: (row.reviewer_en || "").trim(),
      publisher_ar: PUBLIC_PUBLISHER_AR,
      publisher_en: PUBLIC_PUBLISHER_EN,
    },
    row,
  );
  const item: StoredEventPayload = {
    ...publicBase,
    scope: row.event_scope === "nat" ? "nat" : "intl",
  };
  if (primary) item.img = primary;
  return item;
}

export async function buildEventPayloadForItem(
  row: PayloadSource,
  usedSlugs?: Set<string>,
): Promise<StoredEventPayload> {
  const byline = row.id ? await loadPublicByline(row.id) : {
    editor_ar: "",
    editor_en: "",
    reviewer_ar: "",
    reviewer_en: "",
    publisher_ar: PUBLIC_PUBLISHER_AR,
    publisher_en: PUBLIC_PUBLISHER_EN,
  };
  return buildEventPayload({ ...row, ...byline }, usedSlugs);
}

function publicEventsPath(): string {
  return join(process.cwd(), "..", "data", "events.json");
}

export async function rebuildPublicEventsJson(): Promise<{
  intl: number;
  nat: number;
  path: string;
}> {
  const result = await query<{
    live_payload: StoredEventPayload;
    editor_name_ar: string | null;
    editor_name_en: string | null;
    editor_display: string | null;
    reviewer_name_ar: string | null;
    reviewer_name_en: string | null;
    reviewer_display: string | null;
  }>(
    `SELECT c.live_payload,
            e.name_ar AS editor_name_ar, e.name_en AS editor_name_en, e.display_name AS editor_display,
            r.name_ar AS reviewer_name_ar, r.name_en AS reviewer_name_en, r.display_name AS reviewer_display
     FROM content_items c
     LEFT JOIN users e ON e.id = c.created_by
     LEFT JOIN users r ON r.id = c.review_owner_id
     WHERE c.content_type = 'event' AND c.live_payload IS NOT NULL
     ORDER BY c.live_at DESC NULLS LAST, c.created_at ASC`,
  );

  const intl: PublicEventItem[] = [];
  const nat: PublicEventItem[] = [];

  for (const row of result.rows) {
    const { scope, ...item } = row.live_payload;
    const media = buildMediaList(item.media, item.img, undefined);
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
    const publicItem: PublicEventItem = {
      id: item.id || `legacy-event-${item.slug || slugifyTitle(item.title || "item")}`,
      slug: item.slug || slugifyTitle(item.title || "item"),
      day: item.day?.trim() || "01",
      month: item.month?.trim() || "",
      year: item.year?.trim() || "",
      title: (item.title ?? "").trim(),
      type: item.type?.trim() || "فعالية",
      status:
        item.status === "done"
          ? "done"
          : item.status === "ongoing"
            ? "ongoing"
            : "upcoming",
      summary: item.summary?.trim() || "",
      body: item.body?.trim() || "",
      media,
      editor_ar: editor.ar || item.editor_ar || "",
      editor_en: editor.en || item.editor_en || "",
      reviewer_ar: reviewer.ar || item.reviewer_ar || "",
      reviewer_en: reviewer.en || item.reviewer_en || "",
      publisher_ar: PUBLIC_PUBLISHER_AR,
      publisher_en: PUBLIC_PUBLISHER_EN,
      ...seoFromRow(item),
    };
    const primary = primaryImageSrc(media) ?? item.img;
    if (primary) publicItem.img = primary;
    if (scope === "nat") nat.push(publicItem);
    else intl.push(publicItem);
  }

  const path = publicEventsPath();
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (existsSync(path)) writeFileSync(`${path}.bak`, readFileSync(path));

  const payload = JSON.stringify({ intl, nat }, null, 4);
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, payload, "utf8");
  renameSync(tmp, path);

  const check = JSON.parse(readFileSync(path, "utf8")) as { intl: unknown; nat: unknown };
  if (!Array.isArray(check.intl) || !Array.isArray(check.nat)) {
    throw new Error("Published events.json invalid after write");
  }

  return { intl: intl.length, nat: nat.length, path };
}
