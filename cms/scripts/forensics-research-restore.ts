/**
 * Forensics: detect research JSONB wiped by revision restore.
 *
 * Usage (from cms/): npm run db:forensics:research-restore
 */
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { query, pool } from "../src/lib/db";

type GroupRow = {
  id: string;
  status: string;
  title_ar: string;
  created_at: Date;
  updated_at: Date;
  research_members: unknown;
  live_payload: Record<string, unknown> | null;
  revision_count: string;
  restore_revision_count: string;
  latest_restore_at: Date | null;
};

type ProjectRow = {
  id: string;
  status: string;
  title_ar: string;
  created_at: Date;
  updated_at: Date;
  research_axes: unknown;
  research_impacts: unknown;
  live_payload: Record<string, unknown> | null;
  revision_count: string;
  restore_revision_count: string;
  latest_restore_at: Date | null;
};

type Candidate = {
  contentType: "research_group" | "research_project";
  id: string;
  status: string;
  titleAr: string;
  field: string;
  cmsLen: number;
  liveLen: number;
  staticLen: number;
  recoverFrom: "live_payload" | "static_json" | "both" | "none";
  restoreFootprint: boolean;
  cmsEmpty: boolean;
};

function arrLen(v: unknown): number {
  return Array.isArray(v) ? v.length : 0;
}

function loadStaticMap(filename: string): Map<string, Record<string, unknown>> {
  const path = join(process.cwd(), "..", "data", filename);
  const map = new Map<string, Record<string, unknown>>();
  if (!existsSync(path)) return map;
  const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
  const list = Array.isArray(raw) ? raw : [];
  for (const item of list) {
    if (item && typeof item === "object" && "id" in item) {
      const row = item as Record<string, unknown>;
      if (typeof row.id === "string") map.set(row.id, row);
    }
  }
  return map;
}

function recoverFrom(cmsLen: number, liveLen: number, staticLen: number): Candidate["recoverFrom"] {
  const liveOk = liveLen > cmsLen;
  const staticOk = staticLen > cmsLen;
  if (liveOk && staticOk) return "both";
  if (liveOk) return "live_payload";
  if (staticOk) return "static_json";
  return "none";
}

