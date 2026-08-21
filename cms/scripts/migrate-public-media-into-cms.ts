/**
 * Copy every CMS-managed public image into img/cms/{bucket}/ and rewrite
 * content_items + live_payload so published JSON no longer depends on
 * img/covers or img/Holders. Partner photos are re-fetched from crsic.dz
 * when the hashed img/cms/partners files are missing.
 *
 * Usage (from cms/): npm run db:migrate:media-to-cms
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  statSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import { basename, dirname, extname, join } from "node:path";
import { execFileSync } from "node:child_process";
import { pool, query } from "../src/lib/db";
import { publicPathFor, type MediaBucket } from "../src/lib/media/config";
import { rebuildPublicPublicationsJson } from "../src/lib/publish/publicationsJson";
import { rebuildPublicNewsJson } from "../src/lib/publish/newsJson";
import { rebuildPublicEventsJson } from "../src/lib/publish/eventsJson";
import { rebuildPublicLawsJson } from "../src/lib/publish/lawsJson";
import { rebuildPublicPlatformsJson } from "../src/lib/publish/platformsJson";
import { rebuildPublicPartnersJson } from "../src/lib/publish/partnersJson";
import { writePublicDirectorJson } from "../src/lib/publish/directorJson";

type ContentType =
  | "news"
  | "event"
  | "publication"
  | "partner"
  | "alert"
  | "research_group"
  | "research_project"
  | "law"
  | "platform";

const TYPE_BUCKET: Record<ContentType, MediaBucket> = {
  news: "news",
  event: "events",
  publication: "covers",
  partner: "partners",
  alert: "alerts",
  research_group: "research",
  research_project: "research",
  law: "laws",
  platform: "platforms",
};

const IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i;

type ItemRow = {
  id: string;
  content_type: ContentType;
  image_path: string | null;
  og_image: string | null;
  attachments: unknown;
  live_payload: unknown;
};

function repoRoot(): string {
  return join(process.cwd(), "..");
}

function absPublic(publicPath: string): string {
  return join(repoRoot(), ...publicPath.split("/"));
}

function mimeFor(ext: string): string {
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "application/octet-stream";
}

function canonicalExt(name: string): string {
  const raw = extname(name).slice(1).toLowerCase();
  return raw === "jpeg" ? "jpg" : raw;
}

function uuidFromHash(hash: string): string | null {
  if (!/^[0-9a-f]{32}$/i.test(hash)) return null;
  const h = hash.toLowerCase();
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function parseCmsPath(
  publicPath: string,
): { bucket: MediaBucket; id: string; extension: string } | null {
  const m = publicPath.match(/^img\/cms\/([a-z]+)\/([0-9a-f]{32})\.([a-z0-9]+)$/i);
  if (!m) return null;
  const id = uuidFromHash(m[2]);
  if (!id) return null;
  return { bucket: m[1] as MediaBucket, id, extension: m[3].toLowerCase() };
}

function collectImgPaths(value: unknown, into: Set<string>): void {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("img/") && IMAGE_EXT.test(trimmed)) into.add(trimmed.split("?")[0]);
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectImgPaths(entry, into);
    return;
  }
  if (value && typeof value === "object") {
    for (const entry of Object.values(value as Record<string, unknown>)) {
      collectImgPaths(entry, into);
    }
  }
}

async function ensureMediaAsset(opts: {
  id: string;
  bucket: MediaBucket;
  publicPath: string;
  originalFilename: string;
  uploadedBy: string;
}): Promise<void> {
  const abs = absPublic(opts.publicPath);
  if (!existsSync(abs)) throw new Error(`Missing public file ${opts.publicPath}`);
  const extension = canonicalExt(opts.publicPath);
  const byteSize = statSync(abs).size;
  await query(
    `INSERT INTO media_assets (
       id, bucket, original_filename, mime_type, byte_size, extension, public_path, uploaded_by
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (public_path) DO NOTHING`,
    [
      opts.id,
      opts.bucket,
      opts.originalFilename.slice(0, 180),
      mimeFor(extension),
      byteSize,
      extension,
      opts.publicPath,
      opts.uploadedBy,
    ],
  );
  const staging = join(process.cwd(), "uploads", `${opts.id}.${extension}`);
  mkdirSync(dirname(staging), { recursive: true });
  if (!existsSync(staging)) copyFileSync(abs, staging);
}

function copyToCms(sourcePath: string, destPath: string): void {
  const src = absPublic(sourcePath);
  const dest = absPublic(destPath);
  if (!existsSync(src)) throw new Error(`Source missing: ${sourcePath}`);
  mkdirSync(dirname(dest), { recursive: true });
  if (src !== dest) copyFileSync(src, dest);
}

async function rewriteItemPaths(itemId: string, fromPath: string, toPath: string): Promise<void> {
  if (fromPath === toPath) return;
  await query(
    `UPDATE content_items SET
       image_path = CASE WHEN image_path = $2 THEN $3 ELSE image_path END,
       og_image = CASE WHEN og_image = $2 THEN $3 ELSE og_image END,
       attachments = CASE
         WHEN attachments IS NULL THEN attachments
         ELSE replace(attachments::text, $2, $3)::jsonb
       END,
       live_payload = CASE
         WHEN live_payload IS NULL THEN live_payload
         ELSE replace(live_payload::text, $2, $3)::jsonb
       END,
       updated_at = NOW()
     WHERE id = $1`,
    [itemId, fromPath, toPath],
  );
}

async function superAdminId(): Promise<string> {
  const res = await query<{ id: string }>(
    `SELECT id FROM users WHERE role = 'super_admin' AND is_active = TRUE ORDER BY created_at ASC LIMIT 1`,
  );
  if (!res.rows[0]) throw new Error("No super admin for media_assets.uploaded_by");
  return res.rows[0].id;
}

async function migrateLocalCmsMedia(uploadedBy: string): Promise<{ moved: number; kept: number }> {
  const items = await query<ItemRow>(
    `SELECT id, content_type, image_path, og_image, attachments, live_payload
     FROM content_items`,
  );

  const cache = new Map<string, string>();
  let moved = 0;
  let kept = 0;

  for (const row of items.rows) {
    const bucket = TYPE_BUCKET[row.content_type];
    if (!bucket) continue;
    const paths = new Set<string>();
    collectImgPaths(row.image_path, paths);
    collectImgPaths(row.og_image, paths);
    collectImgPaths(row.attachments, paths);
    collectImgPaths(row.live_payload, paths);

    for (const sourcePath of paths) {
      const cacheKey = `${bucket}:${sourcePath}`;
      let dest = cache.get(cacheKey);
      if (!dest) {
        const parsed = parseCmsPath(sourcePath);
        const alreadyCanonical = parsed?.bucket === bucket && existsSync(absPublic(sourcePath));
        if (alreadyCanonical && parsed) {
          dest = sourcePath;
          await ensureMediaAsset({
            id: parsed.id,
            bucket,
            publicPath: dest,
            originalFilename: basename(sourcePath),
            uploadedBy,
          });
          kept += 1;
        } else if (existsSync(absPublic(sourcePath))) {
          const id = randomUUID();
          const extension = canonicalExt(sourcePath);
          dest = publicPathFor(bucket, id, extension);
          copyToCms(sourcePath, dest);
          await ensureMediaAsset({
            id,
            bucket,
            publicPath: dest,
            originalFilename: basename(sourcePath),
            uploadedBy,
          });
          moved += 1;
          console.log(`  ${row.content_type}: ${sourcePath} → ${dest}`);
        } else {
          console.warn(`  skip missing ${row.content_type} ${sourcePath}`);
          continue;
        }
        cache.set(cacheKey, dest);
      }
      await rewriteItemPaths(row.id, sourcePath, dest);
    }
  }

  const director = await query<{
    quote_ar: string;
    quote_en: string;
    name_ar: string;
    name_en: string;
    role_ar: string;
    role_en: string;
    portrait_path: string | null;
    portrait_alt_ar: string | null;
    portrait_alt_en: string | null;
  }>(`SELECT * FROM site_director WHERE id = 1`);
  const portrait = director.rows[0]?.portrait_path?.trim();
  if (portrait && existsSync(absPublic(portrait))) {
    const parsed = parseCmsPath(portrait);
    if (parsed?.bucket === "site") {
      await ensureMediaAsset({
        id: parsed.id,
        bucket: "site",
        publicPath: portrait,
        originalFilename: basename(portrait),
        uploadedBy,
      });
      kept += 1;
    } else if (existsSync(absPublic(portrait))) {
      const id = randomUUID();
      const dest = publicPathFor("site", id, canonicalExt(portrait));
      copyToCms(portrait, dest);
      await ensureMediaAsset({
        id,
        bucket: "site",
        publicPath: dest,
        originalFilename: basename(portrait),
        uploadedBy,
      });
      await query(`UPDATE site_director SET portrait_path = $1, updated_at = NOW() WHERE id = 1`, [
        dest,
      ]);
      moved += 1;
    }
    const fresh = await query<(typeof director.rows)[0]>(`SELECT * FROM site_director WHERE id = 1`);
    if (fresh.rows[0]?.portrait_path) writePublicDirectorJson(fresh.rows[0]);
  }

  return { moved, kept };
}

async function main() {
  const uploadedBy = await superAdminId();
  console.log("Migrating local CMS media into img/cms/…");
  const local = await migrateLocalCmsMedia(uploadedBy);
  console.log(`Local media: moved=${local.moved} already-canonical=${local.kept}`);

  console.log("Rebuilding public JSON from CMS live_payload…");
  const pubs = await rebuildPublicPublicationsJson();
  const news = await rebuildPublicNewsJson();
  const events = await rebuildPublicEventsJson();
  const laws = await rebuildPublicLawsJson();
  const platforms = await rebuildPublicPlatformsJson();
  console.log(
    `Rebuilt pubs=${pubs.count} news=${news.count} events intl+nat=${events.intl + events.nat} laws=${laws.count} platforms=${platforms.count}`,
  );

  console.log("Recovering partner photos from crsic.dz (enrich --apply)…");
  execFileSync(
    process.execPath,
    ["--env-file=.env.local", "--import", "tsx", "scripts/enrich-partners-from-legacy.ts", "--apply"],
    { cwd: process.cwd(), stdio: "inherit" },
  );

  const partners = await rebuildPublicPartnersJson();
  console.log(`Partners rebuilt intl=${partners.intl} nat=${partners.nat}`);
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
