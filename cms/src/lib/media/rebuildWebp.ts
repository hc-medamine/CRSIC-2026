import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { collectContentImagePaths } from "@/lib/media/publishImages";
import { writeWebpSibling } from "@/lib/media/webp";
import type { ContentType } from "@/lib/content/lifecycle";
import { rebuildPublicAlertsJson } from "@/lib/publish/alertsJson";
import { rebuildPublicEventsJson } from "@/lib/publish/eventsJson";
import { rebuildPublicLawsJson } from "@/lib/publish/lawsJson";
import { rebuildPublicNewsJson } from "@/lib/publish/newsJson";
import { rebuildPublicPartnersJson } from "@/lib/publish/partnersJson";
import { rebuildPublicPlatformsJson } from "@/lib/publish/platformsJson";
import { rebuildPublicPublicationsJson } from "@/lib/publish/publicationsJson";
import { rebuildPublicResearchGroupsJson } from "@/lib/publish/researchGroupsJson";
import { rebuildPublicResearchProjectsJson } from "@/lib/publish/researchProjectsJson";

type RebuildFn = () => Promise<unknown>;

const REBUILD_BY_TYPE: Partial<Record<ContentType, RebuildFn>> = {
  news: rebuildPublicNewsJson,
  event: rebuildPublicEventsJson,
  publication: rebuildPublicPublicationsJson,
  partner: rebuildPublicPartnersJson,
  alert: rebuildPublicAlertsJson,
  law: rebuildPublicLawsJson,
  platform: rebuildPublicPlatformsJson,
  research_group: rebuildPublicResearchGroupsJson,
  research_project: rebuildPublicResearchProjectsJson,
};

const CONTENT_TYPE_SQL: Partial<Record<ContentType, string>> = {
  news: "news",
  event: "event",
  publication: "publication",
  partner: "partner",
  alert: "alert",
  law: "law",
  platform: "platform",
  research_group: "research_group",
  research_project: "research_project",
};

type ImageRow = {
  image_path: string | null;
  image_card_path: string | null;
  og_image: string | null;
  attachments: unknown;
};

/** Super Admin: generate WebP siblings for every image on published rows of a type, then rebuild JSON. */
export async function rebuildWebpForContentType(
  _user: SessionUser,
  contentType: ContentType,
): Promise<{ pathsWritten: number; rebuild: unknown }> {
  const sqlType = CONTENT_TYPE_SQL[contentType];
  const rebuild = REBUILD_BY_TYPE[contentType];
  if (!sqlType || !rebuild) {
    throw new Error("WebP rebuild is not supported for this content type");
  }

  const result = await query<ImageRow>(
    `SELECT image_path, image_card_path, og_image, attachments
     FROM content_items
     WHERE content_type = $1 AND live_payload IS NOT NULL`,
    [sqlType],
  );

  const seen = new Set<string>();
  let pathsWritten = 0;

  for (const row of result.rows) {
    for (const p of collectContentImagePaths(row)) {
      if (seen.has(p)) continue;
      seen.add(p);
      const wp = await writeWebpSibling(p);
      if (wp) pathsWritten += 1;
    }
  }

  if (contentType === "publication") {
    const covers = await query<{ cover: string | null }>(
      `SELECT live_payload->>'cover' AS cover
       FROM content_items
       WHERE content_type = 'publication' AND live_payload IS NOT NULL`,
    );
    for (const row of covers.rows) {
      const cover = row.cover?.trim();
      if (!cover || seen.has(cover)) continue;
      seen.add(cover);
      const wp = await writeWebpSibling(cover);
      if (wp) pathsWritten += 1;
    }
  }

  const rebuildResult = await rebuild();
  return { pathsWritten, rebuild: rebuildResult };
}

/** Director portrait WebP sibling count (caller rewrites director.json). */
export async function rebuildWebpForDirector(): Promise<{ pathsWritten: number }> {
  const result = await query<{ portrait_path: string | null }>(
    `SELECT portrait_path FROM site_director WHERE id = 1`,
  );
  const portrait = result.rows[0]?.portrait_path?.trim();
  if (!portrait) return { pathsWritten: 0 };
  const wp = await writeWebpSibling(portrait);
  return { pathsWritten: wp ? 1 : 0 };
}
