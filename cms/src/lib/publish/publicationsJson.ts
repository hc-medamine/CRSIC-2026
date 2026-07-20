import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { query } from "@/lib/db";

export type PublicPubItem = {
  t: string;
  type: "collective" | "individual";
  dept: string;
  desc: string;
};

/** Public item plus its cover (kept alongside so covers.length === pubs.length on rebuild). */
export type StoredPubPayload = PublicPubItem & { cover: string };

type PayloadSource = {
  title_ar: string;
  pub_kind: "collective" | "individual" | null;
  label_ar: string | null;
  summary_ar: string | null;
  image_path: string | null;
};

/** P1 public object for a publication row (persisted to content_items.live_payload). */
export function buildPublicationPayload(row: PayloadSource): StoredPubPayload {
  const cover = row.image_path?.trim();
  if (!cover) {
    throw new Error(`Publication "${row.title_ar}" is missing a cover path`);
  }
  return {
    t: row.title_ar.trim(),
    type: row.pub_kind === "individual" ? "individual" : "collective",
    dept: row.label_ar?.trim() || "",
    desc: row.summary_ar?.trim() || "",
    cover,
  };
}

function publicPublicationsPath(): string {
  return join(process.cwd(), "..", "data", "publications.json");
}

/**
 * P1: Arabic plain-text pubs + covers; covers.length === pubs.length.
 * Emits every row whose live_payload is set (published, or under revision with the public
 * copy still live), NOT just status = 'published'.
 */
export async function rebuildPublicPublicationsJson(): Promise<{
  count: number;
  path: string;
}> {
  const result = await query<{ live_payload: StoredPubPayload }>(
    `SELECT live_payload
     FROM content_items
     WHERE content_type = 'publication' AND live_payload IS NOT NULL
     ORDER BY live_at DESC NULLS LAST, created_at ASC`,
  );

  const pubs: PublicPubItem[] = [];
  const covers: string[] = [];

  for (const row of result.rows) {
    const p = row.live_payload;
    const cover = p.cover?.trim();
    if (!cover) {
      throw new Error(`Live publication "${p.t}" is missing cover path`);
    }
    pubs.push({
      t: (p.t ?? "").trim(),
      type: p.type === "individual" ? "individual" : "collective",
      dept: p.dept?.trim() || "",
      desc: p.desc?.trim() || "",
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