async function main() {
  const groupsStatic = loadStaticMap("research-groups.json");
  const projectsStatic = loadStaticMap("research-projects.json");

  const groups = await query<GroupRow>(
    `SELECT ci.id, ci.status, ci.title_ar, ci.created_at, ci.updated_at,
            ci.research_members, ci.live_payload,
            COUNT(cr.id)::text AS revision_count,
            COUNT(cr.id) FILTER (
              WHERE cr.change_summary LIKE 'Restored from revision%'
            )::text AS restore_revision_count,
            MAX(cr.created_at) FILTER (
              WHERE cr.change_summary LIKE 'Restored from revision%'
            ) AS latest_restore_at
     FROM content_items ci
     LEFT JOIN content_revisions cr ON cr.content_item_id = ci.id
     WHERE ci.content_type = 'research_group'
     GROUP BY ci.id
     ORDER BY ci.created_at ASC`,
  );

  const projects = await query<ProjectRow>(
    `SELECT ci.id, ci.status, ci.title_ar, ci.created_at, ci.updated_at,
            ci.research_axes, ci.research_impacts, ci.live_payload,
            COUNT(cr.id)::text AS revision_count,
            COUNT(cr.id) FILTER (
              WHERE cr.change_summary LIKE 'Restored from revision%'
            )::text AS restore_revision_count,
            MAX(cr.created_at) FILTER (
              WHERE cr.change_summary LIKE 'Restored from revision%'
            ) AS latest_restore_at
     FROM content_items ci
     LEFT JOIN content_revisions cr ON cr.content_item_id = ci.id
     WHERE ci.content_type = 'research_project'
     GROUP BY ci.id
     ORDER BY ci.created_at ASC`,
  );

  const candidates: Candidate[] = [];
  const footprints: Array<Record<string, unknown>> = [];

  for (const row of groups.rows) {
    const cmsLen = arrLen(row.research_members);
    const liveMembers = row.live_payload?.members;
    const liveLen = arrLen(liveMembers);
    const staticRow = groupsStatic.get(row.id);
    const staticLen = arrLen(staticRow?.members);
    const restoreFootprint =
      Number(row.restore_revision_count) > 0 ||
      (cmsLen === 0 &&
        Number(row.revision_count) > 0 &&
        row.updated_at.getTime() > row.created_at.getTime());

    if (cmsLen === 0 && Number(row.revision_count) > 0) {
      footprints.push({
        contentType: "research_group",
        id: row.id,
        titleAr: row.title_ar,
        status: row.status,
        cmsMembers: cmsLen,
        liveMembers: liveLen,
        staticMembers: staticLen,
        revisionCount: Number(row.revision_count),
        restoreRevisionCount: Number(row.restore_revision_count),
        latestRestoreAt: row.latest_restore_at?.toISOString() ?? null,
      });
    }

    if (liveLen > cmsLen || staticLen > cmsLen) {
      candidates.push({
        contentType: "research_group",
        id: row.id,
        status: row.status,
        titleAr: row.title_ar,
        field: "research_members",
        cmsLen,
        liveLen,
        staticLen,
        recoverFrom: recoverFrom(cmsLen, liveLen, staticLen),
        restoreFootprint,
        cmsEmpty: cmsLen === 0,
      });
    }
  }

  for (const row of projects.rows) {
    const axesCms = arrLen(row.research_axes);
    const impactsCms = arrLen(row.research_impacts);
    const liveAxes = arrLen(row.live_payload?.axes);
    const liveImpacts = arrLen(row.live_payload?.impacts);
    const staticRow = projectsStatic.get(row.id);
    const staticAxes = arrLen(staticRow?.axes);
    const staticImpacts = arrLen(staticRow?.impacts);
    const restoreFootprint =
      Number(row.restore_revision_count) > 0 ||
      ((axesCms === 0 || impactsCms === 0) &&
        Number(row.revision_count) > 0 &&
        row.updated_at.getTime() > row.created_at.getTime());

    if ((axesCms === 0 || impactsCms === 0) && Number(row.revision_count) > 0) {
      footprints.push({
        contentType: "research_project",
        id: row.id,
        titleAr: row.title_ar,
        status: row.status,
        cmsAxes: axesCms,
        cmsImpacts: impactsCms,
        liveAxes,
        liveImpacts,
        staticAxes,
        staticImpacts,
        revisionCount: Number(row.revision_count),
        restoreRevisionCount: Number(row.restore_revision_count),
        latestRestoreAt: row.latest_restore_at?.toISOString() ?? null,
      });
    }

    if (liveAxes > axesCms || staticAxes > axesCms) {
      candidates.push({
        contentType: "research_project",
        id: row.id,
        status: row.status,
        titleAr: row.title_ar,
        field: "research_axes",
        cmsLen: axesCms,
        liveLen: liveAxes,
        staticLen: staticAxes,
        recoverFrom: recoverFrom(axesCms, liveAxes, staticAxes),
        restoreFootprint,
        cmsEmpty: axesCms === 0,
      });
    }
    if (liveImpacts > impactsCms || staticImpacts > impactsCms) {
      candidates.push({
        contentType: "research_project",
        id: row.id,
        status: row.status,
        titleAr: row.title_ar,
        field: "research_impacts",
        cmsLen: impactsCms,
        liveLen: liveImpacts,
        staticLen: staticImpacts,
        recoverFrom: recoverFrom(impactsCms, liveImpacts, staticImpacts),
        restoreFootprint,
        cmsEmpty: impactsCms === 0,
      });
    }
  }

  const recoverable = candidates.filter((c) => c.recoverFrom !== "none");

  const recoverySql = [
    "-- Recovery SQL: restore JSONB from live_payload where CMS row is shorter.",
    "-- Review candidates before running. Does NOT rewrite revision snapshots.",
    "",
    "-- research_group.research_members <- live_payload.members",
    `UPDATE content_items ci
SET research_members = COALESCE(ci.live_payload->'members', '[]'::jsonb),
    updated_at = NOW()
WHERE ci.content_type = 'research_group'
  AND ci.live_payload IS NOT NULL
  AND jsonb_typeof(ci.live_payload->'members') = 'array'
  AND jsonb_array_length(COALESCE(ci.research_members, '[]'::jsonb))
      < jsonb_array_length(ci.live_payload->'members');`,
    "",
    "-- research_project.research_axes <- live_payload.axes",
    `UPDATE content_items ci
SET research_axes = COALESCE(ci.live_payload->'axes', '[]'::jsonb),
    updated_at = NOW()
WHERE ci.content_type = 'research_project'
  AND ci.live_payload IS NOT NULL
  AND jsonb_typeof(ci.live_payload->'axes') = 'array'
  AND jsonb_array_length(COALESCE(ci.research_axes, '[]'::jsonb))
      < jsonb_array_length(ci.live_payload->'axes');`,
    "",
    "-- research_project.research_impacts <- live_payload.impacts",
    `UPDATE content_items ci
SET research_impacts = COALESCE(ci.live_payload->'impacts', '[]'::jsonb),
    updated_at = NOW()
WHERE ci.content_type = 'research_project'
  AND ci.live_payload IS NOT NULL
  AND jsonb_typeof(ci.live_payload->'impacts') = 'array'
  AND jsonb_array_length(COALESCE(ci.research_impacts, '[]'::jsonb))
      < jsonb_array_length(ci.live_payload->'impacts');`,
    "",
  ];

  const report = {
    scannedAt: new Date().toISOString(),
    counts: {
      researchGroups: groups.rows.length,
      researchProjects: projects.rows.length,
      emptyJsonbWithRevisions: footprints.length,
      mismatchCandidates: candidates.length,
      recoverableFromLiveOrStatic: recoverable.length,
    },
    footprints,
    candidates,
    recoverable,
  };

  const outDir = join(process.cwd(), "scripts", "output");
  try {
    const { mkdirSync } = await import("node:fs");
    mkdirSync(outDir, { recursive: true });
  } catch {
    /* ignore */
  }
  const reportPath = join(outDir, "research-restore-forensics.json");
  const sqlPath = join(outDir, "research-restore-recovery.sql");
  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  writeFileSync(sqlPath, recoverySql.join("\n"), "utf8");

  console.log("=== Research restore forensics ===");
  console.log(JSON.stringify(report.counts, null, 2));
  console.log("\n--- Recovery candidates ---");
  if (recoverable.length === 0) {
    console.log("(none)");
  } else {
    for (const c of recoverable) {
      console.log(
        `${c.contentType} ${c.id} [${c.field}] cms=${c.cmsLen} live=${c.liveLen} static=${c.staticLen} from=${c.recoverFrom} title=${JSON.stringify(c.titleAr)}`,
      );
    }
  }
  console.log("\n--- Empty JSONB + revisions (restore footprint suspects) ---");
  if (footprints.length === 0) {
    console.log("(none)");
  } else {
    console.log(JSON.stringify(footprints, null, 2));
  }
  console.log(`\nWrote ${reportPath}`);
  console.log(`Wrote ${sqlPath}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
