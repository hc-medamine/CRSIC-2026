import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { query } from "@/lib/db";

export type PublicNewsItem = {
  img: string | null;
  label: string;
  title: string;
};

type PublishedRow = {
  id: string;
  title_ar: string;
  label_ar: string | null;
  image_path: string | null;
  public_slug: string | null;
  published_at: Date | null;
};

function publicNewsPath(): string {
  // cms/ -> repo root data/news.json
  return join(process.cwd(), "..", "data", "news.json");
}

/** P1: Arabic plain-text subset for existing SPA contract */
export async function rebuildPublicNewsJson(): Promise<{ count: number; path: string }> {
  const result = await query<PublishedRow>(
    `SELECT id, title_ar, label_ar, image_path, public_slug, published_at
     FROM content_items
     WHERE content_type = 'news' AND status = 'published'
     ORDER BY published_at DESC NULLS LAST, updated_at DESC`,
  );

  const news: PublicNewsItem[] = result.rows.map((row) => ({
    img: row.image_path,
    label: row.label_ar?.trim() || "خبر",
    title: row.title_ar.trim(),
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
