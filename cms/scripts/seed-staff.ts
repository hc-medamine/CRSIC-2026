/**
 * Local staff seed — Reviewer + Editors from cms/README.md and cms/.env.example.
 * Super Admin is seeded separately via npm run db:seed:super-admin.
 * Desk types are provisional (staff will re-check). After changing them, run
 * `npm run db:reassign:to-claims -- --apply` so authorship follows the new claims.
 */
import { hashPassword } from "../src/lib/auth/password";
import { query } from "../src/lib/db";
import {
  ALL_CONTENT_TYPES,
  allOrgUnitIds,
  replaceUserScopes,
  type ContentType,
} from "../src/lib/users";

type Staff = {
  email: string;
  password: string;
  displayName: string;
  nameAr: string;
  nameEn: string;
  role: "reviewer" | "editor";
  contentTypes: ContentType[];
  orgUnitIds?: string[];
};

async function upsertStaff(staff: Staff, orgUnitIds: string[]) {
  const passwordHash = await hashPassword(staff.password);
  const existing = await query<{ id: string }>(
    `SELECT id FROM users WHERE email = $1`,
    [staff.email.toLowerCase().trim()],
  );

  let id: string;
  if (existing.rows[0]) {
    id = existing.rows[0].id;
    await query(
      `UPDATE users
       SET password_hash = $2, display_name = $3, name_ar = $4, name_en = $5,
           role = $6, is_active = TRUE, updated_at = NOW()
       WHERE id = $1`,
      [id, passwordHash, staff.displayName, staff.nameAr, staff.nameEn, staff.role],
    );
  } else {
    const inserted = await query<{ id: string }>(
      `INSERT INTO users (email, password_hash, display_name, name_ar, name_en, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        staff.email.toLowerCase().trim(),
        passwordHash,
        staff.displayName,
        staff.nameAr,
        staff.nameEn,
        staff.role,
      ],
    );
    id = inserted.rows[0].id;
  }

  await replaceUserScopes(
    id,
    staff.orgUnitIds ?? orgUnitIds,
    staff.contentTypes,
    { role: staff.role },
  );
  console.log(`Seeded ${staff.role}: ${staff.email}`);
}

async function main() {
  const shared =
    process.env.CMS_LOGIN_BUBBLE_EDITOR_PASSWORD?.trim() ||
    process.env.SEED_SUPER_ADMIN_PASSWORD?.trim();
  const reviewerPassword =
    process.env.CMS_LOGIN_BUBBLE_REVIEWER_PASSWORD?.trim() || shared;
  const editorPassword = shared;
  if (!reviewerPassword || !editorPassword) {
    console.error(
      "Required: SEED_SUPER_ADMIN_PASSWORD (or CMS_LOGIN_BUBBLE_REVIEWER_PASSWORD + CMS_LOGIN_BUBBLE_EDITOR_PASSWORD)",
    );
    process.exit(1);
  }

  const orgs = await allOrgUnitIds();
  if (orgs.length === 0) throw new Error("No org units found");

  // Provisional desks — match live CMS as of 2026-08-21. Staff will re-check;
  // change these arrays then re-run seed + `npm run db:reassign:to-claims -- --apply`.
  // Order matters for SPA exclusivity: release overlapping types before taking them.
  const centreWide = ["centre_wide"];
  const researchDepts = [
    "dept_quran_fiqh",
    "dept_thought_dialogue",
    "dept_algeria_history",
    "dept_islamic_civ",
  ];
  const researchTypes: ContentType[] = ["research_group", "research_project"];

  await upsertStaff(
    {
      email: "f.boufatah@crsic.dz",
      password: reviewerPassword,
      displayName: "F. Boufatah",
      nameAr: "فريحة بوفاتح",
      nameEn: "Fariha Boufatah",
      role: "reviewer",
      contentTypes: [...ALL_CONTENT_TYPES],
    },
    orgs,
  );

  await upsertStaff(
    {
      email: "i.megoussi@crsic.dz",
      password: editorPassword,
      displayName: "i.megoussi",
      nameAr: "ايمان مقوسي",
      nameEn: "Megoussi Imen",
      role: "editor",
      contentTypes: ["news", "event", "law", "partner"],
      orgUnitIds: centreWide,
    },
    orgs,
  );

  await upsertStaff(
    {
      email: "t.medjelled@crsic.dz",
      password: editorPassword,
      displayName: "t.medjelled",
      nameAr: "طارق مجلد",
      nameEn: "Tarek Medjelled",
      role: "editor",
      contentTypes: ["publication", "platform"],
      orgUnitIds: centreWide,
    },
    orgs,
  );

  await upsertStaff(
    {
      email: "a.derrafa@crsic.dz",
      password: editorPassword,
      displayName: "a.derrafa",
      nameAr: "a.derrafa",
      nameEn: "a.derrafa",
      role: "editor",
      contentTypes: ["alert"],
      orgUnitIds: centreWide,
    },
    orgs,
  );

  await upsertStaff(
    {
      email: "a.djefal@crsic.dz",
      password: editorPassword,
      displayName: "a.djefal",
      nameAr: "a.djefal",
      nameEn: "a.djefal",
      role: "editor",
      contentTypes: researchTypes,
      orgUnitIds: researchDepts,
    },
    orgs,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
