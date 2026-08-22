/**
 * Reassign content_items.created_by to the Editor who currently claims each
 * type/org. Review owner / publisher follow Align rules (org Reviewer; do not
 * wipe a valid publisher pick). Does not notify; does not rebuild public JSON.
 *
 * Usage (from cms/):
 *   npm run db:reassign:to-claims            # dry-run
 *   npm run db:reassign:to-claims -- --apply
 *
 * Prefer the Desk page /dashboard/editors (notifies + rebuilds). After staff
 * change desks, run Align or this script so list-for-user matches claims.
 */
import { pool, query } from "../src/lib/db";
import { applyAlign, previewAlign } from "../src/lib/content/alignAuthorship";
import type { SessionUser } from "../src/lib/auth/session";

const APPLY = process.argv.includes("--apply");

async function loadCliSuperAdmin(): Promise<SessionUser> {
  const sa = await query<{
    id: string;
    email: string;
    display_name: string;
    name_ar: string | null;
    name_en: string | null;
    role: SessionUser["role"];
  }>(
    `SELECT id, email, display_name, name_ar, name_en, role FROM users
     WHERE role = 'super_admin' AND is_active = TRUE
     ORDER BY created_at ASC LIMIT 1`,
  );
  const row = sa.rows[0];
  if (!row) throw new Error("No active Super Admin found");
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    nameAr: row.name_ar,
    nameEn: row.name_en,
    role: "super_admin",
  };
}

async function main() {
  const user = await loadCliSuperAdmin();
  const preview = await previewAlign(user);
  console.log(APPLY ? "APPLY" : "DRY-RUN");
  console.log(`Items scanned: ${preview.scanned}`);
  console.log(`Would reassign: ${preview.moves.length}`);
  console.log(`Already matching claims: ${preview.alreadyAligned}`);
  console.log(`Skipped (no claim): ${preview.skipped.length}`);
  for (const [k, n] of Object.entries(preview.byType)) {
    console.log(`  ${k}: ${n}`);
  }
  for (const s of preview.skipped) {
    console.warn(`SKIP ${s.type} ${s.id} — ${s.reason}`);
  }
  if (preview.covers.inScope) {
    console.log(`Cover uploads → ${preview.covers.toEmail}: ${preview.covers.count}`);
  } else {
    console.warn("Publications desk not in scope — cover ownership left unchanged.");
  }
  console.log(`Publisher set: ${preview.publisherSet}; kept: ${preview.publisherKept}`);

  if (!APPLY) {
    console.log("No writes. Re-run with --apply to update created_by / cover uploaded_by.");
    return;
  }

  const result = await applyAlign(user, { notify: false, rebuild: false });
  console.log(result.applied ? "Committed." : "Nothing to apply.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
