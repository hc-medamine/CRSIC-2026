/**
 * Import seed data/laws.json + data/platforms.json into CMS as published
 * items with live_payload (idempotent on public_slug).
 *
 * Usage: npm run db:import:laws-platforms
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { buildLawPayload } from "../src/lib/publish/lawsJson";
import { buildPlatformPayload } from "../src/lib/publish/platformsJson";
import { rebuildPublicLawsJson } from "../src/lib/publish/lawsJson";
import { rebuildPublicPlatformsJson } from "../src/lib/publish/platformsJson";

type SeedLaw = {
  id?: string;
  slug: string;
  title: string;
  titleEn?: string;
  summary?: string;
  summaryEn?: string;
  body?: string;
  bodyEn?: string;
  img?: string;
  media?: { kind: string; src: string; alt?: string }[];
  externalUrl?: string;
};

type SeedPlatform = SeedLaw & { kind: "visual" | "radio" | "mobility" };

function mediaToAttachments(
  media: SeedLaw["media"],
  img?: string,
): { kind: string; src: string; alt?: string }[] {
  if (Array.isArray(media) && media.length > 0) return media;
  if (img?.trim()) return [{ kind: "image", src: img.trim() }];
  return [];
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL required");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();
  const root = join(process.cwd(), "..");
  const lawsFile = JSON.parse(readFileSync(join(root, "data", "laws.json"), "utf8")) as {
    laws: SeedLaw[];
  };
  const platformsFile = JSON.parse(
    readFileSync(join(root, "data", "platforms.json"), "utf8"),
  ) as { platforms: SeedPlatform[] };

  const sa = await client.query<{ id: string }>(
    `SELECT id FROM users WHERE role = 'super_admin' AND is_active = TRUE ORDER BY created_at ASC LIMIT 1`,
  );
  const actorId = sa.rows[0]?.id;
  if (!actorId) throw new Error("No active Super Admin");

  const centre = await client.query(`SELECT id FROM org_units WHERE id = 'centre_wide'`);
  if (!centre.rows[0]) throw new Error("centre_wide org unit missing");

  let lawsInserted = 0;
  let lawsSkipped = 0;
  let platformsInserted = 0;
  let platformsSkipped = 0;

  try {
    await client.query("BEGIN");

    for (const seed of lawsFile.laws ?? []) {
      const slug = seed.slug?.trim();
      if (!slug) continue;
      const exists = await client.query(
        `SELECT id FROM content_items WHERE content_type = 'law' AND public_slug = $1`,
        [slug],
      );
      if (exists.rows[0]) {
        lawsSkipped += 1;
        continue;
      }
      const id = randomUUID();
      const attachments = mediaToAttachments(seed.media, seed.img);
      const payload = buildLawPayload({
        id,
        title_ar: seed.title,
        title_en: seed.titleEn ?? null,
        summary_ar: seed.summary ?? null,
        summary_en: seed.summaryEn ?? null,
        body_ar: seed.body ?? null,
        body_en: seed.bodyEn ?? null,
        image_path: seed.img ?? null,
        external_url: seed.externalUrl ?? null,
        attachments,
        public_slug: slug,
      });
      await client.query(
        `INSERT INTO content_items (
          id, content_type, status, org_unit_id, created_by, updated_by, en_status,
          title_ar, title_en, summary_ar, summary_en, body_ar, body_en,
          image_path, external_url, attachments, public_slug,
          live_payload, live_at, published_at, checklist_confirmed
        ) VALUES (
          $1, 'law', 'published', 'centre_wide', $2, $2, $3,
          $4, $5, $6, $7, $8, $9,
          $10, $11, $12::jsonb, $13,
          $14::jsonb, NOW(), NOW(), TRUE
        )`,
        [
          id,
          actorId,
          seed.titleEn?.trim() ? "ready" : "pending",
          seed.title.trim(),
          seed.titleEn?.trim() || null,
          seed.summary?.trim() || null,
          seed.summaryEn?.trim() || null,
          seed.body ?? null,
          seed.bodyEn ?? null,
          seed.img?.trim() || null,
          seed.externalUrl?.trim() || null,
          JSON.stringify(attachments),
          slug,
          JSON.stringify(payload),
        ],
      );
      lawsInserted += 1;
      console.log(`+ law ${slug}`);
    }

    for (const seed of platformsFile.platforms ?? []) {
      const slug = seed.slug?.trim();
      if (!slug) continue;
      const exists = await client.query(
        `SELECT id FROM content_items WHERE content_type = 'platform' AND public_slug = $1`,
        [slug],
      );
      if (exists.rows[0]) {
        platformsSkipped += 1;
        continue;
      }
      const id = randomUUID();
      const attachments = mediaToAttachments(seed.media, seed.img);
      const kind = seed.kind || "visual";
      const payload = buildPlatformPayload({
        id,
        title_ar: seed.title,
        title_en: seed.titleEn ?? null,
        summary_ar: seed.summary ?? null,
        summary_en: seed.summaryEn ?? null,
        body_ar: seed.body ?? null,
        body_en: seed.bodyEn ?? null,
        image_path: seed.img ?? null,
        external_url: seed.externalUrl ?? null,
        platform_kind: kind,
        attachments,
        public_slug: slug,
      });
      await client.query(
        `INSERT INTO content_items (
          id, content_type, status, org_unit_id, created_by, updated_by, en_status,
          title_ar, title_en, summary_ar, summary_en, body_ar, body_en,
          image_path, external_url, platform_kind, attachments, public_slug,
          live_payload, live_at, published_at, checklist_confirmed
        ) VALUES (
          $1, 'platform', 'published', 'centre_wide', $2, $2, $3,
          $4, $5, $6, $7, $8, $9,
          $10, $11, $12, $13::jsonb, $14,
          $15::jsonb, NOW(), NOW(), TRUE
        )`,
        [
          id,
          actorId,
          seed.titleEn?.trim() ? "ready" : "pending",
          seed.title.trim(),
          seed.titleEn?.trim() || null,
          seed.summary?.trim() || null,
          seed.summaryEn?.trim() || null,
          seed.body ?? null,
          seed.bodyEn ?? null,
          seed.img?.trim() || null,
          seed.externalUrl?.trim() || null,
          kind,
          JSON.stringify(attachments),
          slug,
          JSON.stringify(payload),
        ],
      );
      platformsInserted += 1;
      console.log(`+ platform ${slug}`);
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  // Rebuild via app query pool (uses DATABASE_URL from env in lib/db)
  const lawsRebuild = await rebuildPublicLawsJson();
  const platformsRebuild = await rebuildPublicPlatformsJson();
  await pool.end();

  console.log(
    `Done. laws +${lawsInserted}/skip ${lawsSkipped}; platforms +${platformsInserted}/skip ${platformsSkipped}`,
  );
  console.log(`Rebuilt ${lawsRebuild.path} (${lawsRebuild.count}); ${platformsRebuild.path} (${platformsRebuild.count})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
