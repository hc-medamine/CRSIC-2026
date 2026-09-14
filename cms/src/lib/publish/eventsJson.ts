import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { query } from "@/lib/db";
import { prepareContentImagesForPublish } from "@/lib/media/publishImages";
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
  resolvePublicPublisher,
  type PublicBylineFields,
} from "@/lib/publish/publicByline";
import { withPublicStoryFields, type StoryEnFields } from "@/lib/publish/storyPublic";
import {
  EVENT_CATEGORY_TYPE_AR,
  EVENT_CATEGORY_TYPE_EN,
  isValidEventPair,
  legacyScopeForCategory,
  resolveLegacyCategory,
  sectionForCategory,
  type EventCategoryId,
  type EventSectionId,
} from "@/lib/content/eventTaxonomy";

export type PublicEventItem = {
  id: string;
  slug: string;
  day: string;
  month: string;
  year: string;
  title: string;
  type: string;
  category: EventCategoryId;
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
} & PublicSeoFields &
  StoryEnFields & { img_card?: string; type_en?: string };

/** Public item plus section used to bucket into activities/meetings on rebuild. */
export type StoredEventPayload = PublicEventItem & {
  section: EventSectionId;
  /** Derived legacy scope kept for older live_payload rows during transition. */
  scope?: "intl" | "nat";
};

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
  event_section?: EventSectionId | string | null;
  event_category?: EventCategoryId | string | null;
  image_path: string | null;
  image_alt_ar: string | null;
  public_slug: string | null;
  attachments?: unknown;
  meta_title_ar?: string | null;
  meta_title_en?: string | null;
  meta_description_ar?: string | null;
  meta_description_en?: string | null;
  og_image?: string | null;
  en_status?: string | null;
  title_en?: string | null;
  summary_en?: string | null;
  body_en?: string | null;
  event_type_en?: string | null;
  image_card_path?: string | null;
} & Partial<PublicBylineFields>;

function resolveEventTaxonomy(row: {
  event_section?: string | null;
  event_category?: string | null;
  event_type_ar?: string | null;
  event_scope?: string | null;
}): { section: EventSectionId; category: EventCategoryId } {
  const fromCols =
    row.event_category &&
    row.event_section &&
    isValidEventPair(row.event_section, row.event_category)
      ? (row.event_category as EventCategoryId)
      : null;
  const category =
    fromCols ??
    resolveLegacyCategory(row.event_type_ar, row.event_scope) ??
    ("nat" as EventCategoryId);
  const section =
    row.event_section && isValidEventPair(row.event_section, category)
      ? (row.event_section as EventSectionId)
      : (sectionForCategory(category) ?? "meetings");
  return { section, category };
}

function resolveCategoryFromStored(
  item: Partial<PublicEventItem> & { scope?: string | null; section?: string | null },
): EventCategoryId {
  if (item.category && sectionForCategory(item.category)) {
    return item.category;
  }
  return (
    resolveLegacyCategory(item.type, item.scope) ??
    (item.scope === "intl" ? "intl" : "nat")
  );
}

function resolveSectionFromStored(
  item: Partial<PublicEventItem> & { scope?: string | null; section?: string | null },
  category: EventCategoryId,
): EventSectionId {
  if (item.section === "activities" || item.section === "meetings") {
    if (isValidEventPair(item.section, category)) return item.section;
  }
  return sectionForCategory(category) ?? "meetings";
}

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
  const { section, category } = resolveEventTaxonomy(row);
  const typeAr = EVENT_CATEGORY_TYPE_AR[category];
  const typeEn = EVENT_CATEGORY_TYPE_EN[category];
  const publicBase = withPublicStoryFields(
    withPublicSeo(
      {
        id: row.id,
        slug,
        day: row.event_day?.trim() || "01",
        month: row.event_month?.trim() || "",
        year: row.event_year?.trim() || "",
        title: row.title_ar.trim(),
        type: typeAr,
        category,
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
        publisher_ar: (row.publisher_ar || "").trim() || PUBLIC_PUBLISHER_AR,
        publisher_en: (row.publisher_en || "").trim() || PUBLIC_PUBLISHER_EN,
      },
      row,
    ),
    {
      en_status: row.en_status,
      title_en: row.title_en,
      summary_en: row.summary_en,
      body_en: sanitizeBodyHtml(row.body_en) || null,
      image_path: row.image_path ?? primary,
      image_card_path: row.image_card_path,
    },
    { typeEn },
  );
  const item: StoredEventPayload = {
    ...publicBase,
    section,
    scope: legacyScopeForCategory(category),
  };
  if (primary) item.img = primary;
  return item;
}

