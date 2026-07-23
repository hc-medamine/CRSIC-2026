/**
 * One-shot: for published items with no *.publish audit, attribute publish to F. Boufatah
 * so Edit/review "Publisher" shows her.
 *
 * Usage: node --env-file=.env.local --import tsx scripts/set-legacy-publisher-boufatah.ts
 */
import { Pool } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL required");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const reviewer = await client.query<{ id: string; email: string; display_name: string }>(
      `SELECT id, email, display_name FROM users
       WHERE email = 'f.boufatah@crsic.dz' AND role = 'reviewer' AND is_active = TRUE`,
    );
    const boufatah = reviewer.rows[0];
    if (!boufatah) throw new Error("Reviewer f.boufatah@crsic.dz not found");

    const sa = await client.query<{ id: string; email: string }>(
      `SELECT id, email FROM users WHERE role = 'super_admin' AND is_active = TRUE ORDER BY created_at ASC LIMIT 1`,
    );
    const actor = sa.rows[0];
    if (!actor) throw new Error("No Super Admin found");

    const items = await client.query<{
      id: string;
      content_type: string;
      title_ar: string;
    }>(
      `SELECT ci.id, ci.content_type, ci.title_ar
       FROM content_items ci
       WHERE ci.status = 'published'
         AND NOT EXISTS (
           SELECT 1 FROM audit_log a
           WHERE a.entity_id = ci.id::text
             AND a.action = ci.content_type || '.publish'
         )
       ORDER BY ci.content_type, ci.created_at`,
    );

    let n = 0;
    for (const item of items.rows) {
      const action = `${item.content_type}.publish`;
      await client.query(
        `INSERT INTO audit_log
          (actor_user_id, actor_email, action, entity_type, entity_id, summary, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
        [
          boufatah.id,
          boufatah.email,
          action,
          item.content_type,
          item.id,
          `Legacy publish attributed to ${boufatah.display_name}: "${item.title_ar}"`,
          JSON.stringify({
            reason: "legacy_publisher_attribution",
            attributedBy: actor.email,
            publisherId: boufatah.id,
          }),
        ],
      );
      n += 1;
    }

    await client.query(
      `INSERT INTO audit_log
        (actor_user_id, actor_email, action, entity_type, entity_id, summary, metadata)
       VALUES ($1, $2, $3, $4, NULL, $5, $6::jsonb)`,
      [
        actor.id,
        actor.email,
        "content.bulk_legacy_publisher",
        "content",
        `Attributed Publisher to ${boufatah.email} on ${n} published items lacking publish audit`,
        JSON.stringify({ count: n, publisherEmail: boufatah.email }),
      ],
    );

    await client.query("COMMIT");
    console.log(`Attributed Publisher = ${boufatah.display_name} on ${n} published items.`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
