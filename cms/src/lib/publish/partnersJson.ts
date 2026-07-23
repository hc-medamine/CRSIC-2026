import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { query } from "@/lib/db";
import { seoFromRow, withPublicSeo, type PublicSeoFields } from "@/lib/content/seo";

export type PublicPartnerItem = {
  name: string;
  country: string;
  date: string;
  emoji?: string;
} & PublicSeoFields;

/** Public item plus the scope used to bucket it into intl/nat on rebuild. */
export type StoredPartnerPayload = PublicPartnerItem & { scope: "intl" | "nat" };

type PayloadSource = {
  title_ar: string;
  label_ar: string | null;
  partner_date: string | null;
  partner_emoji: string | null;
  partner_scope: "intl" | "nat" | null;
  meta_title_ar?: string | null;
  meta_title_en?: string | null;
  meta_description_ar?: string | null;
  meta_description_en?: string | null;
  og_image?: string | null;
};

/** Public object for a partner row (persisted to content_items.live_payload). */
export function buildPartnerPayload(row: PayloadSource): StoredPartnerPayload {
  const publicBase = withPublicSeo(
    {
      name: row.title_ar.trim(),
      country: row.label_ar?.trim() || "",
      date: row.partner_date?.trim() || "",
    },
    row,
  );
  const item: StoredPartnerPayload = {
    ...publicBase,
    scope: row.partner_scope === "nat" ? "nat" : "intl",
  };
  const emoji = row.partner_emoji?.trim();
  if (emoji) item.emoji = emoji;
  return item;
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
    const publicItem: PublicPartnerItem = {
      name: (item.name ?? "").trim(),
      country: item.country?.trim() || "",
      date: item.date?.trim() || "",
      ...seoFromRow(item),
    };
    if (item.emoji?.trim()) publicItem.emoji = item.emoji.trim();
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
