import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { pruneFeaturedNewsItem } from "@/lib/content/featuredNews";
import type { ContentType } from "@/lib/content/lifecycle";
import { purgeMediaIfUnreferenced } from "@/lib/media/store";
import type { RecycleBinClientRow } from "@/lib/content/recycleBinTypes";

export type { RecycleBinClientRow } from "@/lib/content/recycleBinTypes";

export const RECYCLE_STALE_DAYS = 90;

const ELIGIBLE = new Set(["unpublished", "rejected"]);

export type RecycleBinRow = {
  id: string;
  content_type: ContentType;
  title_ar: string;
  recycled_from_status: string;
  recycled_at: Date;
  recycled_by: string | null;
};

type ItemRow = {
  id: string;
  content_type: ContentType;
  status: string;
  title_ar: string;
  image_path: string | null;
  og_image: string | null;
  attachments: unknown;
  recycled_at: Date | null;
  recycled_from_status: string | null;
};

export function isRecycleEligibleStatus(status: string): boolean {
  return ELIGIBLE.has(status);
}

export function isStaleRecycled(recycledAt: Date, now = new Date()): boolean {
  return now.getTime() - recycledAt.getTime() > RECYCLE_STALE_DAYS * 24 * 60 * 60 * 1000;
}

export function collectMediaPaths(item: {
  image_path?: string | null;
  og_image?: string | null;
  attachments?: unknown;
}): string[] {
  const out = new Set<string>();
  for (const p of [item.image_path, item.og_image]) {
    if (p && typeof p === "string" && p.startsWith("img/")) out.add(p);
  }
  if (Array.isArray(item.attachments)) {
    for (const entry of item.attachments) {
      if (!entry || typeof entry !== "object") continue;
      const src = (entry as { src?: unknown }).src;
      if (typeof src === "string" && src.startsWith("img/")) out.add(src);
    }
  }
  return [...out];
}

function assertSuperAdmin(user: SessionUser) {
  if (user.role !== "super_admin") {
    throw new Error("Super Admin role required");
  }
}

async function loadItem(id: string): Promise<ItemRow | null> {
  const result = await query<ItemRow>(
    `SELECT id, content_type, status, title_ar, image_path, og_image, attachments,
            recycled_at, recycled_from_status
     FROM content_items WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function recycleContentItem(user: SessionUser, id: string): Promise<ContentType> {
  assertSuperAdmin(user);
  const item = await loadItem(id);
  if (!item) throw new Error("Not found");
  if (item.recycled_at) throw new Error("Item is already in the recycle bin");
  if (!isRecycleEligibleStatus(item.status)) {
    throw new Error("Only unpublished or rejected items can be moved to the recycle bin");
  }

  await query(
    `UPDATE content_items SET
       recycled_at = NOW(),
       recycled_by = $2,
       recycled_from_status = $3,
       live_payload = NULL,
       live_at = NULL,
       updated_by = $2,
       updated_at = NOW()
     WHERE id = $1`,
    [id, user.id, item.status],
  );

  if (item.content_type === "news") {
    await pruneFeaturedNewsItem(id);
  }

  await writeAudit({
    actor: user,
    action: `${item.content_type}.recycle`,
    entityType: item.content_type,
    entityId: id,
    summary: `Moved ${item.status} item to recycle bin — ${item.title_ar}`,
    metadata: { title: item.title_ar, status: item.status },
  });

  return item.content_type;
}

export async function restoreRecycledItem(user: SessionUser, id: string): Promise<ContentType> {
  assertSuperAdmin(user);
  const item = await loadItem(id);
  if (!item) throw new Error("Not found");
  if (!item.recycled_at) throw new Error("Item is not in the recycle bin");

  await query(
    `UPDATE content_items SET
       status = 'draft',
       recycled_at = NULL,
       recycled_by = NULL,
       recycled_from_status = NULL,
       updated_by = $2,
       updated_at = NOW()
     WHERE id = $1`,
    [id, user.id],
  );

  await writeAudit({
    actor: user,
    action: `${item.content_type}.restore`,
    entityType: item.content_type,
    entityId: id,
    summary: `Restored from recycle bin as draft — ${item.title_ar}`,
    metadata: {
      title: item.title_ar,
      fromStatus: item.recycled_from_status ?? item.status,
    },
  });

  return item.content_type;
}

async function purgeOne(user: SessionUser, item: ItemRow): Promise<void> {
  const paths = collectMediaPaths(item);
  await writeAudit({
    actor: user,
    action: `${item.content_type}.delete`,
    entityType: item.content_type,
    entityId: item.id,
    summary: `Permanently deleted from recycle bin — ${item.title_ar}`,
    metadata: {
      title: item.title_ar,
      fromStatus: item.recycled_from_status ?? item.status,
    },
  });
  await query(`DELETE FROM content_items WHERE id = $1`, [item.id]);
  if (item.content_type === "news") {
    await pruneFeaturedNewsItem(item.id);
  }
  for (const path of paths) {
    await purgeMediaIfUnreferenced(user, path);
  }
}

export async function purgeRecycledItem(user: SessionUser, id: string): Promise<ContentType> {
  assertSuperAdmin(user);
  const item = await loadItem(id);
  if (!item) throw new Error("Not found");
  if (!item.recycled_at) throw new Error("Item is not in the recycle bin");
  await purgeOne(user, item);
  return item.content_type;
}

export async function listRecycleBin(user: SessionUser): Promise<{
  items: RecycleBinRow[];
  staleIds: string[];
}> {
  assertSuperAdmin(user);
  const result = await query<RecycleBinRow>(
    `SELECT id, content_type, title_ar, recycled_from_status, recycled_at, recycled_by
     FROM content_items
     WHERE recycled_at IS NOT NULL
     ORDER BY recycled_at DESC`,
  );
  const items = result.rows;
  const staleIds = items.filter((row) => isStaleRecycled(row.recycled_at)).map((row) => row.id);
  return { items, staleIds };
}

export async function emptyRecycleBin(user: SessionUser): Promise<number> {
  const { items } = await listRecycleBin(user);
  for (const row of items) {
    await purgeRecycledItem(user, row.id);
  }
  return items.length;
}

export async function purgeStaleRecycleBin(user: SessionUser): Promise<number> {
  const { staleIds } = await listRecycleBin(user);
  for (const id of staleIds) {
    await purgeRecycledItem(user, id);
  }
  return staleIds.length;
}

export function toRecycleBinClientRows(items: RecycleBinRow[]): RecycleBinClientRow[] {
  return items.map((row) => ({
    id: row.id,
    contentType: row.content_type,
    titleAr: row.title_ar,
    recycledFromStatus: row.recycled_from_status,
    recycledAt: new Date(row.recycled_at).toISOString(),
  }));
}
