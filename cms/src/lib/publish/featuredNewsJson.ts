import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

export const FEATURED_NEWS_JSON_MAX = 10;

export type PublicFeaturedNews = {
  ids: string[];
};

function publicFeaturedNewsPath(): string {
  return join(process.cwd(), "..", "data", "featured-news.json");
}

export function writePublicFeaturedNewsJson(ids: string[]): { path: string; count: number } {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids) {
    const id = String(raw || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    unique.push(id);
    if (unique.length >= FEATURED_NEWS_JSON_MAX) break;
  }
  const payload: PublicFeaturedNews = { ids: unique };
  const path = publicFeaturedNewsPath();
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (existsSync(path)) writeFileSync(`${path}.bak`, readFileSync(path));
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(payload, null, 4)}\n`, "utf8");
  renameSync(tmp, path);
  return { path, count: unique.length };
}
