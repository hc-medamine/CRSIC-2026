import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { query } from "@/lib/db";
import { seoFromRow, withPublicSeo, type PublicSeoFields } from "@/lib/content/seo";
import { sanitizeBodyHtml } from "@/lib/content/sanitizeBody";

export type PublicLawItem = {
  id: string;
  slug: string;
  title: string;
  titleEn?: string;
  summary: string;
  summaryEn?: string;
  body?: string;
  bodyEn?: string;
  img?: string;
  externalUrl?: string;
  media?: { kind: string; src: string; alt?: string }[];
} & PublicSeoFields;

type PayloadSource = {
  id: string;
  title_ar: string;
  title_en: string | null;
  summary_ar: string | null;
  summary_en: string | null;
  body_ar?: string | null;
  body_en?: string | null;
  image_path?: string | null;
  external_url?: string | null;
  attachments?: unknown;
  public_slug?: string | null;
  meta_title_ar?: string | null;
  meta_title_en?: string | null;
  meta_description_ar?: string | null;
  meta_description_en?: string | null;
  og_image?: string | null;
};

function mediaFromAttachments(raw: unknown): { kind: string; src: string; alt?: string }[] {
  if (!Array.isArray(raw)) return [];
  const out: { kind: string; src: string; alt?: string }[] = [];
  for (const a of raw) {
    if (!a || typeof a !== "object") continue;
    const o = a as Record<string, unknown>;
    const src = typeof o.src === "string" ? o.src : typeof o.path === "string" ? o.path : "";
    if (!src) continue;
    const kind = typeof o.kind === "string" ? o.kind : "image";
    const alt = typeof o.alt === "string" ? o.alt : undefined;
    out.push(alt ? { kind, src, alt } : { kind, src });
  }
  return out;
}

export function buildLawPayload(row: PayloadSource): PublicLawItem {
  if (!row.title_ar?.trim()) throw new Error("Law title is required to publish");
  const img = row.image_path?.trim() || row.og_image?.trim() || "";
  const bodyAr = sanitizeBodyHtml(row.body_ar ?? undefined);
  const bodyEn = sanitizeBodyHtml(row.body_en ?? undefined);
  const media = mediaFromAttachments(row.attachments);
  const externalUrl = row.external_url?.trim() || "";
  if (!bodyAr && !img && media.length === 0) {
    throw new Error("Provide body text, image, or attachments before publishing a law");
  }
  const item = withPublicSeo(
    {
      id: row.id,
      slug: row.public_slug?.trim() || row.id,
      title: row.title_ar.trim(),
      summary: row.summary_ar?.trim() || "",
    },
    row,
  ) as PublicLawItem;
  if (row.title_en?.trim()) item.titleEn = row.title_en.trim();
  if (row.summary_en?.trim()) item.summaryEn = row.summary_en.trim();
  if (bodyAr) item.body = bodyAr;
  if (bodyEn) item.bodyEn = bodyEn;
  if (img) item.img = img;
  if (externalUrl) item.externalUrl = externalUrl;
  if (media.length) item.media = media;
  return item;
}

function publicLawsPath(): string {
  return join(process.cwd(), "..", "data", "laws.json");
}

export async function rebuildPublicLawsJson(): Promise<{ count: number; path: string }> {
  const result = await query<{ live_payload: PublicLawItem }>(
    `SELECT live_payload
     FROM content_items
     WHERE content_type = 'law' AND live_payload IS NOT NULL
     ORDER BY live_at DESC NULLS LAST, created_at ASC`,
  );
  const laws: PublicLawItem[] = result.rows.map((row) => ({
    ...row.live_payload,
    ...seoFromRow(row.live_payload),
  }));
  const path = publicLawsPath();
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (existsSync(path)) writeFileSync(`${path}.bak`, readFileSync(path));
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify({ laws }, null, 4), "utf8");
  renameSync(tmp, path);
  const check = JSON.parse(readFileSync(path, "utf8")) as { laws: unknown };
  if (!Array.isArray(check.laws)) throw new Error("Published laws.json invalid after write");
  return { count: laws.length, path };
}
