import {
  mkdirSync,
  writeFileSync,
  existsSync,
  copyFileSync,
  unlinkSync,
  readdirSync,
  statSync,
} from "node:fs";
import { dirname, join, extname } from "node:path";
import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { canAccessContentType, isCentreWideViewer } from "@/lib/content/permissions";
import {
  isMediaBucket,
  MEDIA_BUCKETS,
  publicPathFor,
  type MediaBucket,
} from "@/lib/media/config";
import {
  listMediaReferences,
  type MediaReference,
} from "@/lib/media/references";
import { validateUploadFile, type ValidatedUpload } from "@/lib/media/validate";

export class MediaInUseError extends Error {
  readonly code = "MEDIA_IN_USE" as const;
  readonly publicPath: string;
  readonly references: MediaReference[];

  constructor(publicPath: string, references: MediaReference[]) {
    super("Media is still referenced");
    this.name = "MediaInUseError";
    this.publicPath = publicPath;
    this.references = references;
  }
}

export type MediaAsset = {
  id: string;
  bucket: MediaBucket;
  original_filename: string;
  mime_type: string;
  byte_size: number;
  extension: string;
  public_path: string;
  uploaded_by: string;
  replaced_at: Date | null;
  created_at: Date;
  updated_at: Date;
  /** Present when listed with user join (library UI). */
  uploader_display_name?: string | null;
  uploader_name_ar?: string | null;
  uploader_name_en?: string | null;
};

function uploadsRoot(): string {
  return join(process.cwd(), "uploads");
}

function publicRepoRoot(): string {
  return join(process.cwd(), "..");
}

function stagingPath(id: string, extension: string): string {
  return join(uploadsRoot(), `${id}.${extension}`);
}

function absolutePublicPath(publicPath: string): string {
  return join(publicRepoRoot(), ...publicPath.split("/"));
}

function writeBoth(id: string, extension: string, publicPath: string, buffer: Buffer) {
  const staging = stagingPath(id, extension);
  const publicAbs = absolutePublicPath(publicPath);
  mkdirSync(dirname(staging), { recursive: true });
  mkdirSync(dirname(publicAbs), { recursive: true });
  writeFileSync(staging, buffer);
  writeFileSync(publicAbs, buffer);
}

/** Map media bucket → content-type scope used for editor access. */
export async function canAccessMediaBucket(
  user: SessionUser,
  bucket: MediaBucket,
): Promise<boolean> {
  if (isCentreWideViewer(user)) return true;
  if (bucket === "news") return canAccessContentType(user, "news");
  if (bucket === "events") return canAccessContentType(user, "event");
  if (bucket === "covers") return canAccessContentType(user, "publication");
  if (bucket === "partners") return canAccessContentType(user, "partner");
  if (bucket === "alerts") return canAccessContentType(user, "alert");
  if (bucket === "research") {
    return (
      (await canAccessContentType(user, "research_group")) ||
      (await canAccessContentType(user, "research_project"))
    );
  }
  return false;
}

export function canManageMediaAsset(user: SessionUser, asset: MediaAsset): boolean {
  if (isCentreWideViewer(user)) return true;
  return asset.uploaded_by === user.id;
}

export async function listMediaForUser(
  user: SessionUser,
  limit = 100,
  opts?: { bucket?: MediaBucket; imagesOnly?: boolean },
): Promise<MediaAsset[]> {
  const bucket = opts?.bucket;
  if (bucket && !(await canAccessMediaBucket(user, bucket))) {
    return [];
  }

  const allowedBuckets: MediaBucket[] = [];
  for (const b of MEDIA_BUCKETS) {
    if (await canAccessMediaBucket(user, b)) allowedBuckets.push(b);
  }
  if (allowedBuckets.length === 0) return [];
  if (bucket && !allowedBuckets.includes(bucket)) return [];

  const where: string[] = [];
  const params: unknown[] = [];

  if (!isCentreWideViewer(user) && user.role !== "reviewer") {
    params.push(user.id);
    where.push(`m.uploaded_by = $${params.length}`);
  }

  const buckets = bucket ? [bucket] : allowedBuckets;
  params.push(buckets);
  where.push(`m.bucket = ANY($${params.length}::text[])`);

  if (opts?.imagesOnly) {
    where.push(`m.mime_type IN ('image/jpeg', 'image/png', 'image/webp')`);
  }

  where.push(`(m.public_path LIKE 'img/cms/%' OR m.public_path LIKE 'img/covers/%')`);

  params.push(limit);
  const result = await query<MediaAsset>(
    `SELECT m.*,
            u.display_name AS uploader_display_name,
            u.name_ar AS uploader_name_ar,
            u.name_en AS uploader_name_en
     FROM media_assets m
     LEFT JOIN users u ON u.id = m.uploaded_by
     WHERE ${where.join(" AND ")}
     ORDER BY m.updated_at DESC, m.created_at DESC
     LIMIT $${params.length}`,
    params,
  );
  return result.rows;
}

