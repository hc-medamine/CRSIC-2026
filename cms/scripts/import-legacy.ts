/**
 * Import current public JSON (data/news.json, data/events.json, data/publications.json)
 * into content_items as PUBLISHED rows with live_payload set (Step 4, gap #9 — legacy cutover).
 *
 * - Does NOT rewrite the public JSON files (payloads already match the source).
 * - Idempotent-ish: skips a row if a published item with the same title_ar + content_type exists.
 * - org_unit = centre-wide (looked up from org_units); created_by = super admin f.chettih@crsic.dz.
 * - Keeps publications covers.length === pubs.length (imports pubs[i] with covers[i]).
 *
 * Usage: npm run db:import-legacy
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { query } from "../src/lib/db";

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

async function alreadyPublished(contentType: string, titleAr: string): Promise<boolean> {
  const res = await query(
    `SELECT 1 FROM content_items
     WHERE content_type = $1 AND title_ar = $2 AND status = 'published' LIMIT 1`,
    [contentType, titleAr],
  );
  return (res.rowCount ?? 0) > 0;
}

async function insertPublished(row: {
  contentType: "news" | "event" | "publication";
  orgUnitId: string;
  createdBy: string;
  titleAr: string;
  labelAr?: string | null;
  summaryAr?: string | null;
  imagePath?: string | null;
  pubKind?: "collective" | "individual" | null;
  eventScope?: "intl" | "nat" | null;
  eventDay?: string | null;
  eventMonth?: string | null;
  eventYear?: string | null;
  eventTypeAr?: string | null;
  eventDisplayStatus?: "upcoming" | "done" | null;
  payload: unknown;
}) {
  await query(
    `INSERT INTO content_items (
       content_type, status, org_unit_id, created_by, updated_by, en_status,
       title_ar, label_ar, summary_ar, image_path, pub_kind,
       event_scope, event_day, event_month, event_year, event_type_ar, event_display_status,
       checklist_confirmed, published_at, live_payload, live_at
     ) VALUES (
       $1, 'published', $2, $3, $3, 'pending',
       $4, $5, $6, $7, $8,
       $9, $10, $11, $12, $13, $14,
       TRUE, NOW(), $15::jsonb, NOW()
     )`,
    [
      row.contentType,
      row.orgUnitId,
      row.createdBy,
      row.titleAr,
      row.labelAr ?? null,
      row.summaryAr ?? null,
      row.imagePath ?? null,
      row.pubKind ?? null,
      row.eventScope ?? null,
      row.eventDay ?? null,
      row.eventMonth ?? null,
      row.eventYear ?? null,
      row.eventTypeAr ?? null,
      row.eventDisplayStatus ?? null,
      JSON.stringify(row.payload),
    ],
  );
}

type LegacyNews = { news: Array<{ img: string | null; label: string; title: string }> };
type LegacyEvent = {
  day: string;
  month: string;
  year: string;
  title: string;
  type: string;
  status: "done" | "upcoming";
  img?: string;
};
type LegacyEvents = { intl: LegacyEvent[]; nat: LegacyEvent[] };
type LegacyPubs = {
  pubs: Array<{ t: string; type: "collective" | "individual"; dept: string; desc: string }>;
  covers: string[];
};

async function importNews(orgUnitId: string, createdBy: string) {
  const { news } = readJson<LegacyNews>("news.json");
  let inserted = 0;
  let skipped = 0;
  for (const n of news) {
    const title = n.title.trim();
    if (!title) continue;
    if (await alreadyPublished("news", title)) {
      skipped += 1;
      continue;
    }
    await insertPublished({
      contentType: "news",
      orgUnitId,
      createdBy,
      titleAr: title,
      labelAr: n.label?.trim() || null,
      imagePath: n.img ?? null,
      payload: { img: n.img ?? null, label: n.label?.trim() || "خبر", title },
    });
    inserted += 1;
  }
  console.log(`news: inserted ${inserted}, skipped ${skipped} (already published)`);
}

async function importEvents(orgUnitId: string, createdBy: string) {
  const events = readJson<LegacyEvents>("events.json");
  let inserted = 0;
  let skipped = 0;
  for (const scope of ["intl", "nat"] as const) {
    for (const e of events[scope] ?? []) {
      const title = e.title.trim();
      if (!title) continue;
      if (await alreadyPublished("event", title)) {
        skipped += 1;
        continue;
      }
      const payload: Record<string, unknown> = {
        day: e.day,
        month: e.month,
        year: e.year,
        title,
        type: e.type,
        status: e.status === "done" ? "done" : "upcoming",
        scope,
      };
      if (e.img) payload.img = e.img;
      await insertPublished({
        contentType: "event",
        orgUnitId,
        createdBy,
        titleAr: title,
        imagePath: e.img ?? null,
        eventScope: scope,
        eventDay: e.day,
        eventMonth: e.month,
        eventYear: e.year,
        eventTypeAr: e.type,
        eventDisplayStatus: e.status === "done" ? "done" : "upcoming",
        payload,
      });
      inserted += 1;
    }
  }
  console.log(`events: inserted ${inserted}, skipped ${skipped} (already published)`);
}

async function importPublications(orgUnitId: string, createdBy: string) {
  const { pubs, covers } = readJson<LegacyPubs>("publications.json");
  if (covers.length !== pubs.length) {
    throw new Error(
      `publications.json invariant broken: covers.length (${covers.length}) !== pubs.length (${pubs.length})`,
    );
  }
  let inserted = 0;
  let skipped = 0;
  for (let i = 0; i < pubs.length; i += 1) {
    const p = pubs[i];
    const cover = covers[i];
    const title = p.t.trim();
    if (!title) continue;
    if (await alreadyPublished("publication", title)) {
      skipped += 1;
      continue;
    }
    await insertPublished({
      contentType: "publication",
      orgUnitId,
      createdBy,
      titleAr: title,
      labelAr: p.dept?.trim() || null,
      summaryAr: p.desc?.trim() || null,
      imagePath: cover,
      pubKind: p.type === "individual" ? "individual" : "collective",
      payload: {
        t: title,
        type: p.type === "individual" ? "individual" : "collective",
        dept: p.dept?.trim() || "",
        desc: p.desc?.trim() || "",
        cover,
      },
    });
    inserted += 1;
  }
  console.log(`publications: inserted ${inserted}, skipped ${skipped} (already published)`);
}

async function main() {
  const orgUnitId = await getCentreWideOrgId();
  const createdBy = await getSuperAdminId();
  console.log(`Importing legacy JSON as published live items (org=${orgUnitId})…`);
  console.log("NOTE: this does NOT rewrite data/*.json — it only populates the CMS database.");

  await importNews(orgUnitId, createdBy);
  await importEvents(orgUnitId, createdBy);
  await importPublications(orgUnitId, createdBy);

  console.log("Legacy import complete. A future CMS publish will now include these live items.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("IMPORT FAIL", err);
    process.exit(1);
  });
