import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { query } from "@/lib/db";
import { seoFromRow, withPublicSeo, type PublicSeoFields } from "@/lib/content/seo";
import { withStoryEn, type StoryEnFields } from "@/lib/publish/storyPublic";

/** Public item shape persisted to content_items.live_payload and served as data/alerts.json. */
export type PublicAlertItem = {
  id: string;
  message_ar: string;
  message_en?: string;
  link: string | null;
  link_label_ar: string;
  link_label_en?: string;
} & PublicSeoFields &
  StoryEnFields;

type PayloadSource = {
  id: string;
  title_ar: string;
  title_en: string | null;
  alert_link_url: string | null;
  alert_link_label_ar: string | null;
  alert_link_label_en: string | null;
  en_status?: string | null;
  meta_title_ar?: string | null;
  meta_title_en?: string | null;
  meta_description_ar?: string | null;
  meta_description_en?: string | null;
  og_image?: string | null;
};

/** Public object for an alert row (persisted to content_items.live_payload). */
export function buildAlertPayload(row: PayloadSource): PublicAlertItem {
  const message_ar = row.title_ar.trim();
  const base = withPublicSeo(
    {
      id: row.id,
      message_ar,
      link: row.alert_link_url?.trim() || null,
      link_label_ar: row.alert_link_label_ar?.trim() || "",
    },
    row,
  );
  const en = withStoryEn(
    { ...base },
    {
      en_status: row.en_status,
      title_en: row.title_en,
      label_en: row.alert_link_label_en,
    },
  );
  const item: PublicAlertItem = {
    ...en,
    message_ar,
    link: base.link,
    link_label_ar: base.link_label_ar,
  };
  if (en.title_en) item.message_en = en.title_en;
  if (en.label_en) item.link_label_en = en.label_en;
  return item;
}

function publicAlertsPath(): string {
  return join(process.cwd(), "..", "data", "alerts.json");
}

export async function rebuildPublicAlertsJson(): Promise<{ count: number; path: string }> {
  const result = await query<{ live_payload: PublicAlertItem }>(
    `SELECT live_payload
     FROM content_items
     WHERE content_type = 'alert' AND live_payload IS NOT NULL
     ORDER BY live_at DESC NULLS LAST, created_at ASC`,
  );

  const items: PublicAlertItem[] = result.rows.map((row) => ({
    ...row.live_payload,
    ...seoFromRow(row.live_payload),
  }));

  const path = publicAlertsPath();
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (existsSync(path)) writeFileSync(`${path}.bak`, readFileSync(path));

  const payload = JSON.stringify({ items }, null, 4);
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, payload, "utf8");
  renameSync(tmp, path);

  const check = JSON.parse(readFileSync(path, "utf8")) as { items: unknown };
  if (!Array.isArray(check.items)) {
    throw new Error("Published alerts.json invalid after write");
  }

  return { count: items.length, path };
}
