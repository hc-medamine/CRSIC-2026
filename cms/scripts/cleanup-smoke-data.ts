/**
 * Remove CMS smoke/test rows from the DB; keep real staff + imported/editorial content.
 * Rebuilds public JSON from remaining live payloads so files match the DB.
 *
 * Usage: npm run db:cleanup:smoke
 * Also invoked automatically at the start and end of `npm run db:smoke`.
 */
import { query } from "../src/lib/db";
import { rebuildPublicNewsJson } from "../src/lib/publish/newsJson";
import { rebuildPublicEventsJson } from "../src/lib/publish/eventsJson";
import { rebuildPublicPublicationsJson } from "../src/lib/publish/publicationsJson";
import { rebuildPublicPartnersJson } from "../src/lib/publish/partnersJson";
import { rebuildPublicAlertsJson } from "../src/lib/publish/alertsJson";

/** Fixture accounts used only by automated smoke (kept as users, content purged). */
export const SMOKE_EMAIL_PATTERN = /^smoke\.[a-z0-9._+-]+@crsic\.dz$/i;

export type SmokeCleanupReport = {
  smokeUserIds: string[];
  contentDeleted: number;
  mediaDeleted: number;
  notificationsDeleted: number;
  auditsDeleted: number;
};

async function smokeUserIds(): Promise<string[]> {
  const result = await query<{ id: string; email: string }>(
    `SELECT id, email FROM users WHERE email ILIKE 'smoke.%@crsic.dz'`,
  );
  return result.rows
    .filter((r) => SMOKE_EMAIL_PATTERN.test(r.email))
    .map((r) => r.id);
}

/**
 * Delete smoke-authored content and related test noise; preserve real data.
 * Smoke user accounts remain (reused by the next smoke run).
 */
export async function cleanupSmokeData(): Promise<SmokeCleanupReport> {
  const ids = await smokeUserIds();

  let contentDeleted = 0;
  let mediaDeleted = 0;
  let notificationsDeleted = 0;
  let auditsDeleted = 0;

  if (ids.length > 0) {
    // Clear OOO / Away on smoke users and anyone elevated for a smoke Away reviewer
    await query(
      `UPDATE users SET
         is_away = FALSE,
         away_until = NULL,
         away_delegate_user_id = NULL,
         role = COALESCE(role_before_away, role),
         role_before_away = NULL,
         updated_at = NOW()
       WHERE id = ANY($1::uuid[])
          OR away_delegate_user_id = ANY($1::uuid[])`,
      [ids],
    );

    const content = await query(
      `DELETE FROM content_items
       WHERE created_by = ANY($1::uuid[])
          OR title_ar ILIKE 'Smoke %'
          OR title_ar ILIKE '% Smoke %'
          OR title_en ILIKE 'Smoke %'
          OR title_en ILIKE '% Smoke %'
       RETURNING id`,
      [ids],
    );
    contentDeleted = content.rowCount ?? content.rows.length;

    const media = await query(
      `DELETE FROM media_assets WHERE uploaded_by = ANY($1::uuid[]) RETURNING id`,
      [ids],
    );
    mediaDeleted = media.rowCount ?? media.rows.length;

    const notes = await query(
      `DELETE FROM notifications
       WHERE user_id = ANY($1::uuid[])
          OR title ILIKE '%Smoke%'
          OR body ILIKE '%Smoke%'
       RETURNING id`,
      [ids],
    );
    notificationsDeleted = notes.rowCount ?? notes.rows.length;

    const audits = await query(
      `DELETE FROM audit_log WHERE actor_user_id = ANY($1::uuid[]) RETURNING id`,
      [ids],
    );
    auditsDeleted = audits.rowCount ?? audits.rows.length;
  } else {
    // No smoke users yet — still purge title-marked leftovers if any
    const content = await query(
      `DELETE FROM content_items
       WHERE title_ar ILIKE 'Smoke %'
          OR title_ar ILIKE '% Smoke %'
          OR title_en ILIKE 'Smoke %'
          OR title_en ILIKE '% Smoke %'
       RETURNING id`,
    );
    contentDeleted = content.rowCount ?? content.rows.length;
  }

  // Public JSON must match remaining published live_payload rows
  await rebuildPublicNewsJson();
  await rebuildPublicEventsJson();
  await rebuildPublicPublicationsJson();
  await rebuildPublicPartnersJson();
  await rebuildPublicAlertsJson();

  return {
    smokeUserIds: ids,
    contentDeleted,
    mediaDeleted,
    notificationsDeleted,
    auditsDeleted,
  };
}

async function main() {
  const report = await cleanupSmokeData();
  console.log("Smoke/test data cleanup complete:", report);
}

const isDirectRun = process.argv[1]?.replace(/\\/g, "/").endsWith("/cleanup-smoke-data.ts")
  || process.argv[1]?.replace(/\\/g, "/").endsWith("/cleanup-smoke-data.js");

if (isDirectRun) {
  main().catch((err) => {
    console.error("Smoke cleanup failed", err);
    process.exit(1);
  });
}