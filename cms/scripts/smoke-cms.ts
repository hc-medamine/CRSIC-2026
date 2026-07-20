/**
 * Local CMS smoke (libs + DB). Does not use HTTP cookies.
 * Creates/uses smoke Editor + Reviewer, runs news four-eyes path, unpublishes,
 * restores data/news.json from .bak when present.
 *
 * Usage: npm run db:smoke
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { query } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";
import type { SessionUser } from "../src/lib/auth/session";
import { allOrgUnitIds, replaceUserScopes } from "../src/lib/users";
import {
  approveNews,
  createNews,
  publishNews,
  submitNews,
  unpublishNews,
} from "../src/lib/content/news";
import { listAuditLog } from "../src/lib/audit";

async function ensureUser(opts: {
  email: string;
  password: string;
  displayName: string;
  role: "editor" | "reviewer";
}): Promise<SessionUser> {
  const existing = await query<{
    id: string;
    email: string;
    display_name: string;
    role: "editor" | "reviewer" | "super_admin";
  }>(`SELECT id, email, display_name, role FROM users WHERE email = $1`, [opts.email]);

  let id: string;
  if (existing.rows[0]) {
    id = existing.rows[0].id;
    const passwordHash = await hashPassword(opts.password);
    await query(
      `UPDATE users SET password_hash = $2, role = $3, is_active = TRUE, display_name = $4, updated_at = NOW()
       WHERE id = $1`,
      [id, passwordHash, opts.role, opts.displayName],
    );
  } else {
    const passwordHash = await hashPassword(opts.password);
    const inserted = await query<{ id: string }>(
      `INSERT INTO users (email, password_hash, display_name, role)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [opts.email, passwordHash, opts.displayName, opts.role],
    );
    id = inserted.rows[0].id;
  }

  const orgs = await allOrgUnitIds();
  const types =
    opts.role === "reviewer"
      ? (["news", "event", "publication"] as const)
      : (["news", "event", "publication"] as const);
  await replaceUserScopes(id, orgs, [...types]);

  return {
    id,
    email: opts.email,
    displayName: opts.displayName,
    role: opts.role,
  };
}

function newsJsonPath() {
  return join(process.cwd(), "..", "data", "news.json");
}

function snapshotNewsJson(): string {
  const path = newsJsonPath();
  const snap = `${path}.smoke-snap`;
  copyFileSync(path, snap);
  return snap;
}

function restoreNewsSnapshot(snap: string) {
  const path = newsJsonPath();
  if (existsSync(snap)) {
    copyFileSync(snap, path);
    console.log("Restored data/news.json from smoke snapshot");
    return;
  }
  const bak = `${path}.bak`;
  if (existsSync(bak)) {
    copyFileSync(bak, path);
    console.log("Restored data/news.json from .bak");
  }
}

async function main() {
  const editorPass = process.env.SMOKE_EDITOR_PASSWORD || "SmokeEditor1!";
  const reviewerPass = process.env.SMOKE_REVIEWER_PASSWORD || "SmokeReviewer1!";

  console.log("Ensuring smoke users…");
  const editor = await ensureUser({
    email: "smoke.editor@crsic.dz",
    password: editorPass,
    displayName: "Smoke Editor",
    role: "editor",
  });
  const reviewer = await ensureUser({
    email: "smoke.reviewer@crsic.dz",
    password: reviewerPass,
    displayName: "Smoke Reviewer",
    role: "reviewer",
  });

  const orgs = await allOrgUnitIds();
  const orgUnitId = orgs[0];
  if (!orgUnitId) throw new Error("No org units seeded");

  console.log("Editor creates + submits news…");
  const draft = await createNews(editor, {
    orgUnitId,
    titleAr: `Smoke news ${new Date().toISOString()}`,
    labelAr: "خبر",
    enStatus: "pending",
  });
  await submitNews(editor, draft.id, true);

  console.log("Four-eyes / role: editor approve must fail…");
  let blocked = false;
  try {
    await approveNews(editor, draft.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Four-eyes") || msg.includes("Reviewer role required")) blocked = true;
    else throw err;
  }
  if (!blocked) throw new Error("Author/editor was able to approve — expected block");

  console.log("Four-eyes: reviewer who authored must fail…");
  const selfDraft = await createNews(reviewer, {
    orgUnitId,
    titleAr: `Smoke self ${Date.now()}`,
    labelAr: "خبر",
    enStatus: "pending",
  });
  await submitNews(reviewer, selfDraft.id, true);
  let fourEyesOk = false;
  try {
    await approveNews(reviewer, selfDraft.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Four-eyes")) fourEyesOk = true;
    else throw err;
  }
  if (!fourEyesOk) throw new Error("Four-eyes check failed — author-reviewer was able to approve");

  console.log("Reviewer approve + publish…");
  const snap = snapshotNewsJson();
  await approveNews(reviewer, draft.id);
  await publishNews(reviewer, draft.id);

  const published = JSON.parse(readFileSync(newsJsonPath(), "utf8")) as {
    news: Array<{ title: string }>;
  };
  if (!published.news.some((n) => n.title.includes("Smoke news"))) {
    throw new Error("Published news.json missing smoke item");
  }

  console.log("Unpublish + restore public JSON…");
  await unpublishNews(reviewer, draft.id);
  restoreNewsSnapshot(snap);

  const audits = await listAuditLog({ limit: 50 });
  const actions = new Set(audits.map((a) => a.action));
  for (const need of [
    "news.create",
    "news.submit",
    "news.approve",
    "news.publish",
    "news.unpublish",
  ]) {
    if (!actions.has(need)) {
      throw new Error(`Missing audit action ${need}`);
    }
  }

  console.log("SMOKE PASS");
  console.log(`Editor: ${editor.email} / (SMOKE_EDITOR_PASSWORD or SmokeEditor1!)`);
  console.log(`Reviewer: ${reviewer.email} / (SMOKE_REVIEWER_PASSWORD or SmokeReviewer1!)`);
}

main().catch((err) => {
  console.error("SMOKE FAIL", err);
  process.exit(1);
});
