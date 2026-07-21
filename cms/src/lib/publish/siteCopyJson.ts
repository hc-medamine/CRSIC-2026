import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { query } from "@/lib/db";
import { PAGE_FIELD_KEYS, type PageKey } from "@/lib/content/pageKeys";

/** Public payload shape persisted to content_items.live_payload for content_type = 'page'. */
export type PagePayload = {
  ar: Record<string, string>;
  en: Record<string, string>;
};

type PayloadSource = {
  page_key: string | null;
  page_fields: unknown;
};

function stringMap(value: unknown, allowedKeys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  if (!value || typeof value !== "object") return out;
  const record = value as Record<string, unknown>;
  for (const key of allowedKeys) {
    const v = record[key];
    if (typeof v === "string" && v.trim()) out[key] = v.trim();
  }
  return out;
}

/** Public object for a page row (persisted to content_items.live_payload). */
export function buildPagePayload(row: PayloadSource): PagePayload {
  const pageKey = row.page_key as PageKey | null;
  const allowedKeys = pageKey && PAGE_FIELD_KEYS[pageKey] ? PAGE_FIELD_KEYS[pageKey] : [];
  const fields = (row.page_fields ?? {}) as { ar?: unknown; en?: unknown };
  return {
    ar: stringMap(fields.ar, allowedKeys),
    en: stringMap(fields.en, allowedKeys),
  };
}

function siteCopyPath(): string {
  return join(process.cwd(), "..", "data", "site-copy.json");
}

/**
 * Rebuild data/site-copy.json by merging ALL published pages' live_payload into one
 * `{ ar: { ...every key... }, en: { ... } }` overlay consumed by the public SPA.
 */
export async function rebuildSiteCopyJson(): Promise<{ pages: number; keys: number; path: string }> {
  const result = await query<{ live_payload: PagePayload }>(
    `SELECT live_payload
     FROM content_items
     WHERE content_type = 'page' AND live_payload IS NOT NULL
     ORDER BY live_at ASC NULLS LAST, created_at ASC`,
  );

  const ar: Record<string, string> = {};
  const en: Record<string, string> = {};
  let keyCount = 0;

  for (const row of result.rows) {
    const payload = row.live_payload ?? { ar: {}, en: {} };
    for (const [k, v] of Object.entries(payload.ar ?? {})) {
      ar[k] = v;
      keyCount += 1;
    }
    for (const [k, v] of Object.entries(payload.en ?? {})) {
      en[k] = v;
    }
  }

  const path = siteCopyPath();
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (existsSync(path)) writeFileSync(`${path}.bak`, readFileSync(path));

  const payload = JSON.stringify({ ar, en }, null, 4);
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, payload, "utf8");
  renameSync(tmp, path);

  const check = JSON.parse(readFileSync(path, "utf8")) as { ar: unknown; en: unknown };
  if (!check.ar || typeof check.ar !== "object" || !check.en || typeof check.en !== "object") {
    throw new Error("Published site-copy.json invalid after write");
  }

  return { pages: result.rows.length, keys: keyCount, path };
}
