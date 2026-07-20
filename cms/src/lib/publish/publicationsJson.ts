import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { query } from "@/lib/db";

export type PublicPubItem = {
  t: string;
  type: "collective" | "individual";
  dept: string;
  desc: string;
};

type PublishedRow = {
  title_ar: string;
  pub_kind: "collective" | "individual" | null;
  label_ar: string | null;
  summary_ar: string | null;
  image_path: string | null;
  published_at: Date | null;
};

function publicPublicationsPath(): string {
  return join(process.cwd(), "..", "data", "publications.json");
}

/** P1: Arabic plain-text pubs + covers; covers.length === pubs.length */
export async function rebuildPublicPublicationsJson(): Promise<{
  count: number;
  path: string;
}> {
  const result = await query<PublishedRow>(
    `SELECT title_ar, pub_kind, label_ar, summary_ar, image_path, published_at
     FROM content_items
     WHERE content_type = 'publication' AND status = 'published'
     ORDER BY published_at DESC NULLS LAST, updated_at DESC`,
  );

  const pubs: PublicPubItem[] = [];
  const covers: string[] = [];

  for (const row of result.rows) {
    const cover = row.image_path?.trim();
    if (!cover) {
      throw new Error(`Published publication "${row.title_ar}" is missing cover path`);
    }
    pubs.push({
      t: row.title_ar.trim(),
      type: row.pub_kind === "individual" ? "individual" : "collective",
      dept: row.label_ar?.trim() || "",
      desc: row.summary_ar?.trim() || "",
    });
    covers.push(cover);
  }

  if (covers.length !== pubs.length) {
    throw new Error("covers.length must equal pubs.length");
  }

  const path = publicPublicationsPath();
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (existsSync(path)) writeFileSync(`${path}.bak`, readFileSync(path));

  const payload = JSON.stringify({ pubs, covers }, null, 4);
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, payload, "utf8");
  renameSync(tmp, path);

  const check = JSON.parse(readFileSync(path, "utf8")) as {
    pubs: unknown;
    covers: unknown;
  };
  if (!Array.isArray(check.pubs) || !Array.isArray(check.covers)) {
    throw new Error("Published publications.json invalid after write");
  }
  if (check.covers.length !== check.pubs.length) {
    throw new Error("Published publications.json covers/pubs length mismatch");
  }

  return { count: pubs.length, path };
}
