import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { query } from "@/lib/db";
import { seoFromRow, withPublicSeo, type PublicSeoFields } from "@/lib/content/seo";
import { sanitizeBodyHtml } from "@/lib/content/sanitizeBody";
import {
  withImgWebpFromDisk,
  withPublicStoryFields,
  type StoryEnFields,
} from "@/lib/publish/storyPublic";

export type PlatformKind = "visual" | "radio" | "mobility";

export type PublicPlatformItem = {
  id: string;
  slug: string;
  kind: PlatformKind;
  title: string;
  summary: string;
  body?: string;
  img?: string;
  externalUrl?: string;
  media?: { kind: string; src: string; alt?: string }[];
} & PublicSeoFields &
  StoryEnFields & { img_webp?: string };

type PayloadSource = {
  id: string;
  title_ar: string;
  title_en: string | null;
  summary_ar: string | null;
  summary_en: string | null;
  body_ar: string | null;
  body_en: string | null;
  image_path?: string | null;
  external_url: string | null;
  platform_kind: PlatformKind | null;
  attachments?: unknown;
  public_slug?: string | null;
  en_status?: string | null;
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

export function buildPlatformPayload(row: PayloadSource): PublicPlatformItem {
  const kind = row.platform_kind;
  if (!kind || !["visual", "radio", "mobility"].includes(kind)) {
    throw new Error("Platform kind is required");
  }
  const img = row.image_path?.trim() || row.og_image?.trim() || "";
  const bodyAr = sanitizeBodyHtml(row.body_ar ?? undefined);
  const bodyEn = sanitizeBodyHtml(row.body_en ?? undefined);
  const media = mediaFromAttachments(row.attachments);
  const externalUrl = row.external_url?.trim() || "";
  if (!img && media.length === 0 && !externalUrl) {
    throw new Error("Provide media/image or an external URL before publishing");
  }
  return withPublicStoryFields(
    withPublicSeo(
      {
        id: row.id,
        slug: row.public_slug?.trim() || row.id,
        kind,
        title: row.title_ar.trim(),
        summary: row.summary_ar?.trim() || "",
        ...(bodyAr ? { body: bodyAr } : {}),
        ...(img ? { img } : {}),
        ...(externalUrl ? { externalUrl } : {}),
        ...(media.length ? { media } : {}),
      },
      row,
    ),
    {
      en_status: row.en_status,
      title_en: row.title_en,
      summary_en: row.summary_en,
      body_en: bodyEn,
      image_path: img || null,
    },
  );
}

function publicPlatformsPath(): string {
  return join(process.cwd(), "..", "data", "platforms.json");
}

export async function rebuildPublicPlatformsJson(): Promise<{ count: number; path: string }> {
  const result = await query<{ live_payload: PublicPlatformItem }>(
    `SELECT live_payload
     FROM content_items
     WHERE content_type = 'platform' AND live_payload IS NOT NULL
     ORDER BY live_at DESC NULLS LAST, created_at ASC`,
  );
  const platforms: PublicPlatformItem[] = result.rows.map((row) => ({
    ...row.live_payload,
    ...seoFromRow(row.live_payload),
    ...withImgWebpFromDisk(row.live_payload, row.live_payload.img),
  }));
  const path = publicPlatformsPath();
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (existsSync(path)) writeFileSync(`${path}.bak`, readFileSync(path));
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify({ platforms }, null, 4), "utf8");
  renameSync(tmp, path);
  const check = JSON.parse(readFileSync(path, "utf8")) as { platforms: unknown };
  if (!Array.isArray(check.platforms)) throw new Error("Published platforms.json invalid after write");
  return { count: platforms.length, path };
}
