import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { query } from "@/lib/db";
import { seoFromRow, withPublicSeo, type PublicSeoFields } from "@/lib/content/seo";
import { sanitizeBodyHtml } from "@/lib/content/sanitizeBody";
import { withPublicStoryFields, type StoryEnFields } from "@/lib/publish/storyPublic";
import { attachWebpSiblings } from "@/lib/media/webp";

export type PublicPartnerItem = {
  id: string;
  slug: string;
  name: string;
  country: string;
  date: string;
  emoji?: string;
  img?: string;
  summary_ar?: string;
  summary_en?: string;
  body_ar?: string;
  body_en?: string;
} & PublicSeoFields &
  StoryEnFields & { img_card?: string; img_webp?: string; img_card_webp?: string };

/** Public item plus the scope used to bucket it into intl/nat on rebuild. */
export type StoredPartnerPayload = PublicPartnerItem & { scope: "intl" | "nat" };

type PayloadSource = {
  id: string;
  title_ar: string;
  label_ar: string | null;
  partner_date: string | null;
  partner_emoji: string | null;
  partner_scope: "intl" | "nat" | null;
  public_slug?: string | null;
  image_path?: string | null;
  summary_ar?: string | null;
  summary_en?: string | null;
  body_ar?: string | null;
  body_en?: string | null;
  meta_title_ar?: string | null;
  meta_title_en?: string | null;
  meta_description_ar?: string | null;
  meta_description_en?: string | null;
  og_image?: string | null;
  en_status?: string | null;
  title_en?: string | null;
  image_card_path?: string | null;
};

function narrativeFromRow(row: {
  summary_ar?: string | null;
  summary_en?: string | null;
  body_ar?: string | null;
  body_en?: string | null;
}): Pick<PublicPartnerItem, "summary_ar" | "summary_en" | "body_ar" | "body_en"> {
  const out: Pick<PublicPartnerItem, "summary_ar" | "summary_en" | "body_ar" | "body_en"> = {};
  if (row.summary_ar?.trim()) out.summary_ar = row.summary_ar.trim();
  if (row.summary_en?.trim()) out.summary_en = row.summary_en.trim();
  const bodyAr = sanitizeBodyHtml(row.body_ar ?? undefined);
  const bodyEn = sanitizeBodyHtml(row.body_en ?? undefined);
  if (bodyAr) out.body_ar = bodyAr;
  if (bodyEn) out.body_en = bodyEn;
  return out;
}

/** Public object for a partner row (persisted to content_items.live_payload). */
export function buildPartnerPayload(row: PayloadSource): StoredPartnerPayload {
  const img = row.image_path?.trim() || row.og_image?.trim() || "";
  const publicBase = withPublicStoryFields(
    withPublicSeo(
      {
        id: row.id,
        slug: row.public_slug?.trim() || row.id,
        name: row.title_ar.trim(),
        country: row.label_ar?.trim() || "",
        date: row.partner_date?.trim() || "",
        ...narrativeFromRow(row),
      },
      row,
    ),
    {
      en_status: row.en_status,
      title_en: row.title_en,
      image_card_path: row.image_card_path,
    },
    { nameEn: true },
  );
  const item: StoredPartnerPayload = {
    ...publicBase,
    scope: row.partner_scope === "nat" ? "nat" : "intl",
  };
  const emoji = row.partner_emoji?.trim();
  if (emoji) item.emoji = emoji;
  if (img) item.img = img;
  return item;
}

export async function buildPartnerPayloadForItem(row: PayloadSource): Promise<StoredPartnerPayload> {
  return attachWebpSiblings(buildPartnerPayload(row));
}

function publicPartnersPath(): string {
  return join(process.cwd(), "..", "data", "partners.json");
}

export async function rebuildPublicPartnersJson(): Promise<{
  intl: number;
  nat: number;
  path: string;
}> {
  const result = await query<{ live_payload: StoredPartnerPayload }>(
    `SELECT live_payload
     FROM content_items
     WHERE content_type = 'partner' AND live_payload IS NOT NULL
     ORDER BY live_at DESC NULLS LAST, created_at ASC`,
  );

  const intl: PublicPartnerItem[] = [];
  const nat: PublicPartnerItem[] = [];

  for (const row of result.rows) {
    const { scope, ...item } = row.live_payload;
    const publicItem: PublicPartnerItem = withPublicStoryFields(
      {
        id: item.id || "",
        slug: item.slug || item.id || "",
        name: (item.name ?? "").trim(),
        country: item.country?.trim() || "",
        date: item.date?.trim() || "",
        ...seoFromRow(item),
        ...narrativeFromRow(item),
      },
      item,
      { nameEn: true },
    );
    if (item.emoji?.trim()) publicItem.emoji = item.emoji.trim();
    if (item.img?.trim()) publicItem.img = item.img.trim();
    if (scope === "nat") nat.push(publicItem);
    else intl.push(publicItem);
  }

  const path = publicPartnersPath();
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (existsSync(path)) writeFileSync(`${path}.bak`, readFileSync(path));

  const payload = JSON.stringify({ intl, nat }, null, 4);
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, payload, "utf8");
  renameSync(tmp, path);

  const check = JSON.parse(readFileSync(path, "utf8")) as { intl: unknown; nat: unknown };
  if (!Array.isArray(check.intl) || !Array.isArray(check.nat)) {
    throw new Error("Published partners.json invalid after write");
  }

  return { intl: intl.length, nat: nat.length, path };
}
