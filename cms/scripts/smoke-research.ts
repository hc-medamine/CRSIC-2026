/**
 * Research group + project smoke (libs + DB). Four-eyes path:
 * SA draft → submit → Reviewer approve → publish → verify public JSON → cleanup.
 * (Uses SA as author because research type claims may already be held by a real Editor.)
 *
 * Usage: npm run db:smoke:research
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { query } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";
import type { SessionUser } from "../src/lib/auth/session";
import {
  approveResearchGroup,
  createResearchGroup,
  publishResearchGroup,
  submitResearchGroup,
} from "../src/lib/content/researchGroups";
import {
  approveResearchProject,
  createResearchProject,
  publishResearchProject,
  submitResearchProject,
} from "../src/lib/content/researchProjects";
import { cleanupSmokeData } from "./cleanup-smoke-data";

const ORG = "dept_quran_fiqh";

async function ensureReviewer(email: string, password: string, displayName: string): Promise<SessionUser> {
  const existing = await query<{ id: string }>(`SELECT id FROM users WHERE email = $1`, [email]);
  let id: string;
  const passwordHash = await hashPassword(password);
  if (existing.rows[0]) {
    id = existing.rows[0].id;
    await query(
      `UPDATE users SET password_hash = $2, role = 'reviewer', is_active = TRUE, display_name = $3,
         is_away = FALSE, away_until = NULL, away_delegate_user_id = NULL,
         role_before_away = NULL, updated_at = NOW()
       WHERE id = $1`,
      [id, passwordHash, displayName],
    );
  } else {
    const inserted = await query<{ id: string }>(
      `INSERT INTO users (email, password_hash, display_name, role)
       VALUES ($1, $2, $3, 'reviewer') RETURNING id`,
      [email, passwordHash, displayName],
    );
    id = inserted.rows[0].id;
  }
  // Do not steal real reviewer org claims — approve path is role + four-eyes only.
  return { id, email, displayName, role: "reviewer" };
}

async function loadSuperAdmin(): Promise<SessionUser> {
  let seedEmail = process.env.SEED_SUPER_ADMIN_EMAIL || "";
  try {
    const envText = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    const m = envText.match(/^SEED_SUPER_ADMIN_EMAIL=(.+)$/m);
    if (m) seedEmail = m[1].trim().replace(/^["']|["']$/g, "");
  } catch {
    /* optional */
  }
  const result = await query<{
    id: string;
    email: string;
    display_name: string;
  }>(
    seedEmail
      ? `SELECT id, email, display_name FROM users
         WHERE role = 'super_admin' AND is_active = TRUE AND email = $1 LIMIT 1`
      : `SELECT id, email, display_name FROM users
         WHERE role = 'super_admin' AND is_active = TRUE
         ORDER BY created_at ASC LIMIT 1`,
    seedEmail ? [seedEmail] : [],
  );
  const row = result.rows[0];
  if (!row) throw new Error("No active Super Admin for research smoke authoring");
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: "super_admin",
  };
}

function readJsonItems(rel: string): unknown[] {
  const path = join(process.cwd(), "..", "data", rel);
  if (!existsSync(path)) throw new Error(`Missing ${rel}`);
  const data = JSON.parse(readFileSync(path, "utf8")) as { items?: unknown[] };
  return Array.isArray(data.items) ? data.items : [];
}

async function main() {
  console.log("Pre-smoke cleanup…");
  console.log(await cleanupSmokeData());

  const keep = process.env.KEEP_RESEARCH_SMOKE === "1";
  try {
    await runSmoke();
    if (keep) {
      console.log("KEEP_RESEARCH_SMOKE=1 — leaving published smoke items for SPA check.");
    }
  } finally {
    if (!keep) {
      console.log("Post-smoke cleanup…");
      console.log(await cleanupSmokeData());
    }
  }
}

async function runSmoke() {
  const reviewerPass = process.env.SMOKE_REVIEWER_PASSWORD || "SmokeReviewer1!";
  const stamp = new Date().toISOString();

  console.log("Ensuring smoke reviewer + loading SA author…");
  const reviewer = await ensureReviewer("smoke.reviewer@crsic.dz", reviewerPass, "Smoke Reviewer");
  const author = await loadSuperAdmin();

  console.log("SA creates + submits research group…");
  const group = await createResearchGroup(author, {
    orgUnitId: ORG,
    titleAr: `Smoke فرقة بحث ${stamp}`,
    titleEn: `Smoke research group ${stamp}`,
    summaryAr: "ملخص تجريبي لمسار الدخان.",
    summaryEn: "Smoke summary for research group path.",
    leadAr: "د. دخان",
    leadEn: "Dr. Smoke",
    members: [],
    enStatus: "ready",
  });
  await submitResearchGroup(author, group.id, true);

  console.log("Four-eyes: author approve must fail…");
  let blocked = false;
  try {
    await approveResearchGroup(author, group.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Four-eyes") || msg.includes("Reviewer role required")) blocked = true;
    else throw err;
  }
  if (!blocked) throw new Error("Author was able to approve own research group");

  console.log("Reviewer approves + publishes research group…");
  await approveResearchGroup(reviewer, group.id);
  const publishedGroup = await publishResearchGroup(reviewer, group.id);
  if (publishedGroup.status !== "published") throw new Error("Group not published");

  const groupsJson = readJsonItems("research-groups.json");
  const groupLive = groupsJson.find(
    (g) => g && typeof g === "object" && (g as { id?: string }).id === group.id,
  );
  if (!groupLive) throw new Error("Published research-groups.json missing smoke group");
  console.log("OK group in research-groups.json");

  console.log("SA creates + submits research project under smoke group…");
  const project = await createResearchProject(author, {
    orgUnitId: ORG,
    researchGroupId: group.id,
    titleAr: `Smoke مشروع ${stamp}`,
    titleEn: `Smoke research project ${stamp}`,
    leadAr: "د. دخان",
    leadEn: "Dr. Smoke",
    bodyAr: "<p>ديباجة تجريبية لمسار الدخان.</p>",
    bodyEn: "",
    questionsAr: "<ul><li>سؤال دخان؟</li></ul>",
    questionsEn: "",
    axes: [{ ar: "محور دخان" }],
    durationAr: "سنة واحدة",
    durationEn: "",
    impacts: [{ ar: "أثر تجريبي" }],
    enStatus: "ready",
  });
  await submitResearchProject(author, project.id, true);

  console.log("Reviewer approves + publishes research project…");
  await approveResearchProject(reviewer, project.id);
  const publishedProject = await publishResearchProject(reviewer, project.id);
  if (publishedProject.status !== "published") throw new Error("Project not published");

  const projectsJson = readJsonItems("research-projects.json");
  const projectLive = projectsJson.find(
    (p) => p && typeof p === "object" && (p as { id?: string }).id === project.id,
  ) as { groupId?: string; slug?: string } | undefined;
  if (!projectLive) throw new Error("Published research-projects.json missing smoke project");
  if (projectLive.groupId !== group.id) {
    throw new Error(`Project groupId mismatch: ${projectLive.groupId} !== ${group.id}`);
  }
  console.log(`OK project in research-projects.json (slug=${projectLive.slug})`);
  console.log("Research smoke passed (group + project four-eyes publish).");
}

main().catch((err) => {
  console.error("Research smoke failed", err);
  process.exit(1);
});
