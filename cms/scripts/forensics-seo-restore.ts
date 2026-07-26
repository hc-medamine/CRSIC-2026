/**
 * Forensics: detect SEO fields that may have been lost by a prior revision restore.
 *
 * Does NOT modify content. Writes a recovery report under cms/tmp/.
 *
 * Usage (from cms/): npm run db:forensics:seo-restore
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { query, pool } from "../src/lib/db";
import { SEO_SNAPSHOT_COLUMNS, type SeoSnapshotColumn } from "../src/lib/content/seo";

type RestoreRow = {
  content_item_id: string;
  content_type: string;
  title_ar: string;
  status: string;
  restore_revision_id: string;
  restore_revision_number: number;
  restore_summary: string;
  restore_at: Date;
  source_revision_number: number | null;
  source_snapshot: Record<string, unknown> | null;
  meta_title_ar: string | null;
  meta_title_en: string | null;
  meta_description_ar: string | null;
  meta_description_en: string | null;
  og_image: string | null;
};

type FieldDiff = {
  field: SeoSnapshotColumn;
  current: string | null;
  sourceRevision: string | null;
  kind: "lost" | "differ" | "gained";
};

type Candidate = {
  id: string;
  contentType: string;
  status: string;
  titleAr: string;
  restoreAt: string;
  restoreSummary: string;
  sourceRevisionNumber: number | null;
  diffs: FieldDiff[];
};

function norm(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function classify(current: string | null, source: string | null): FieldDiff["kind"] | null {
  if (current === source) return null;
  if (source && !current) return "lost";
  if (!source && current) return "gained";
  return "differ";
}

async function main() {
  const result = await query<RestoreRow>(
    `WITH restores AS (
       SELECT
         cr.id AS restore_revision_id,
         cr.content_item_id,
         cr.revision_number AS restore_revision_number,
         cr.change_summary AS restore_summary,
         cr.created_at AS restore_at,
         CASE
           WHEN cr.change_summary ~ 'Restored from revision #([0-9]+)'
           THEN (regexp_match(cr.change_summary, 'Restored from revision #([0-9]+)'))[1]::int
           ELSE NULL
         END AS source_revision_number
       FROM content_revisions cr
       WHERE cr.change_summary LIKE 'Restored from revision%'
     )
     SELECT
       r.content_item_id,
       ci.content_type,
       ci.title_ar,
       ci.status,
       r.restore_revision_id,
       r.restore_revision_number,
       r.restore_summary,
       r.restore_at,
       r.source_revision_number,
       src.snapshot AS source_snapshot,
       ci.meta_title_ar,
       ci.meta_title_en,
       ci.meta_description_ar,
       ci.meta_description_en,
       ci.og_image
     FROM restores r
     JOIN content_items ci ON ci.id = r.content_item_id
     LEFT JOIN content_revisions src
       ON src.content_item_id = r.content_item_id
      AND src.revision_number = r.source_revision_number
     ORDER BY r.restore_at DESC`,
  );

  const candidates: Candidate[] = [];
  let restoreEvents = 0;
  let unmatchedSource = 0;

  for (const row of result.rows) {
    restoreEvents += 1;
    if (row.source_revision_number == null || !row.source_snapshot) {
      unmatchedSource += 1;
      continue;
    }

    const current: Record<SeoSnapshotColumn, string | null> = {
      meta_title_ar: norm(row.meta_title_ar),
      meta_title_en: norm(row.meta_title_en),
      meta_description_ar: norm(row.meta_description_ar),
      meta_description_en: norm(row.meta_description_en),
      og_image: norm(row.og_image),
    };

    const diffs: FieldDiff[] = [];
    for (const field of SEO_SNAPSHOT_COLUMNS) {
      const sourceVal = norm(row.source_snapshot[field]);
      const kind = classify(current[field], sourceVal);
      if (!kind) continue;
      // Focus recovery on loss / divergence from the restored revision.
      if (kind === "gained") continue;
      diffs.push({
        field,
        current: current[field],
        sourceRevision: sourceVal,
        kind,
      });
    }

    if (diffs.length === 0) continue;

    candidates.push({
      id: row.content_item_id,
      contentType: row.content_type,
      status: row.status,
      titleAr: row.title_ar,
      restoreAt: new Date(row.restore_at).toISOString(),
      restoreSummary: row.restore_summary,
      sourceRevisionNumber: row.source_revision_number,
      diffs,
    });
  }

  // Deduplicate by content id (keep latest restore's diffs).
  const byId = new Map<string, Candidate>();
  for (const c of candidates) {
    if (!byId.has(c.id)) byId.set(c.id, c);
  }
  const unique = [...byId.values()];
  const lostCount = unique.filter((c) => c.diffs.some((d) => d.kind === "lost")).length;

  const report = {
    generatedAt: new Date().toISOString(),
    note:
      "Read-only report. Do not auto-overwrite current SEO values — review each candidate before recovery.",
    summary: {
      restoreEvents,
      unmatchedSourceRevision: unmatchedSource,
      candidateItems: unique.length,
      itemsWithPossibleSeoLoss: lostCount,
      seoColumnsChecked: [...SEO_SNAPSHOT_COLUMNS],
    },
    candidates: unique,
  };

  const outDir = join(process.cwd(), "tmp");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `seo-restore-forensics-${Date.now()}.json`);
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");

  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`\nReport written: ${outPath}`);
  if (unique.length === 0) {
    console.log("No SEO restore candidates requiring recovery review.");
  } else {
    console.log(`\n${unique.length} item(s) may need SEO recovery review:`);
    for (const c of unique.slice(0, 20)) {
      const fields = c.diffs.map((d) => `${d.field}(${d.kind})`).join(", ");
      console.log(`- [${c.contentType}] ${c.id} — ${c.titleAr} — ${fields}`);
    }
    if (unique.length > 20) console.log(`… and ${unique.length - 20} more`);
  }

  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
