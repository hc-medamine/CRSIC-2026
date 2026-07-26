/**
 * Integration tests for revision restore JSONB parity (research + attachments).
 * Run: npm test  (from cms/, requires DATABASE_URL in .env.local)
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import {
  CONTENT_SNAPSHOT_COLUMNS,
  JSONB_RESTORE_EXCLUDE,
  restoreRevision,
} from "@/lib/content/lifecycle";
import {
  createResearchGroup,
  getResearchGroupById,
  updateResearchGroupDraft,
} from "@/lib/content/researchGroups";
import {
  createResearchProject,
  getResearchProjectById,
  updateResearchProjectDraft,
} from "@/lib/content/researchProjects";
import { listRevisionsForItem } from "@/lib/content/revisions";
import { normalizeResearchMembers } from "@/lib/publish/researchGroupsJson";
import { normalizeResearchEntries } from "@/lib/publish/researchProjectsJson";

const ORG = "dept_quran_fiqh";
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

describe("revision restore JSONB", () => {
  let sa: SessionUser;

  before(async () => {
    sa = await loadSuperAdmin();
  });

  after(async () => {
    for (const id of createdIds) {
      await query(`DELETE FROM content_items WHERE id = $1`, [id]);
    }
  });

  it("restores research_group.research_members from a prior revision", async () => {
    const created = await createResearchGroup(sa, {
      orgUnitId: ORG,
      titleAr: `اختبار استعادة أعضاء ${Date.now()}`,
      summaryAr: "ملخص اختبار",
      leadAr: "قائد الاختبار",
      members: [
        { nameAr: "عضو أول", nameEn: "Member One" },
        { nameAr: "عضو ثان" },
      ],
    });
    createdIds.push(created.id);

    const revisionsBefore = await listRevisionsForItem(created.id);
    const createdRevision = revisionsBefore.find((r) => r.change_summary === "Created");
    assert.ok(createdRevision, "expected Created revision");
    assert.ok(
      Array.isArray(createdRevision.snapshot.research_members) &&
        createdRevision.snapshot.research_members.length === 2,
      "Created revision snapshot must include members",
    );

    await updateResearchGroupDraft(sa, created.id, {
      orgUnitId: ORG,
      titleAr: created.title_ar,
      summaryAr: created.summary_ar ?? "ملخص اختبار",
      leadAr: created.research_lead_ar ?? "قائد الاختبار",
      members: [{ nameAr: "عضو بديل فقط" }],
    });

    const afterEdit = await getResearchGroupById(created.id);
    assert.equal(normalizeResearchMembers(afterEdit?.research_members).length, 1);

    await restoreRevision(sa, created.id, createdRevision.id);

    const restored = await getResearchGroupById(created.id);
    const members = normalizeResearchMembers(restored?.research_members);
    assert.equal(members.length, 2, "restore must bring back both members");
    assert.equal(members[0]?.name_ar, "عضو أول");
    assert.equal(members[0]?.name_en, "Member One");
    assert.equal(members[1]?.name_ar, "عضو ثان");
  });

  it("restores research_project axes and impacts from a prior revision", async () => {
    const group = await createResearchGroup(sa, {
      orgUnitId: ORG,
      titleAr: `مجموعة مشروع استعادة ${Date.now()}`,
      summaryAr: "ملخص",
      leadAr: "قائد",
      members: [{ nameAr: "عضو" }],
    });
    createdIds.push(group.id);

    const project = await createResearchProject(sa, {
      orgUnitId: ORG,
      researchGroupId: group.id,
      titleAr: `مشروع استعادة ${Date.now()}`,
      leadAr: "قائد المشروع",
      axes: [{ ar: "محور أول", en: "Axis One" }, { ar: "محور ثان" }],
      impacts: [{ ar: "أثر أول" }, { ar: "أثر ثان", en: "Impact Two" }],
    });
    createdIds.push(project.id);

    const revisions = await listRevisionsForItem(project.id);
    const createdRevision = revisions.find((r) => r.change_summary === "Created");
    assert.ok(createdRevision);

    await updateResearchProjectDraft(sa, project.id, {
      orgUnitId: ORG,
      researchGroupId: group.id,
      titleAr: project.title_ar,
      leadAr: project.research_lead_ar ?? "قائد المشروع",
      axes: [{ ar: "محور بديل" }],
      impacts: [{ ar: "أثر بديل" }],
    });

    await restoreRevision(sa, project.id, createdRevision.id);

    const restored = await getResearchProjectById(project.id);
    const axes = normalizeResearchEntries(restored?.research_axes);
    const impacts = normalizeResearchEntries(restored?.research_impacts);
    assert.equal(axes.length, 2);
    assert.equal(axes[0]?.ar, "محور أول");
    assert.equal(axes[0]?.en, "Axis One");
    assert.equal(impacts.length, 2);
    assert.equal(impacts[1]?.en, "Impact Two");
  });

  it("parity guard: every editable jsonb column on content_items is in SNAPSHOT_COLUMNS", async () => {
    const cols = await query<{ column_name: string }>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'content_items'
         AND data_type = 'jsonb'
       ORDER BY column_name`,
    );
    const snapshot = new Set<string>(CONTENT_SNAPSHOT_COLUMNS);
    const missing: string[] = [];
    for (const { column_name } of cols.rows) {
      if (JSONB_RESTORE_EXCLUDE.has(column_name)) continue;
      if (!snapshot.has(column_name)) missing.push(column_name);
    }
    assert.deepEqual(
      missing,
      [],
      `jsonb columns missing from SNAPSHOT_COLUMNS: ${missing.join(", ")}`,
    );
  });
});
