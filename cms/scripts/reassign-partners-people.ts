/**
 * One-shot: set Editor / Reviewer / Publisher display for published partners
 * imported under Super Admin.
 *
 * - Editor  → editor who claims content_type = partner
 * - Reviewer → f.boufatah@crsic.dz (review_owner_id)
 * - Publisher → synthetic partner.publish audit by Boufatah (if missing)
 *
 * Usage (from cms/): npm run db:reassign:partners-people
 */
import { query, pool } from "../src/lib/db";

async function main() {
  const sa = await query<{ id: string; email: string }>(
    `SELECT id, email FROM users
     WHERE role = 'super_admin' AND is_active = TRUE
     ORDER BY created_at ASC LIMIT 1`,
  );
  const saUser = sa.rows[0];
  if (!saUser) throw new Error("No active Super Admin");

  const claim = await query<{ editor_id: string; email: string; display_name: string }>(
    `SELECT ect.editor_id, u.email, u.display_name
     FROM editor_content_type_claims ect
     JOIN users u ON u.id = ect.editor_id
     WHERE ect.content_type = 'partner' AND u.is_active = TRUE
     ORDER BY ect.created_at ASC NULLS LAST
     LIMIT 1`,
  );
  const editor = claim.rows[0];
  if (!editor) throw new Error("No active editor claim for partner");

  const reviewer = await query<{ id: string; email: string; display_name: string }>(
    `SELECT id, email, display_name FROM users
     WHERE email = 'f.boufatah@crsic.dz' AND role = 'reviewer' AND is_active = TRUE`,
  );
  const boufatah = reviewer.rows[0];
  if (!boufatah) throw new Error("Reviewer f.boufatah@crsic.dz not found");

  const partners = await query<{ id: string; title_ar: string; created_by: string }>(
    `SELECT id, title_ar, created_by
     FROM content_items
     WHERE content_type = 'partner' AND status = 'published'
     ORDER BY created_at`,
  );

  let authorship = 0;
  let owners = 0;
  let publishAudits = 0;

  for (const item of partners.rows) {
    await query(
      `UPDATE content_items
       SET created_by = $2,
           review_owner_id = $3,
           updated_by = $4,
           updated_at = NOW()
       WHERE id = $1`,
      [item.id, editor.editor_id, boufatah.id, saUser.id],
    );
    authorship += 1;
    owners += 1;

    await query(
      `INSERT INTO audit_log
        (actor_user_id, actor_email, action, entity_type, entity_id, summary, metadata)
       VALUES ($1, $2, 'content.reassign', 'partner', $3, $4, $5::jsonb)`,
      [
        saUser.id,
        saUser.email,
        item.id,
        `Partner people fix "${item.title_ar}" → editor ${editor.email}; review owner ${boufatah.display_name}`,
        JSON.stringify({
          reason: "partner_people_ops_fix",
          editorId: editor.editor_id,
          editorEmail: editor.email,
          reviewOwnerId: boufatah.id,
          previousCreatedBy: item.created_by,
        }),
      ],
    );

    const hasPublish = await query(
      `SELECT 1 FROM audit_log
       WHERE entity_id = $1 AND action = 'partner.publish'
       LIMIT 1`,
      [item.id],
    );
    if ((hasPublish.rowCount ?? 0) === 0) {
      await query(
        `INSERT INTO audit_log
          (actor_user_id, actor_email, action, entity_type, entity_id, summary, metadata)
         VALUES ($1, $2, 'partner.publish', 'partner', $3, $4, $5::jsonb)`,
        [
          boufatah.id,
          boufatah.email,
          item.id,
          `Published (legacy attribution) — ${item.title_ar}`,
          JSON.stringify({ reason: "partner_people_ops_fix", synthetic: true }),
        ],
      );
      publishAudits += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        partners: partners.rows.length,
        editor: editor.email,
        reviewer: boufatah.email,
        authorshipUpdated: authorship,
        reviewOwnersSet: owners,
        publishAuditsAdded: publishAudits,
      },
      null,
      2,
    ),
  );

  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