export async function getMediaById(id: string): Promise<MediaAsset | null> {
  const result = await query<MediaAsset>(`SELECT * FROM media_assets WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export async function getMediaByPublicPath(publicPath: string): Promise<MediaAsset | null> {
  const result = await query<MediaAsset>(
    `SELECT * FROM media_assets WHERE public_path = $1`,
    [publicPath],
  );
  return result.rows[0] ?? null;
}

function mimeForExtension(ext: string): string {
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "pdf") return "application/pdf";
  return "application/octet-stream";
}

/**
 * Register on-disk publication covers (`img/covers/*`) into media_assets so the
 * media library lists every book cover, not only CMS uploads under img/cms/covers.
 * Idempotent: skips paths already present.
 */
export async function registerLegacyCoverFiles(fallbackUploaderId: string): Promise<number> {
  const coversDir = join(publicRepoRoot(), "img", "covers");
  if (!existsSync(coversDir)) return 0;

  const files = readdirSync(coversDir).filter((name) =>
    /\.(jpe?g|png|webp|pdf)$/i.test(name),
  );
  if (files.length === 0) return 0;

  let inserted = 0;
  for (const name of files) {
    const publicPath = `img/covers/${name}`;
    const existing = await getMediaByPublicPath(publicPath);
    if (existing) continue;

    const abs = join(coversDir, name);
    let byteSize = 0;
    try {
      byteSize = statSync(abs).size;
    } catch {
      continue;
    }
    if (byteSize <= 0) continue;

    const rawExt = extname(name).slice(1).toLowerCase();
    const extension = rawExt === "jpeg" ? "jpg" : rawExt;
    const mime = mimeForExtension(extension);

    const owner = await query<{ created_by: string; updated_at: Date }>(
      `SELECT created_by, updated_at FROM content_items
       WHERE image_path = $1
          OR og_image = $1
          OR live_payload->>'img' = $1
          OR live_payload->>'cover' = $1
          OR EXISTS (
            SELECT 1
            FROM jsonb_array_elements(COALESCE(attachments, '[]'::jsonb)) elem
            WHERE elem->>'src' = $1
          )
          OR EXISTS (
            SELECT 1
            FROM jsonb_array_elements(COALESCE(live_payload->'media', '[]'::jsonb)) m
            WHERE m->>'src' = $1
          )
       ORDER BY updated_at DESC
       LIMIT 1`,
      [publicPath],
    );
    const uploadedBy = owner.rows[0]?.created_by || fallbackUploaderId;
    const updatedAt = owner.rows[0]?.updated_at ?? null;

    try {
      const result =
        updatedAt != null
          ? await query<{ id: string }>(
              `INSERT INTO media_assets (
                 bucket, original_filename, mime_type, byte_size, extension, public_path, uploaded_by,
                 created_at, updated_at
               ) VALUES (
                 'covers', $1, $2, $3, $4, $5, $6, $7, $7
               )
               ON CONFLICT (public_path) DO NOTHING
               RETURNING id`,
              [name, mime, byteSize, extension, publicPath, uploadedBy, updatedAt],
            )
          : await query<{ id: string }>(
              `INSERT INTO media_assets (
                 bucket, original_filename, mime_type, byte_size, extension, public_path, uploaded_by
               ) VALUES (
                 'covers', $1, $2, $3, $4, $5, $6
               )
               ON CONFLICT (public_path) DO NOTHING
               RETURNING id`,
              [name, mime, byteSize, extension, publicPath, uploadedBy],
            );
      if (result.rows[0]?.id) inserted += 1;
    } catch {
      /* skip unreadable / constraint races */
    }
  }
  return inserted;
}

export async function createMediaUpload(
  user: SessionUser,
  file: File,
  bucketRaw: string,
  opts?: { imagesOnly?: boolean },
): Promise<MediaAsset> {
  if (!isMediaBucket(bucketRaw)) throw new Error("Invalid media bucket");
  if (!(await canAccessMediaBucket(user, bucketRaw))) {
    throw new Error("No permission for this media bucket");
  }
  const validated = await validateUploadFile(file, opts);
  // Pre-generate id via DB default by inserting after we know extension —
  // allocate UUID in SQL RETURNING.
  const result = await query<MediaAsset>(
    `INSERT INTO media_assets (
      bucket, original_filename, mime_type, byte_size, extension, public_path, uploaded_by
    ) VALUES (
      $1, $2, $3, $4, $5, 'pending', $6
    ) RETURNING *`,
    [
      bucketRaw,
      validated.originalFilename,
      validated.mime,
      validated.byteSize,
      validated.extension,
      user.id,
    ],
  );
  const row = result.rows[0];
  const publicPath = publicPathFor(bucketRaw, row.id, validated.extension);
  const updated = await query<MediaAsset>(
    `UPDATE media_assets SET public_path = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [row.id, publicPath],
  );
  writeBoth(row.id, validated.extension, publicPath, validated.buffer);
  const asset = updated.rows[0];
  await writeAudit({
    actor: user,
    action: "media.upload",
    entityType: "media",
    entityId: asset.id,
    summary: `Uploaded ${validated.originalFilename} → ${publicPath}`,
    metadata: {
      bucket: bucketRaw,
      mime: validated.mime,
      byteSize: validated.byteSize,
      publicPath,
    },
  });
  return asset;
}

export async function replaceMediaUpload(
  user: SessionUser,
  mediaId: string,
  file: File,
  opts?: { imagesOnly?: boolean },
): Promise<MediaAsset> {
  const existing = await getMediaById(mediaId);
  if (!existing) throw new Error("Media not found");
  if (!canManageMediaAsset(user, existing)) {
    throw new Error("No permission to replace this media");
  }
  if (!(await canAccessMediaBucket(user, existing.bucket))) {
    throw new Error("No permission for this media bucket");
  }

  const validated = await validateUploadFile(file, opts);
  if (validated.extension !== existing.extension) {
    throw new Error(
      `Replace must keep the same file type (.${existing.extension}); upload a new file instead`,
    );
  }

  writeBoth(existing.id, existing.extension, existing.public_path, validated.buffer);

  const result = await query<MediaAsset>(
    `UPDATE media_assets SET
      original_filename = $2,
      mime_type = $3,
      byte_size = $4,
      uploaded_by = $5,
      replaced_at = NOW(),
      updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [mediaId, validated.originalFilename, validated.mime, validated.byteSize, user.id],
  );
  const asset = result.rows[0];
  await writeAudit({
    actor: user,
    action: "media.replace",
    entityType: "media",
    entityId: asset.id,
    summary: `Replaced media at ${asset.public_path}`,
    metadata: {
      mime: validated.mime,
      byteSize: validated.byteSize,
      publicPath: asset.public_path,
    },
  });
  return asset;
}

/** Ensure public file exists (e.g. after clone); copy from staging if needed. */
export function ensurePublicMediaFile(asset: MediaAsset): void {
  const publicAbs = absolutePublicPath(asset.public_path);
  if (existsSync(publicAbs)) return;
  const staging = stagingPath(asset.id, asset.extension);
  if (!existsSync(staging)) {
    throw new Error(`Media file missing for ${asset.public_path}`);
  }
  mkdirSync(dirname(publicAbs), { recursive: true });
  copyFileSync(staging, publicAbs);
}

function unlinkIfExists(absPath: string): void {
  try {
    if (existsSync(absPath)) unlinkSync(absPath);
  } catch {
    /* best-effort; row already removed */
  }
}

/**
 * Hard-delete media when unreferenced (design D1/D2/D3=A).
 * Throws MediaInUseError when durable refs remain; no SA force-delete.
 */
export async function deleteMediaAsset(
  user: SessionUser,
  mediaId: string,
): Promise<{ id: string; publicPath: string }> {
  const existing = await getMediaById(mediaId);
  if (!existing) throw new Error("Media not found");
  if (!canManageMediaAsset(user, existing)) {
    throw new Error("No permission to delete this media");
  }
  if (!(await canAccessMediaBucket(user, existing.bucket))) {
    throw new Error("No permission for this media bucket");
  }

  const references = await listMediaReferences(existing.public_path);
  if (references.length > 0) {
    throw new MediaInUseError(existing.public_path, references);
  }

  await query(`DELETE FROM media_assets WHERE id = $1`, [mediaId]);

  unlinkIfExists(stagingPath(existing.id, existing.extension));
  unlinkIfExists(absolutePublicPath(existing.public_path));

  await writeAudit({
    actor: user,
    action: "media.delete",
    entityType: "media",
    entityId: existing.id,
    summary: `Deleted media ${existing.public_path}`,
    metadata: {
      bucket: existing.bucket,
      publicPath: existing.public_path,
      originalFilename: existing.original_filename,
    },
  });

  return { id: existing.id, publicPath: existing.public_path };
}

export type { ValidatedUpload };
