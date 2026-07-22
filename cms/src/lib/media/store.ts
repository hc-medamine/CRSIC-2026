import { mkdirSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { canAccessContentType, isCentreWideViewer } from "@/lib/content/permissions";
import {
  isMediaBucket,
  publicPathFor,
  type MediaBucket,
} from "@/lib/media/config";
import { validateUploadFile, type ValidatedUpload } from "@/lib/media/validate";

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
  return false;
}

export function canManageMediaAsset(user: SessionUser, asset: MediaAsset): boolean {
  if (isCentreWideViewer(user)) return true;
  return asset.uploaded_by === user.id;
}

export async function listMediaForUser(
  user: SessionUser,
  limit = 100,
): Promise<MediaAsset[]> {
  if (isCentreWideViewer(user)) {
    const result = await query<MediaAsset>(
      `SELECT * FROM media_assets ORDER BY created_at DESC LIMIT $1`,
      [limit],
    );
    return result.rows;
  }
  const result = await query<MediaAsset>(
    `SELECT * FROM media_assets
     WHERE uploaded_by = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [user.id, limit],
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

export type { ValidatedUpload };
