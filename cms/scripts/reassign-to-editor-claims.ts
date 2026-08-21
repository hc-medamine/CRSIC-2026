/**
 * Reassign content_items.created_by to the Editor who currently claims each
 * type/org. Review owner stays F. Boufatah. Does not notify authors.
 *
 * Usage (from cms/):
 *   npm run db:reassign:to-claims            # dry-run
 *   npm run db:reassign:to-claims -- --apply
 *
 * After staff change desks (User management or seed-staff), re-run this so
 * list-for-user matches the new claims. Cover uploads (`bucket = covers`)
 * follow the publication Editor.
 */
import { pool } from "../src/lib/db";

type Claim = {
  content_type: string;
  org_unit_id: string | null;
  editor_id: string;
  email: string;
};

const APPLY = process.argv.includes("--apply");

function editorFor(claims: Claim[], contentType: string, orgUnitId: string | null): Claim | null {
  if (contentType === "research_group" || contentType === "research_project") {
    const exact = claims.find(
      (c) => c.content_type === contentType && c.org_unit_id === orgUnitId,
    );
    if (exact) return exact;
    return claims.find((c) => c.content_type === contentType) ?? null;
  }
  return (
    claims.find((c) => c.content_type === contentType && c.org_unit_id == null) ??
    claims.find((c) => c.content_type === contentType) ??
    null
  );
}

async function main() {
  const client = await pool.connect();
  try {
    const sa = await client.query<{ id: string; email: string }>(
      `SELECT id, email FROM users
       WHERE role = 'super_admin' AND is_active = TRUE
       ORDER BY created_at ASC LIMIT 1`,
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

    const items = await client.query<{
      id: string;
      content_type: string;
      org_unit_id: string | null;
      title_ar: string;
      created_by: string;
      author_email: string;
      status: string;
    }>(
      `SELECT c.id, c.content_type, c.org_unit_id, c.title_ar, c.created_by, c.status,
              u.email AS author_email
       FROM content_items c
       JOIN users u ON u.id = c.created_by
       ORDER BY c.content_type, c.created_at`,
    );

    const summary: Record<string, number> = {};
    const skipped: { type: string; id: string; reason: string }[] = [];
    const moves: {
      type: string;
      id: string;
      title: string;
      from: string;
      to: string;
    }[] = [];

    for (const item of items.rows) {
      const claim = editorFor(claims, item.content_type, item.org_unit_id);
      if (!claim) {
        skipped.push({
          type: item.content_type,
          id: item.id,
          reason: `no editor claim (org=${item.org_unit_id})`,
        });
        continue;
      }
      if (item.created_by === claim.editor_id) continue;
      moves.push({
        type: item.content_type,
        id: item.id,
        title: item.title_ar,
        from: item.author_email,
        to: claim.email,
      });
      const key = `${item.content_type}: ${item.author_email} → ${claim.email}`;
      summary[key] = (summary[key] ?? 0) + 1;
    }

    const pubClaim = editorFor(claims, "publication", null);
    const coverRows = pubClaim
      ? await client.query<{ id: string; email: string }>(
          `SELECT m.id, u.email
           FROM media_assets m
           JOIN users u ON u.id = m.uploaded_by
           WHERE m.bucket = 'covers' AND m.uploaded_by IS DISTINCT FROM $1`,
          [pubClaim.editor_id],
        )
      : { rows: [] as { id: string; email: string }[] };
    const coverByFrom: Record<string, number> = {};
    for (const row of coverRows.rows) {
      coverByFrom[row.email] = (coverByFrom[row.email] ?? 0) + 1;
    }

    console.log(APPLY ? "APPLY" : "DRY-RUN");
    console.log(`Items scanned: ${items.rows.length}`);
    console.log(`Would reassign: ${moves.length}`);
    console.log(`Already matching claims: ${items.rows.length - moves.length - skipped.length}`);
    console.log(`Skipped (no claim): ${skipped.length}`);
    for (const [k, n] of Object.entries(summary)) {
      console.log(`  ${k}: ${n}`);
    }
    for (const s of skipped) {
      console.warn(`SKIP ${s.type} ${s.id} — ${s.reason}`);
    }
    if (pubClaim) {
      console.log(
        `Cover uploads → ${pubClaim.email}: ${coverRows.rows.length}${
          Object.keys(coverByFrom).length
            ? ` (${Object.entries(coverByFrom)
                .map(([e, n]) => `${e} ${n}`)
                .join(", ")})`
            : ""
        }`,
      );
    } else {
      console.warn("No publication editor claim — cover ownership left unchanged.");
    }

    if (!APPLY) {
      console.log("No writes. Re-run with --apply to update created_by / cover uploaded_by.");
      return;
    }

    await client.query("BEGIN");

    for (const item of items.rows) {
      const claim = editorFor(claims, item.content_type, item.org_unit_id);
      if (!claim || item.created_by === claim.editor_id) continue;

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
          `Desk reassign "${item.title_ar}" ${item.author_email} → ${claim.email}`,
          JSON.stringify({
            reason: "reassign_to_editor_claims",
            from: item.created_by,
            fromEmail: item.author_email,
            to: claim.editor_id,
            toEmail: claim.email,
            reviewOwnerId: boufatah.id,
            status: item.status,
          }),
        ],
      );
    }

    await client.query(
      `INSERT INTO audit_log
        (actor_user_id, actor_email, action, entity_type, entity_id, summary, metadata)
       VALUES ($1, $2, $3, $4, NULL, $5, $6::jsonb)`,
      [
        saUser.id,
        saUser.email,
        "content.bulk_reassign_to_claims",
        "content",
        `Desk authorship reassign: ${moves.length} items; skipped ${skipped.length}; covers ${coverRows.rows.length}`,
        JSON.stringify({
          reassigned: moves.length,
          skipped: skipped.length,
          byMove: summary,
          covers: pubClaim
            ? { to: pubClaim.email, n: coverRows.rows.length, from: coverByFrom }
            : null,
        }),
      ],
    );

    if (pubClaim && coverRows.rows.length > 0) {
      await client.query(
        `UPDATE media_assets
         SET uploaded_by = $1
         WHERE bucket = 'covers' AND uploaded_by IS DISTINCT FROM $1`,
        [pubClaim.editor_id],
      );
    }

    await client.query("COMMIT");
    console.log("Committed.");
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore if no transaction */
    }
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
