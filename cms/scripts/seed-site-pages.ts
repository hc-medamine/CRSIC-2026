/**
 * Seed a draft content_items row for each static page (about, cooperation, org, contact)
 * from data/locales/{ar,en}.json, so editors have a starting point in the CMS instead of an
 * empty form. Rows are created as **draft** — publishing (and therefore overwriting
 * data/site-copy.json) stays an intentional CMS action; until then the public SPA keeps
 * showing the locales/*.json fallback copy untouched.
 *
 * Idempotent: skips any page_key that already has a content_items row (any status).
 *
 * Usage: npm run db:seed:site-pages
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { query } from "../src/lib/db";
import {
  PAGE_FIELD_KEYS,
  PAGE_KEYS,
  PAGE_KEY_LABELS,
  type PageKey,
} from "../src/lib/content/pageKeys";

const SUPER_ADMIN_EMAIL = "f.chettih@crsic.dz";

function dataPath(name: string): string {
  return join(process.cwd(), "..", "data", name);
}

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(dataPath(name), "utf8")) as T;
}

async function getCentreWideOrgId(): Promise<string> {
  const byKind = await query<{ id: string }>(
    `SELECT id FROM org_units WHERE kind = 'centre_wide' ORDER BY sort_order LIMIT 1`,
  );
  if (byKind.rows[0]) return byKind.rows[0].id;
  const byId = await query<{ id: string }>(
    `SELECT id FROM org_units WHERE id = 'centre_wide' LIMIT 1`,
  );
  if (byId.rows[0]) return byId.rows[0].id;
  throw new Error("No centre-wide org unit found (run migrations / seed org units first)");
}

async function getSuperAdminId(): Promise<string> {
  const res = await query<{ id: string }>(`SELECT id FROM users WHERE email = $1`, [
    SUPER_ADMIN_EMAIL,
  ]);
  if (!res.rows[0]) {
    throw new Error(
      `Super admin ${SUPER_ADMIN_EMAIL} not found — run npm run db:seed:super-admin first`,
    );
  }
  return res.rows[0].id;
}

async function pageKeyExists(pageKey: PageKey): Promise<boolean> {
  const res = await query(
    `SELECT 1 FROM content_items WHERE content_type = 'page' AND page_key = $1 LIMIT 1`,
    [pageKey],
  );
  return (res.rowCount ?? 0) > 0;
}

function extractFields(pageKey: PageKey, dict: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of PAGE_FIELD_KEYS[pageKey]) {
    const value = dict[key];
    if (typeof value === "string" && value.trim()) out[key] = value.trim();
  }
  return out;
}

async function main() {
  const ar = readJson<Record<string, unknown>>("locales/ar.json");
  const en = readJson<Record<string, unknown>>("locales/en.json");
  const orgUnitId = await getCentreWideOrgId();
  const createdBy = await getSuperAdminId();

  let created = 0;
  let skipped = 0;

  for (const pageKey of PAGE_KEYS) {
    if (await pageKeyExists(pageKey)) {
      console.log(`skip ${pageKey}: content_items row already exists`);
      skipped += 1;
      continue;
    }

    const labels = PAGE_KEY_LABELS[pageKey];
    const pageFields = {
      ar: extractFields(pageKey, ar),
      en: extractFields(pageKey, en),
    };
    const enStatus = Object.keys(pageFields.en).length > 0 ? "ready" : "pending";

    await query(
      `INSERT INTO content_items (
         content_type, status, org_unit_id, created_by, updated_by, en_status,
         title_ar, title_en, page_key, page_fields
       ) VALUES (
         'page', 'draft', $1, $2, $2, $3,
         $4, $5, $6, $7::jsonb
       )`,
      [orgUnitId, createdBy, enStatus, labels.ar, labels.en, pageKey, JSON.stringify(pageFields)],
    );
    console.log(`seeded draft page "${pageKey}" from locales (${Object.keys(pageFields.ar).length} AR keys)`);
    created += 1;
  }

  console.log(`Static pages seed complete: created ${created}, skipped ${skipped} (already exist).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("SEED FAIL", err);
    process.exit(1);
  });
