/**
 * Partner summary/body round-trip + revision restore.
 * Run: npm test  (from cms/)
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { restoreRevision } from "@/lib/content/lifecycle";
import {
  createPartner,
  getPartnerById,
  updatePartnerDraft,
} from "@/lib/content/partners";
import { buildPartnerPayload } from "@/lib/publish/partnersJson";
import { listRevisionsForItem } from "@/lib/content/revisions";

const ORG = "centre_wide";
const createdIds: string[] = [];

async function loadSuperAdmin(): Promise<SessionUser> {
  const result = await query<{
    id: string;
    email: string;
    display_name: string;
  }>(
    `SELECT id, email, display_name FROM users
     WHERE role = 'super_admin' AND is_active = TRUE
     ORDER BY created_at ASC LIMIT 1`,
  );
  const row = result.rows[0];
  if (!row) throw new Error("No active Super Admin — seed one before running tests");
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: "super_admin",
  };
}

describe("partner narrative fields", () => {
  let sa: SessionUser;

  before(async () => {
    sa = await loadSuperAdmin();
  });

  after(async () => {
    for (const id of createdIds) {
      await query(`DELETE FROM content_items WHERE id = $1`, [id]);
    }
  });

  it("persists summary/body on create and update, and restores them", async () => {
    const created = await createPartner(sa, {
      orgUnitId: ORG,
      titleAr: `شريك سرد ${Date.now()}`,
      labelAr: "الجزائر",
      partnerScope: "nat",
      partnerDate: "يوليو 2026",
      summaryAr: "ملخص قصير للشراكة",
      bodyAr: "<p>نص تفصيلي عن الاتفاقية.</p>",
      summaryEn: "Short partnership summary",
      bodyEn: "<p>Detailed agreement text.</p>",
    });
    createdIds.push(created.id);

    assert.equal(created.summary_ar, "ملخص قصير للشراكة");
    assert.equal(created.body_ar, "<p>نص تفصيلي عن الاتفاقية.</p>");
    assert.equal(created.summary_en, "Short partnership summary");

    const revisions = await listRevisionsForItem(created.id);
    const createdRevision = revisions.find((r) => r.change_summary === "Created");
    assert.ok(createdRevision);
    assert.equal(createdRevision.snapshot.summary_ar, "ملخص قصير للشراكة");
    assert.equal(createdRevision.snapshot.body_ar, "<p>نص تفصيلي عن الاتفاقية.</p>");

    await updatePartnerDraft(sa, created.id, {
      orgUnitId: ORG,
      titleAr: created.title_ar,
      labelAr: "الجزائر",
      partnerScope: "nat",
      partnerDate: "يوليو 2026",
      summaryAr: "",
      bodyAr: "",
      summaryEn: "",
      bodyEn: "",
    });
    const cleared = await getPartnerById(created.id);
    assert.equal(cleared?.summary_ar, null);
    assert.equal(cleared?.body_ar, null);

    await restoreRevision(sa, created.id, createdRevision.id);
    const restored = await getPartnerById(created.id);
    assert.equal(restored?.summary_ar, "ملخص قصير للشراكة");
    assert.equal(restored?.body_ar, "<p>نص تفصيلي عن الاتفاقية.</p>");
    assert.equal(restored?.summary_en, "Short partnership summary");
    assert.equal(restored?.body_en, "<p>Detailed agreement text.</p>");
  });

  it("buildPartnerPayload emits bilingual narrative keys", () => {
    const payload = buildPartnerPayload({
      id: "p1",
      title_ar: "شريك",
      label_ar: "الجزائر",
      partner_date: "2024",
      partner_emoji: null,
      partner_scope: "nat",
      public_slug: "partner-slug",
      summary_ar: "ملخص",
      summary_en: "Summary",
      body_ar: "<p>عربي</p>",
      body_en: "<p>EN</p>",
    });
    assert.equal(payload.summary_ar, "ملخص");
    assert.equal(payload.summary_en, "Summary");
    assert.equal(payload.body_ar, "<p>عربي</p>");
    assert.equal(payload.body_en, "<p>EN</p>");
    assert.equal(payload.slug, "partner-slug");
  });
});
