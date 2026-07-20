import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { query } from "@/lib/db";
import {
  buildMediaList,
  primaryImageSrc,
  type PublicMediaItem,
} from "@/lib/publish/media";
import { slugifyTitle, uniqueSlug } from "@/lib/publish/slug";

export type PublicPubItem = {
  id: string;
  slug: string;
  t: string;
  type: "collective" | "individual";
  dept: string;
  desc: string;
  summary: string;
  body: string;
  media: PublicMediaItem[];
};

/** Public item plus its cover (kept alongside so covers.length === pubs.length on rebuild). */
export type StoredPubPayload = PublicPubItem & { cover: string };

type PayloadSource = {
  id: string;
  title_ar: string;
  pub_kind: "collective" | "individual" | null;
  label_ar: string | null;
  summary_ar: string | null;
  body_ar: string | null;
  image_path: string | null;
  image_alt_ar: string | null;
  public_slug: string | null;
  attachments?: unknown;
};

/** Public object for a publication row (persisted to content_items.live_payload). */
export function buildPublicationPayload(
  row: PayloadSource,
  usedSlugs?: Set<string>,
): StoredPubPayload {
  const media = buildMediaList(row.attachments, row.image_path, row.image_alt_ar);
  const cover = primaryImageSrc(media)?.trim() || row.image_path?.trim();
  if (!cover) {
    throw new Error(`Publication "${row.title_ar}" is missing a cover path`);
  }
  const base = row.public_slug?.trim() || slugifyTitle(row.title_ar);
  const slug = usedSlugs ? uniqueSlug(base, usedSlugs) : base;
  if (usedSlugs) usedSlugs.add(slug);
  const summary = row.summary_ar?.trim() || "";
  return {
    id: row.id,
    slug,
    t: row.title_ar.trim(),
    type: row.pub_kind === "individual" ? "individual" : "collective",
    dept: row.label_ar?.trim() || "",
    desc: summary,
    summary,
    body: row.body_ar?.trim() || "",
    media: media.length > 0 ? media : [{ kind: "image", src: cover }],
    cover,
  };
}

function publicPublicationsPath(): string {
  return join(process.cwd(), "..", "data", "publications.json");
}

/**
 * P1+ detail: Arabic plain-text pubs + covers; covers.length === pubs.length.
 */
export async function rebuildPublicPublicationsJson(): Promise<{
  count: number;
  path: string;
}> {
  const result = await query<{ live_payload: StoredPubPayload }>(
    `SELECT live_payload
     FROM content_items
     WHERE content_type = 'publication' AND live_payload IS NOT NULL
     ORDER BY live_at DESC NULLS LAST, created_at ASC`,
  );

  const pubs: PublicPubItem[] = [];
  const covers: string[] = [];

  for (const row of result.rows) {
    const p = row.live_payload;
    const media = buildMediaList(p.media, p.cover, undefined);
    const cover = primaryImageSrc(media)?.trim() || p.cover?.trim();
    if (!cover) {
      throw new Error(`Live publication "${p.t}" is missing cover path`);
    }
    const summary = p.summary?.trim() || p.desc?.trim() || "";
    pubs.push({
      id: p.id || `legacy-publication-${p.slug || slugifyTitle(p.t || "item")}`,
      slug: p.slug || slugifyTitle(p.t || "item"),
      t: (p.t ?? "").trim(),
      type: p.type === "individual" ? "individual" : "collective",
      dept: p.dept?.trim() || "",
      desc: summary,
      summary,
      body: p.body?.trim() || "",
      media: media.length > 0 ? media : [{ kind: "image", src: cover }],
    });
    covers.push(cover);
  }

  if (covers.length !== pubs.length) {
    throw new Error("covers.length must equal pubs.length");
  }

  const path = publicPublicationsPath();
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (existsSync(path)) writeFileSync(`${path}.bak`, readFileSync(path));

  const payload = JSON.stringify({ pubs, covers }, null, 4);
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, payload, "utf8");
  renameSync(tmp, path);

  const check = JSON.parse(readFileSync(path, "utf8")) as {
    pubs: unknown;
    covers: unknown;
  };
  if (!Array.isArray(check.pubs) || !Array.isArray(check.covers)) {
    throw new Error("Published publications.json invalid after write");
  }
  if (check.covers.length !== check.pubs.length) {
    throw new Error("Published publications.json covers/pubs length mismatch");
  }

  return { count: pubs.length, path };
}
