import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { getUserOrgIds } from "@/lib/content/permissions";
import {
  buildDirectorPayload,
  writePublicDirectorJson,
  writePublicDirectorJsonAsync,
  type PublicDirector,
} from "@/lib/publish/directorJson";

export type SiteDirectorRow = {
  id: number;
  quote_ar: string;
  quote_en: string;
  name_ar: string;
  name_en: string;
  role_ar: string;
  role_en: string;
  portrait_path: string | null;
  portrait_alt_ar: string | null;
  portrait_alt_en: string | null;
  updated_by: string | null;
  updated_at: Date;
  published_at: Date | null;
};

export type DirectorInput = {
  quoteAr: string;
  quoteEn: string;
  nameAr: string;
  nameEn: string;
  roleAr: string;
  roleEn: string;
  portraitPath?: string | null;
  portraitAltAr?: string | null;
  portraitAltEn?: string | null;
};

/** Super Admin, or Reviewer with centre_wide org scope. */
export async function canManageDirector(user: SessionUser): Promise<boolean> {
  if (user.role === "super_admin") return true;
  if (user.role !== "reviewer") return false;
  const orgs = await getUserOrgIds(user.id);
  return orgs.includes("centre_wide");
}

export async function getSiteDirector(): Promise<SiteDirectorRow | null> {
  const result = await query<SiteDirectorRow>(
    `SELECT * FROM site_director WHERE id = 1`,
  );
  return result.rows[0] ?? null;
}

function validate(input: DirectorInput) {
  if (!input.quoteAr.trim()) throw new Error("Arabic quote is required");
  if (!input.quoteEn.trim()) throw new Error("English quote is required");
  if (!input.nameAr.trim()) throw new Error("Arabic name is required");
  if (!input.roleAr.trim()) throw new Error("Arabic role is required");
}

export async function saveSiteDirector(
  user: SessionUser,
  input: DirectorInput,
): Promise<SiteDirectorRow> {
  if (!(await canManageDirector(user))) {
    throw new Error("No permission to edit director word");
  }
  validate(input);

  const result = await query<SiteDirectorRow>(
    `INSERT INTO site_director (
      id, quote_ar, quote_en, name_ar, name_en, role_ar, role_en,
      portrait_path, portrait_alt_ar, portrait_alt_en, updated_by, updated_at
    ) VALUES (
      1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      quote_ar = EXCLUDED.quote_ar,
      quote_en = EXCLUDED.quote_en,
      name_ar = EXCLUDED.name_ar,
      name_en = EXCLUDED.name_en,
      role_ar = EXCLUDED.role_ar,
      role_en = EXCLUDED.role_en,
      portrait_path = EXCLUDED.portrait_path,
      portrait_alt_ar = EXCLUDED.portrait_alt_ar,
      portrait_alt_en = EXCLUDED.portrait_alt_en,
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW()
    RETURNING *`,
    [
      input.quoteAr.trim(),
      input.quoteEn.trim(),
      input.nameAr.trim(),
      input.nameEn.trim() || input.nameAr.trim(),
      input.roleAr.trim(),
      input.roleEn.trim() || input.roleAr.trim(),
      input.portraitPath?.trim() || null,
      input.portraitAltAr?.trim() || null,
      input.portraitAltEn?.trim() || null,
      user.id,
    ],
  );
  const row = result.rows[0];
  await writeAudit({
    actor: user,
    action: "director.save",
    entityType: "site_director",
    entityId: "1",
    summary: "Saved director word draft",
  });
  return row;
}

export async function publishSiteDirector(user: SessionUser): Promise<{
  row: SiteDirectorRow;
  payload: PublicDirector;
}> {
  if (!(await canManageDirector(user))) {
    throw new Error("No permission to publish director word");
  }
  const existing = await getSiteDirector();
  if (!existing) throw new Error("Director record missing");
  validate({
    quoteAr: existing.quote_ar,
    quoteEn: existing.quote_en,
    nameAr: existing.name_ar,
    nameEn: existing.name_en,
    roleAr: existing.role_ar,
    roleEn: existing.role_en,
  });
  if (!existing.portrait_path?.trim()) {
    throw new Error("Portrait image is required before publishing");
  }

  const payload = buildDirectorPayload(existing);
  const beforePublished = existing.published_at;
  try {
    await query(
      `UPDATE site_director SET published_at = NOW(), updated_by = $1, updated_at = NOW() WHERE id = 1`,
      [user.id],
    );
    const row = (await getSiteDirector())!;
    await writePublicDirectorJsonAsync(row);
    await writeAudit({
      actor: user,
      action: "director.publish",
      entityType: "site_director",
      entityId: "1",
      summary: "Published director word",
    });
    return { row, payload };
  } catch (err) {
    await query(
      `UPDATE site_director SET published_at = $1, updated_at = NOW() WHERE id = 1`,
      [beforePublished],
    );
    throw err;
  }
}
