import { randomBytes } from "node:crypto";
import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { canViewContentItem, getContentMeta } from "@/lib/content/revisions";
import { getNewsById } from "@/lib/content/news";
import { getEventById } from "@/lib/content/events";
import { getPublicationById } from "@/lib/content/publications";
import { getPartnerById } from "@/lib/content/partners";
import { getAlertById } from "@/lib/content/alerts";
import { getResearchGroupById } from "@/lib/content/researchGroups";
import { getResearchProjectById } from "@/lib/content/researchProjects";
import { getLawById } from "@/lib/content/laws";
import { getPlatformById } from "@/lib/content/platforms";
import { buildNewsPayloadForItem } from "@/lib/publish/newsJson";
import { buildEventPayloadForItem } from "@/lib/publish/eventsJson";
import { buildPublicationPayload } from "@/lib/publish/publicationsJson";
import { buildPartnerPayload } from "@/lib/publish/partnersJson";
import { buildAlertPayload } from "@/lib/publish/alertsJson";
import { buildResearchGroupPayload } from "@/lib/publish/researchGroupsJson";
import { buildResearchProjectPayload } from "@/lib/publish/researchProjectsJson";
import { buildLawPayload } from "@/lib/publish/lawsJson";
import { buildPlatformPayload } from "@/lib/publish/platformsJson";

export const PREVIEW_TTL_MS = 30 * 60 * 1000;

export type PreviewContentType =
  | "news"
  | "event"
  | "publication"
  | "partner"
  | "alert"
  | "research_group"
  | "research_project"
  | "law"
  | "platform";

const PREVIEW_TYPES = new Set<PreviewContentType>([
  "news",
  "event",
  "publication",
  "partner",
  "alert",
  "research_group",
  "research_project",
  "law",
  "platform",
]);

export type PreviewRecord = {
  token: string;
  content_type: PreviewContentType;
  content_item_id: string;
  payload: Record<string, unknown>;
  expires_at: Date;
};

function publicSiteBase(): string {
  const configured = (process.env.PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") return "http://localhost:5500";
  return "";
}

export function isPublicSiteConfigured(): boolean {
  return Boolean((process.env.PUBLIC_SITE_URL || "").trim());
}

export function getPublicSiteBaseForClient(): {
  baseUrl: string | null;
  configured: boolean;
  usingDevFallback: boolean;
} {
  const configured = isPublicSiteConfigured();
  const base = publicSiteBase();
  return {
    baseUrl: base || null,
    configured,
    usingDevFallback: !configured && Boolean(base),
  };
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
    return (await buildNewsPayloadForItem(row)) as unknown as Record<string, unknown>;
  }
  if (contentType === "event") {
    const row = await getEventById(id);
    if (!row) return null;
    return (await buildEventPayloadForItem(row)) as unknown as Record<string, unknown>;
  }
  if (contentType === "publication") {
    const row = await getPublicationById(id);
    if (!row) return null;
    return buildPublicationPayload(row) as unknown as Record<string, unknown>;
  }
  if (contentType === "partner") {
    const row = await getPartnerById(id);
    if (!row) return null;
    return buildPartnerPayload(row) as unknown as Record<string, unknown>;
  }
  if (contentType === "alert") {
    const row = await getAlertById(id);
    if (!row) return null;
    return buildAlertPayload(row) as unknown as Record<string, unknown>;
  }
  if (contentType === "research_group") {
    const row = await getResearchGroupById(id);
    if (!row) return null;
    return buildResearchGroupPayload(row) as unknown as Record<string, unknown>;
  }
  if (contentType === "research_project") {
    const row = await getResearchProjectById(id);
    if (!row) return null;
    return buildResearchProjectPayload(row) as unknown as Record<string, unknown>;
  }
  if (contentType === "law") {
    const row = await getLawById(id);
    if (!row) return null;
    return buildLawPayload(row) as unknown as Record<string, unknown>;
  }
  if (contentType === "platform") {
    const row = await getPlatformById(id);
    if (!row) return null;
    return buildPlatformPayload(row) as unknown as Record<string, unknown>;
  }
  return null;
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
  siteConfigured: boolean;
  usingDevFallback: boolean;
}> {
  const itemMeta = await getContentMeta(contentItemId);
  if (!itemMeta) throw new Error("Not found");
  if (!(await canViewContentItem(user, itemMeta))) throw new Error("Forbidden");

  const contentType = itemMeta.content_type as PreviewContentType;
  if (!PREVIEW_TYPES.has(contentType)) {
    throw new Error("Preview is not available for this content type");
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
  const site = getPublicSiteBaseForClient();
  return {
    token,
    contentType,
    expiresAt: expiresAt.toISOString(),
    hash,
    publicUrl: site.baseUrl ? `${site.baseUrl}${hash}` : null,
    siteConfigured: site.configured,
    usingDevFallback: site.usingDevFallback,
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
