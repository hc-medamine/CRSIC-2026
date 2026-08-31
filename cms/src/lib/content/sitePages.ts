import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { canManageDirector } from "@/lib/content/director";
import { SITE_PAGE_FIELD_KEYS } from "@/lib/content/sitePageKeys";
import { readSitePagesSeedFromLocales } from "@/lib/content/sitePagesSeed";
import {
  buildSitePagesPayload,
  writePublicSitePagesJson,
  type PublicSitePages,
} from "@/lib/publish/sitePagesJson";

export type SitePagesRow = {
  id: number;
  fields_ar: Record<string, string>;
  fields_en: Record<string, string>;
  email: string;
  phone: string;
  webmail_url: string;
  webmail_text: string;
  updated_by: string | null;
  updated_at: Date;
  published_at: Date | null;
};

export type SitePagesInput = {
  fieldsAr: Record<string, string>;
  fieldsEn: Record<string, string>;
  email: string;
  phone: string;
  webmailUrl: string;
  webmailText: string;
};

export const canManageSitePages = canManageDirector;

function asStringMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const src = value as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const key of SITE_PAGE_FIELD_KEYS) {
    const v = src[key];
    if (typeof v === "string") out[key] = v;
  }
  return out;
}

function normalizeRow(row: Record<string, unknown>): SitePagesRow {
  return {
    id: Number(row.id),
    fields_ar: asStringMap(row.fields_ar),
    fields_en: asStringMap(row.fields_en),
    email: String(row.email ?? ""),
    phone: String(row.phone ?? ""),
    webmail_url: String(row.webmail_url ?? ""),
    webmail_text: String(row.webmail_text ?? ""),
    updated_by: row.updated_by ? String(row.updated_by) : null,
    updated_at: row.updated_at as Date,
    published_at: (row.published_at as Date | null) ?? null,
  };
}

function sanitizeFields(input: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of SITE_PAGE_FIELD_KEYS) {
    const v = input[key];
    out[key] = typeof v === "string" ? v.trim() : "";
  }
  return out;
}

function validate(input: SitePagesInput) {
  const ar = sanitizeFields(input.fieldsAr);
  if (!ar.about_hero_h1) throw new Error("Arabic About heading is required");
  if (!ar.contact_addr_val) throw new Error("Arabic contact address is required");
  if (!input.email.trim() || !input.email.includes("@")) throw new Error("Email is required");
  if (!input.phone.trim()) throw new Error("Phone is required");
  const url = input.webmailUrl.trim();
  if (!url || !/^https?:\/\//i.test(url)) throw new Error("Webmail URL must start with http");
  if (!input.webmailText.trim()) throw new Error("Webmail label is required");
}

async function seedIfMissing(): Promise<void> {
  const existing = await query<{ id: number }>(`SELECT id FROM site_pages WHERE id = 1`);
  if (existing.rows[0]) return;
  const seed = readSitePagesSeedFromLocales();
  if (!seed) return;
  await query(
    `INSERT INTO site_pages (
      id, fields_ar, fields_en, email, phone, webmail_url, webmail_text, updated_at
    ) VALUES (1, $1::jsonb, $2::jsonb, $3, $4, $5, $6, NOW())
    ON CONFLICT (id) DO NOTHING`,
    [
      JSON.stringify(seed.fieldsAr),
      JSON.stringify(seed.fieldsEn),
      seed.email,
      seed.phone,
      seed.webmailUrl,
      seed.webmailText,
    ],
  );
}

export async function getSitePages(): Promise<SitePagesRow | null> {
  await seedIfMissing();
  const result = await query(`SELECT * FROM site_pages WHERE id = 1`);
  const row = result.rows[0];
  return row ? normalizeRow(row as Record<string, unknown>) : null;
}

export async function saveSitePages(
  user: SessionUser,
  input: SitePagesInput,
): Promise<SitePagesRow> {
  if (!(await canManageSitePages(user))) {
    throw new Error("No permission to edit site pages");
  }
  validate(input);
  const fieldsAr = sanitizeFields(input.fieldsAr);
  const fieldsEn = sanitizeFields(input.fieldsEn);

  const result = await query(
    `INSERT INTO site_pages (
      id, fields_ar, fields_en, email, phone, webmail_url, webmail_text, updated_by, updated_at
    ) VALUES (
      1, $1::jsonb, $2::jsonb, $3, $4, $5, $6, $7, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      fields_ar = EXCLUDED.fields_ar,
      fields_en = EXCLUDED.fields_en,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      webmail_url = EXCLUDED.webmail_url,
      webmail_text = EXCLUDED.webmail_text,
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW()
    RETURNING *`,
    [
      JSON.stringify(fieldsAr),
      JSON.stringify(fieldsEn),
      input.email.trim(),
      input.phone.trim(),
      input.webmailUrl.trim(),
      input.webmailText.trim(),
      user.id,
    ],
  );
  const row = normalizeRow(result.rows[0] as Record<string, unknown>);
  await writeAudit({
    actor: user,
    action: "site_pages.save",
    entityType: "site_pages",
    entityId: "1",
    summary: "Saved site pages draft",
  });
  return row;
}

export async function publishSitePages(user: SessionUser): Promise<{
  row: SitePagesRow;
  payload: PublicSitePages;
}> {
  if (!(await canManageSitePages(user))) {
    throw new Error("No permission to publish site pages");
  }
  const existing = await getSitePages();
  if (!existing) throw new Error("Site pages record missing");
  validate({
    fieldsAr: existing.fields_ar,
    fieldsEn: existing.fields_en,
    email: existing.email,
    phone: existing.phone,
    webmailUrl: existing.webmail_url,
    webmailText: existing.webmail_text,
  });

  const payload = buildSitePagesPayload(existing);
  const beforePublished = existing.published_at;
  try {
    await query(
      `UPDATE site_pages SET published_at = NOW(), updated_by = $1, updated_at = NOW() WHERE id = 1`,
      [user.id],
    );
    const row = (await getSitePages())!;
    writePublicSitePagesJson(row);
    await writeAudit({
      actor: user,
      action: "site_pages.publish",
      entityType: "site_pages",
      entityId: "1",
      summary: "Published site pages",
    });
    return { row, payload };
  } catch {
    await query(
      `UPDATE site_pages SET published_at = $1, updated_at = NOW() WHERE id = 1`,
      [beforePublished],
    );
    throw new Error("Publish failed — About left on locales");
  }
}
