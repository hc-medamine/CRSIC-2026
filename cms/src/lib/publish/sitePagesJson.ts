import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { SITE_PAGE_FIELD_KEYS } from "@/lib/content/sitePageKeys";

export type PublicSitePagesContact = {
  email: string;
  phone: string;
  webmail_url: string;
  webmail_text: string;
};

export type PublicSitePages = {
  ar: Record<string, string>;
  en: Record<string, string>;
  contact: PublicSitePagesContact;
};

export type SitePagesPayloadSource = {
  fields_ar: Record<string, string>;
  fields_en: Record<string, string>;
  email: string;
  phone: string;
  webmail_url: string;
  webmail_text: string;
};

function pickNonEmpty(fields: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of SITE_PAGE_FIELD_KEYS) {
    const v = fields[key];
    if (typeof v === "string" && v.trim()) out[key] = v.trim();
  }
  return out;
}

/** Footer address follows the published contact address (both languages). */
export function buildSitePagesPayload(row: SitePagesPayloadSource): PublicSitePages {
  const ar = pickNonEmpty(row.fields_ar ?? {});
  const en = pickNonEmpty(row.fields_en ?? {});
  if (ar.contact_addr_val) ar.footer_contact_addr = ar.contact_addr_val;
  if (en.contact_addr_val) en.footer_contact_addr = en.contact_addr_val;
  else if (ar.contact_addr_val) en.footer_contact_addr = ar.contact_addr_val;
  return {
    ar,
    en,
    contact: {
      email: row.email.trim(),
      phone: row.phone.trim(),
      webmail_url: row.webmail_url.trim(),
      webmail_text: row.webmail_text.trim(),
    },
  };
}

function publicSitePagesPath(): string {
  return join(process.cwd(), "..", "data", "site-pages.json");
}

export function writePublicSitePagesJson(row: SitePagesPayloadSource): { path: string } {
  const payload = buildSitePagesPayload(row);
  const path = publicSitePagesPath();
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (existsSync(path)) writeFileSync(`${path}.bak`, readFileSync(path));
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  renameSync(tmp, path);
  return { path };
}
