import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { query } from "@/lib/db";

export type PublicNewsItem = {
  img: string | null;
  label: string;
  title: string;
};

type PayloadSource = {
  title_ar: string;
  label_ar: string | null;
  image_path: string | null;
};

/** P1 public object for a news row (persisted to content_items.live_payload). */
export function buildNewsPayload(row: PayloadSource): PublicNewsItem {
  return {
    img: row.image_path,
    label: row.label_ar?.trim() || "خبر",
    title: row.title_ar.trim(),
  };
}

function publicNewsPath(): string {
  // cms/ -> repo root data/news.json
  return join(process.cwd(), "..", "data", "news.json");
}

/**
 * P1: Arabic plain-text subset for existing SPA contract.
 * Emits every row whose live_payload is set (published, or under revision with the public
 * copy still live), NOT just status = 'published'.
 */
export async function rebuildPublicNewsJson(): Promise<{ count: number; path: string }> {
  const result = await query<{ live_payload: PublicNewsItem }>(
    `SELECT live_payload
     FROM content_items
     WHERE content_type = 'news' AND live_payload IS NOT NULL
     ORDER BY live_at DESC NULLS LAST, created_at ASC`,
  );

  const news: PublicNewsItem[] = result.rows.map((row) => ({
    img: row.live_payload.img ?? null,
    label: row.live_payload.label?.trim() || "خبر",
    title: (row.live_payload.title ?? "").trim(),
  }));

  const path = publicNewsPath();
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  // Backup previous public file once per write (local safety)
  if (existsSync(path)) {
    writeFileSync(`${path}.bak`, readFileSync(path));
  }

  const payload = JSON.stringify({ news }, null, 4);
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, payload, "utf8");
  renameSync(tmp, path);

  // Validate readable
  const check = JSON.parse(readFileSync(path, "utf8")) as { news: PublicNewsItem[] };
  if (!Array.isArray(check.news)) {
    throw new Error("Published news.json invalid after write");
  }

  return { count: check.news.length, path };
}
