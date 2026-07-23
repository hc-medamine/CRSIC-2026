/**
 * One-shot ops: reassign SA-imported legacy authorship to the Editor who
 * currently claims each content type, and set review owner = F. Boufatah.
 *
 * Usage: npm run db:reassign-legacy-authorship
 */
import { Pool } from "pg";

type Claim = {
  content_type: string;
  org_unit_id: string | null;
  editor_id: string;
  email: string;
};

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

    const sa = await client.query<{ id: string; email: string }>(
      `SELECT id, email FROM users WHERE role = 'super_admin' AND is_active = TRUE ORDER BY created_at ASC LIMIT 1`,
    );
    const saUser = sa.rows[0];
    if (!saUser) throw new Error("No active Super Admin found");

    const reviewer = await client.query<{ id: string; email: string; display_name: string }>(
      `SELECT id, email, display_name FROM users
       WHERE email = 'f.boufatah@crsic.dz' AND role = 'reviewer' AND is_active = TRUE`,
    );
    const boufatah = reviewer.rows[0];
    if (!boufatah) throw new Error("Reviewer f.boufatah@crsic.dz not found");

    const claimsRes = await client.query<Claim>(
      `SELECT ect.content_type, ect.org_unit_id, ect.editor_id, u.email
       FROM editor_content_type_claims ect
       JOIN users u ON u.id = ect.editor_id
       WHERE u.is_active = TRUE`,
    );
    const claims = claimsRes.rows;
    if (claims.length === 0) throw new Error("No editor content-type claims found");

    function editorFor(contentType: string, orgUnitId: string | null): Claim | null {
      if (contentType === "research_group" || contentType === "research_project") {
        const exact = claims.find(
          (c) => c.content_type === contentType && c.org_unit_id === orgUnitId,
        );
        if (exact) return exact;
        const any = claims.find((c) => c.content_type === contentType);
        return any ?? null;
      }
      return claims.find((c) => c.content_type === contentType && c.org_unit_id == null) ?? null;
    }

    const items = await client.query<{
      id: string;
      content_type: string;
      org_unit_id: string | null;
      title_ar: string;
      created_by: string;
      status: string;
    }>(
      `SELECT id, content_type, org_unit_id, title_ar, created_by, status
       FROM content_items
       WHERE created_by = $1
       ORDER BY content_type, created_at`,
      [saUser.id],
    );

    const summary: Record<string, { to: string; n: number }> = {};
    let reassigned = 0;
    let skipped = 0;

    for (const item of items.rows) {
      const claim = editorFor(item.content_type, item.org_unit_id);
      if (!claim) {
        console.warn(
          `SKIP ${item.content_type} ${item.id} — no editor claim (org=${item.org_unit_id})`,
        );
        skipped += 1;
        continue;
      }

      await client.query(
        `UPDATE content_items
         SET created_by = $2,
             review_owner_id = $3,
             updated_by = $4,
             updated_at = NOW()
         WHERE id = $1`,
        [item.id, claim.editor_id, boufatah.id, saUser.id],
      );

      await client.query(
        `INSERT INTO audit_log
          (actor_user_id, actor_email, action, entity_type, entity_id, summary, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
        [
          saUser.id,
          saUser.email,
          "content.reassign",
          item.content_type,
          item.id,
          `Legacy reassign "${item.title_ar}" → ${claim.email}; review owner ${boufatah.display_name}`,
          JSON.stringify({
            reason: "legacy_sa_import_reassign",
            from: saUser.id,
            to: claim.editor_id,
            toEmail: claim.email,
            reviewOwnerId: boufatah.id,
            status: item.status,
          }),
        ],
      );

      const key = `${item.content_type}→${claim.email}`;
      summary[key] = summary[key] ?? { to: claim.email, n: 0 };
      summary[key].n += 1;
      reassigned += 1;
    }

    // Ensure all remaining items (already non-SA authors) also have Boufatah as review owner.
    const ownerFix = await client.query(
      `UPDATE content_items
       SET review_owner_id = $1, updated_at = NOW()
       WHERE review_owner_id IS DISTINCT FROM $1
       RETURNING id`,
      [boufatah.id],
    );

    await client.query(
      `INSERT INTO audit_log
        (actor_user_id, actor_email, action, entity_type, entity_id, summary, metadata)
       VALUES ($1, $2, $3, $4, NULL, $5, $6::jsonb)`,
      [
        saUser.id,
        saUser.email,
        "content.bulk_reassign_legacy",
        "content",
        `Legacy authorship reassign: ${reassigned} items; review owner set to ${boufatah.email}; skipped ${skipped}`,
        JSON.stringify({
          reassigned,
          skipped,
          reviewOwnerFixed: ownerFix.rowCount ?? 0,
          reviewOwnerEmail: boufatah.email,
          byType: summary,
        }),
      ],
    );

    await client.query("COMMIT");

    console.log("Done.");
    console.log(`Reassigned from SA: ${reassigned}`);
    console.log(`Skipped (no claim): ${skipped}`);
    console.log(`Review owner rows touched (incl. non-SA): ${ownerFix.rowCount ?? 0}`);
    console.log("By type:");
    for (const [k, v] of Object.entries(summary)) {
      console.log(`  ${k}: ${v.n}`);
    }
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
