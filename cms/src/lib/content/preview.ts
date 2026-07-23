import { randomBytes } from "node:crypto";
import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { canViewContentItem, getContentMeta } from "@/lib/content/revisions";
import { getNewsById } from "@/lib/content/news";
import { getEventById } from "@/lib/content/events";
import { getPublicationById } from "@/lib/content/publications";
import { buildNewsPayload } from "@/lib/publish/newsJson";
import { buildEventPayload } from "@/lib/publish/eventsJson";
import { buildPublicationPayload } from "@/lib/publish/publicationsJson";

export const PREVIEW_TTL_MS = 30 * 60 * 1000;

export type PreviewContentType = "news" | "event" | "publication";

export type PreviewRecord = {
  token: string;
  content_type: PreviewContentType;
  content_item_id: string;
  payload: Record<string, unknown>;
  expires_at: Date;
};

function publicSiteBase(): string {
  return (process.env.PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
}

async function purgeExpired(): Promise<void> {
  await query(`DELETE FROM preview_tokens WHERE expires_at < NOW()`);
}

async function buildCandidatePayload(
  contentType: PreviewContentType,
  id: string,
): Promise<Record<string, unknown> | null> {
  if (contentType === "news") {
    const row = await getNewsById(id);
    if (!row) return null;
    return buildNewsPayload(row) as unknown as Record<string, unknown>;
  }
  if (contentType === "event") {
    const row = await getEventById(id);
    if (!row) return null;
    return buildEventPayload(row) as unknown as Record<string, unknown>;
  }
  const row = await getPublicationById(id);
  if (!row) return null;
  return buildPublicationPayload(row) as unknown as Record<string, unknown>;
}

/**
 * Create a short-lived preview token for an item the user may view.
 * Does not mutate live_payload or public JSON.
 */
export async function createPreviewToken(
  user: SessionUser,
  contentItemId: string,
  meta?: { ip?: string | null; userAgent?: string | null },
): Promise<{
  token: string;
  contentType: PreviewContentType;
  expiresAt: string;
  hash: string;
  publicUrl: string | null;
}> {
  const itemMeta = await getContentMeta(contentItemId);
  if (!itemMeta) throw new Error("Not found");
  if (!(await canViewContentItem(user, itemMeta))) throw new Error("Forbidden");

  const contentType = itemMeta.content_type as PreviewContentType;
  if (contentType !== "news" && contentType !== "event" && contentType !== "publication") {
    throw new Error("Preview is only available for news, events, and publications");
  }

  const payload = await buildCandidatePayload(contentType, contentItemId);
  if (!payload) throw new Error("Not found");

  await purgeExpired();

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + PREVIEW_TTL_MS);

  await query(
    `INSERT INTO preview_tokens (token, content_type, content_item_id, payload, created_by, expires_at)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6)`,
    [token, contentType, contentItemId, JSON.stringify(payload), user.id, expiresAt],
  );

  await writeAudit({
    actor: user,
    action: `${contentType}.preview`,
    entityType: contentType,
    entityId: contentItemId,
    summary: `Opened public SPA preview (${contentType})`,
    metadata: { tokenSuffix: token.slice(-8), expiresAt: expiresAt.toISOString() },
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });

  const hash = `#preview/${token}`;
  const base = publicSiteBase();
  return {
    token,
    contentType,
    expiresAt: expiresAt.toISOString(),
    hash,
    publicUrl: base ? `${base}${hash}` : null,
  };
}

/** Public resolve — token is the credential. Returns null if missing/expired. */
export async function resolvePreviewToken(token: string): Promise<PreviewRecord | null> {
  const raw = token?.trim();
  if (!raw || raw.length > 128) return null;

  const result = await query<PreviewRecord>(
    `SELECT token, content_type, content_item_id, payload, expires_at
     FROM preview_tokens
     WHERE token = $1 AND expires_at > NOW()`,
    [raw],
  );
  const row = result.rows[0];
  if (!row) return null;
  return row;
}
