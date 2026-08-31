import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_CONTACT, pickLocaleFields } from "./sitePageKeys";

export type SitePagesSeed = {
  fieldsAr: Record<string, string>;
  fieldsEn: Record<string, string>;
  email: string;
  phone: string;
  webmailUrl: string;
  webmailText: string;
};

function localesDir(): string {
  return join(process.cwd(), "..", "data", "locales");
}

function readLocaleDict(lang: "ar" | "en"): Record<string, unknown> | null {
  const path = join(localesDir(), `${lang}.json`);
  if (!existsSync(path)) return null;
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!parsed || typeof parsed !== "object") return null;
  return parsed as Record<string, unknown>;
}

/** Read About/org/contact/coop bodies from locale files. Null if either file is missing. */
export function readSitePagesSeedFromLocales(): SitePagesSeed | null {
  const ar = readLocaleDict("ar");
  const en = readLocaleDict("en");
  if (!ar || !en) return null;
  return {
    fieldsAr: pickLocaleFields(ar),
    fieldsEn: pickLocaleFields(en),
    email: DEFAULT_CONTACT.email,
    phone: DEFAULT_CONTACT.phone,
    webmailUrl: DEFAULT_CONTACT.webmail_url,
    webmailText: DEFAULT_CONTACT.webmail_text,
  };
}
