/**
 * Integration tests: revision restore must round-trip every SEO column.
 * Run: npm test  (from cms/, requires DATABASE_URL in .env.local)
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import {
  CONTENT_RESTORABLE_COLUMNS,
  CONTENT_SNAPSHOT_COLUMNS,
  restoreRevision,
} from "@/lib/content/lifecycle";
import { SEO_SNAPSHOT_COLUMNS, type SeoColumns } from "@/lib/content/seo";
import { createNews, getNewsById, updateNewsDraft } from "@/lib/content/news";
import {
  createPublication,
  getPublicationById,
  updatePublicationDraft,
} from "@/lib/content/publications";
import { createPartner, getPartnerById, updatePartnerDraft } from "@/lib/content/partners";
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

const ORG_CENTRE = "centre_wide";
const ORG_DEPT = "dept_quran_fiqh";
const createdIds: string[] = [];

const FULL_SEO = {
  metaTitleAr: "عنوان ميتا عربي",
  metaTitleEn: "EN meta title",
  metaDescriptionAr: "وصف ميتا عربي للاختبار",
  metaDescriptionEn: "EN meta description for restore test",
  ogImage: "/media/test/og-restore.webp",
} as const;

const FULL_SEO_COLUMNS: SeoColumns = {
  meta_title_ar: FULL_SEO.metaTitleAr,
  meta_title_en: FULL_SEO.metaTitleEn,
  meta_description_ar: FULL_SEO.metaDescriptionAr,
  meta_description_en: FULL_SEO.metaDescriptionEn,
  og_image: FULL_SEO.ogImage,
};

const CLEARED_SEO = {
  metaTitleAr: "",
  metaTitleEn: "",
  metaDescriptionAr: "",
  metaDescriptionEn: "",
  ogImage: null as string | null,
};

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

function assertSeoExact(actual: SeoColumns | null | undefined, expected: SeoColumns) {
  assert.ok(actual, "expected row with SEO columns");
  for (const col of SEO_SNAPSHOT_COLUMNS) {
    assert.equal(
      actual[col] ?? null,
      expected[col] ?? null,
      `SEO field ${col} mismatch`,
    );
  }
}

describe("revision restore SEO", () => {
  let sa: SessionUser;

  before(async () => {
    sa = await loadSuperAdmin();
  });

  after(async () => {
    for (const id of createdIds) {
      await query(`DELETE FROM content_items WHERE id = $1`, [id]);
    }
  });

  it("parity: every SEO_SNAPSHOT_COLUMNS entry is in snapshot and restore lists", () => {
    const snapshot = new Set(CONTENT_SNAPSHOT_COLUMNS);
    const restore = new Set(CONTENT_RESTORABLE_COLUMNS);
    const missingFromSnapshot = SEO_SNAPSHOT_COLUMNS.filter((c) => !snapshot.has(c));
    const missingFromRestore = SEO_SNAPSHOT_COLUMNS.filter((c) => !restore.has(c));
    assert.deepEqual(missingFromSnapshot, [], `SEO missing from SNAPSHOT: ${missingFromSnapshot}`);
    assert.deepEqual(missingFromRestore, [], `SEO missing from RESTORE: ${missingFromRestore}`);
  });

  it("restores full SEO on news after fields were cleared", async () => {
    const created = await createNews(sa, {
      orgUnitId: ORG_CENTRE,
      titleAr: `خبر استعادة SEO ${Date.now()}`,
      summaryAr: "ملخص",
      ...FULL_SEO,
    });
    createdIds.push(created.id);

    const revisions = await listRevisionsForItem(created.id);
    const createdRevision = revisions.find((r) => r.change_summary === "Created");
    assert.ok(createdRevision);
    assertSeoExact(createdRevision.snapshot as SeoColumns, FULL_SEO_COLUMNS);

    await updateNewsDraft(sa, created.id, {
      orgUnitId: ORG_CENTRE,
      titleAr: created.title_ar,
      summaryAr: "ملخص",
      ...CLEARED_SEO,
    });
    assertSeoExact(await getNewsById(created.id), {
      meta_title_ar: null,
      meta_title_en: null,
      meta_description_ar: null,
      meta_description_en: null,
      og_image: null,
    });

    await restoreRevision(sa, created.id, createdRevision.id);
    assertSeoExact(await getNewsById(created.id), FULL_SEO_COLUMNS);
  });

  it("restores full SEO on publication after fields were changed", async () => {
    const created = await createPublication(sa, {
      orgUnitId: ORG_CENTRE,
      titleAr: `إصدار استعادة SEO ${Date.now()}`,
      deptAr: "قسم الاختبار",
      descAr: "وصف",
      coverPath: "/media/test/cover.webp",
      pubKind: "collective",
      ...FULL_SEO,
    });
    createdIds.push(created.id);

    const revisions = await listRevisionsForItem(created.id);
    const createdRevision = revisions.find((r) => r.change_summary === "Created");
    assert.ok(createdRevision);

    await updatePublicationDraft(sa, created.id, {
      orgUnitId: ORG_CENTRE,
      titleAr: created.title_ar,
      deptAr: "قسم الاختبار",
      descAr: "وصف",
      coverPath: "/media/test/cover.webp",
      pubKind: "collective",
      metaTitleAr: "عنوان بديل",
      metaTitleEn: "Alt title",
      metaDescriptionAr: "وصف بديل",
      metaDescriptionEn: "Alt desc",
      ogImage: "/media/test/other.webp",
    });

    await restoreRevision(sa, created.id, createdRevision.id);
    assertSeoExact(await getPublicationById(created.id), FULL_SEO_COLUMNS);
  });

  it("restores full SEO on partner after fields were cleared", async () => {
    const created = await createPartner(sa, {
      orgUnitId: ORG_CENTRE,
      titleAr: `شريك استعادة SEO ${Date.now()}`,
      labelAr: "الجزائر",
      partnerScope: "nat",
      partnerDate: "يوليو 2026",
      ...FULL_SEO,
    });
    createdIds.push(created.id);

    const revisions = await listRevisionsForItem(created.id);
    const createdRevision = revisions.find((r) => r.change_summary === "Created");
    assert.ok(createdRevision);

    await updatePartnerDraft(sa, created.id, {
      orgUnitId: ORG_CENTRE,
      titleAr: created.title_ar,
      labelAr: "الجزائر",
      partnerScope: "nat",
      partnerDate: "يوليو 2026",
      ...CLEARED_SEO,
    });

    await restoreRevision(sa, created.id, createdRevision.id);
    assertSeoExact(await getPartnerById(created.id), FULL_SEO_COLUMNS);
  });

  it("restores full SEO on research_group after fields were cleared", async () => {
    const created = await createResearchGroup(sa, {
      orgUnitId: ORG_DEPT,
      titleAr: `مجموعة استعادة SEO ${Date.now()}`,
      summaryAr: "ملخص",
      leadAr: "قائد",
      members: [{ nameAr: "عضو" }],
      ...FULL_SEO,
    });
    createdIds.push(created.id);

    const revisions = await listRevisionsForItem(created.id);
    const createdRevision = revisions.find((r) => r.change_summary === "Created");
    assert.ok(createdRevision);

    await updateResearchGroupDraft(sa, created.id, {
      orgUnitId: ORG_DEPT,
      titleAr: created.title_ar,
      summaryAr: "ملخص",
      leadAr: "قائد",
      members: [{ nameAr: "عضو" }],
      ...CLEARED_SEO,
    });

    await restoreRevision(sa, created.id, createdRevision.id);
    assertSeoExact(await getResearchGroupById(created.id), FULL_SEO_COLUMNS);
  });

  it("restores full SEO on research_project including og_image", async () => {
    const group = await createResearchGroup(sa, {
      orgUnitId: ORG_DEPT,
      titleAr: `مجموعة مشروع SEO ${Date.now()}`,
      summaryAr: "ملخص",
      leadAr: "قائد",
      members: [{ nameAr: "عضو" }],
    });
    createdIds.push(group.id);

    const created = await createResearchProject(sa, {
      orgUnitId: ORG_DEPT,
      researchGroupId: group.id,
      titleAr: `مشروع استعادة SEO ${Date.now()}`,
      leadAr: "قائد المشروع",
      axes: [{ ar: "محور" }],
      impacts: [{ ar: "أثر" }],
      ...FULL_SEO,
    });
    createdIds.push(created.id);

    const revisions = await listRevisionsForItem(created.id);
    const createdRevision = revisions.find((r) => r.change_summary === "Created");
    assert.ok(createdRevision);

    await updateResearchProjectDraft(sa, created.id, {
      orgUnitId: ORG_DEPT,
      researchGroupId: group.id,
      titleAr: created.title_ar,
      leadAr: "قائد المشروع",
      axes: [{ ar: "محور" }],
      impacts: [{ ar: "أثر" }],
      ...CLEARED_SEO,
    });

    await restoreRevision(sa, created.id, createdRevision.id);
    const restored = await getResearchProjectById(created.id);
    assertSeoExact(restored, FULL_SEO_COLUMNS);
    assert.equal(restored?.og_image, FULL_SEO.ogImage);
  });

  it("restores originally empty SEO when later values were filled in", async () => {
    const created = await createNews(sa, {
      orgUnitId: ORG_CENTRE,
      titleAr: `خبر SEO فارغ ${Date.now()}`,
      summaryAr: "ملخص",
    });
    createdIds.push(created.id);

    const revisions = await listRevisionsForItem(created.id);
    const createdRevision = revisions.find((r) => r.change_summary === "Created");
    assert.ok(createdRevision);
    assertSeoExact(createdRevision.snapshot as SeoColumns, {
      meta_title_ar: null,
      meta_title_en: null,
      meta_description_ar: null,
      meta_description_en: null,
      og_image: null,
    });

    await updateNewsDraft(sa, created.id, {
      orgUnitId: ORG_CENTRE,
      titleAr: created.title_ar,
      summaryAr: "ملخص",
      ...FULL_SEO,
    });
    assertSeoExact(await getNewsById(created.id), FULL_SEO_COLUMNS);

    await restoreRevision(sa, created.id, createdRevision.id);
    assertSeoExact(await getNewsById(created.id), {
      meta_title_ar: null,
      meta_title_en: null,
      meta_description_ar: null,
      meta_description_en: null,
      og_image: null,
    });
  });

  it("restores localized null independently (EN cleared, AR kept in snapshot)", async () => {
    const created = await createPartner(sa, {
      orgUnitId: ORG_CENTRE,
      titleAr: `شريك SEO جزئي ${Date.now()}`,
      labelAr: "تونس",
      partnerScope: "intl",
      partnerDate: "يناير 2026",
      metaTitleAr: "عنوان عربي فقط",
      metaDescriptionAr: "وصف عربي فقط",
      ogImage: null,
    });
    createdIds.push(created.id);

    const expected: SeoColumns = {
      meta_title_ar: "عنوان عربي فقط",
      meta_title_en: null,
      meta_description_ar: "وصف عربي فقط",
      meta_description_en: null,
      og_image: null,
    };

    const revisions = await listRevisionsForItem(created.id);
    const createdRevision = revisions.find((r) => r.change_summary === "Created");
    assert.ok(createdRevision);
    assertSeoExact(createdRevision.snapshot as SeoColumns, expected);

    await updatePartnerDraft(sa, created.id, {
      orgUnitId: ORG_CENTRE,
      titleAr: created.title_ar,
      labelAr: "تونس",
      partnerScope: "intl",
      partnerDate: "يناير 2026",
      metaTitleAr: "تم التغيير",
      metaTitleEn: "Now has EN",
      metaDescriptionAr: "وصف متغير",
      metaDescriptionEn: "EN desc",
      ogImage: "/media/x.webp",
    });

    await restoreRevision(sa, created.id, createdRevision.id);
    assertSeoExact(await getPartnerById(created.id), expected);
  });
});
