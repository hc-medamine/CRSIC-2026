import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { query } from "@/lib/db";
import {
  buildMediaList,
  primaryImageSrc,
  type PublicMediaItem,
} from "@/lib/publish/media";
import { slugifyTitle, uniqueSlug } from "@/lib/publish/slug";

export type PublicEventItem = {
  id: string;
  slug: string;
  day: string;
  month: string;
  year: string;
  title: string;
  type: string;
  status: "done" | "upcoming";
  img?: string;
  summary: string;
  body: string;
  media: PublicMediaItem[];
};

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
  event_display_status: "upcoming" | "done" | null;
  event_scope: "intl" | "nat" | null;
  image_path: string | null;
  image_alt_ar: string | null;
  public_slug: string | null;
  attachments?: unknown;
};

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
  const item: StoredEventPayload = {
    id: row.id,
    slug,
    day: row.event_day?.trim() || "01",
    month: row.event_month?.trim() || "",
    year: row.event_year?.trim() || "",
    title: row.title_ar.trim(),
    type: row.event_type_ar?.trim() || "فعالية",
    status: row.event_display_status === "done" ? "done" : "upcoming",
    scope: row.event_scope === "nat" ? "nat" : "intl",
    summary: row.summary_ar?.trim() || "",
    body: row.body_ar?.trim() || "",
    media,
  };
  if (primary) item.img = primary;
  return item;
}

function publicEventsPath(): string {
  return join(process.cwd(), "..", "data", "events.json");
}

export async function rebuildPublicEventsJson(): Promise<{
  intl: number;
  nat: number;
  path: string;
}> {
  const result = await query<{ live_payload: StoredEventPayload }>(
    `SELECT live_payload
     FROM content_items
     WHERE content_type = 'event' AND live_payload IS NOT NULL
     ORDER BY live_at DESC NULLS LAST, created_at ASC`,
  );

  const intl: PublicEventItem[] = [];
  const nat: PublicEventItem[] = [];

  for (const row of result.rows) {
    const { scope, ...item } = row.live_payload;
    const media = buildMediaList(item.media, item.img, undefined);
    const publicItem: PublicEventItem = {
      id: item.id || `legacy-event-${item.slug || slugifyTitle(item.title || "item")}`,
      slug: item.slug || slugifyTitle(item.title || "item"),
      day: item.day?.trim() || "01",
      month: item.month?.trim() || "",
      year: item.year?.trim() || "",
      title: (item.title ?? "").trim(),
      type: item.type?.trim() || "فعالية",
      status: item.status === "done" ? "done" : "upcoming",
      summary: item.summary?.trim() || "",
      body: item.body?.trim() || "",
      media,
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