export async function buildEventPayloadForItem(
  row: PayloadSource,
  usedSlugs?: Set<string>,
): Promise<StoredEventPayload> {
  const prepared = await prepareContentImagesForPublish(row);
  const byline = row.id ? await loadPublicByline(row.id) : {
    editor_ar: "",
    editor_en: "",
    reviewer_ar: "",
    reviewer_en: "",
    publisher_ar: PUBLIC_PUBLISHER_AR,
    publisher_en: PUBLIC_PUBLISHER_EN,
  };
  return buildEventPayload({ ...prepared, ...byline }, usedSlugs);
}

function publicEventsPath(): string {
  return join(process.cwd(), "..", "data", "events.json");
}

export async function rebuildPublicEventsJson(): Promise<{
  activities: number;
  meetings: number;
  path: string;
}> {
  const result = await query<{
    live_payload: StoredEventPayload & { scope?: "intl" | "nat" };
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
  }>(
    `SELECT c.live_payload,
            e.name_ar AS editor_name_ar, e.name_en AS editor_name_en, e.display_name AS editor_display,
            r.name_ar AS reviewer_name_ar, r.name_en AS reviewer_name_en, r.display_name AS reviewer_display,
            p.name_ar AS publisher_name_ar, p.name_en AS publisher_name_en, p.display_name AS publisher_display,
            p.role AS publisher_role, p.is_active AS publisher_active
     FROM content_items c
     LEFT JOIN users e ON e.id = c.created_by
     LEFT JOIN users r ON r.id = c.review_owner_id
     LEFT JOIN users p ON p.id = c.publisher_id
     WHERE c.content_type = 'event' AND c.live_payload IS NOT NULL
     ORDER BY c.live_at DESC NULLS LAST, c.created_at ASC`,
  );

  const activities: PublicEventItem[] = [];
  const meetings: PublicEventItem[] = [];

  for (const row of result.rows) {
    const { section: _section, scope, ...rest } = row.live_payload;
    const item = rest as PublicEventItem & { scope?: "intl" | "nat"; section?: EventSectionId };
    const category = resolveCategoryFromStored({ ...item, scope });
    const section = resolveSectionFromStored({ ...item, scope, section: _section }, category);
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
    const publicItem: PublicEventItem = withPublicStoryFields(
      {
        id: item.id || `legacy-event-${item.slug || slugifyTitle(item.title || "item")}`,
        slug: item.slug || slugifyTitle(item.title || "item"),
        day: item.day?.trim() || "01",
        month: item.month?.trim() || "",
        year: item.year?.trim() || "",
        title: (item.title ?? "").trim(),
        type: EVENT_CATEGORY_TYPE_AR[category],
        category,
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
        publisher_ar: publisher.ar,
        publisher_en: publisher.en,
        ...seoFromRow(item),
      },
      item,
      { typeEn: EVENT_CATEGORY_TYPE_EN[category] },
    );
    const primary = primaryImageSrc(media) ?? item.img;
    if (primary) publicItem.img = primary;
    if (section === "activities") activities.push(publicItem);
    else meetings.push(publicItem);
  }

  const path = publicEventsPath();
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (existsSync(path)) writeFileSync(`${path}.bak`, readFileSync(path));

  const payload = JSON.stringify({ activities, meetings }, null, 4);
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, payload, "utf8");
  renameSync(tmp, path);

  const check = JSON.parse(readFileSync(path, "utf8")) as {
    activities: unknown;
    meetings: unknown;
  };
  if (!Array.isArray(check.activities) || !Array.isArray(check.meetings)) {
    throw new Error("Published events.json invalid after write");
  }

  return { activities: activities.length, meetings: meetings.length, path };
}
