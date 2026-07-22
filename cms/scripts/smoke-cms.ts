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
import { hashPassword, verifyPassword } from "../src/lib/auth/password";
import type { SessionUser } from "../src/lib/auth/session";
import { allOrgUnitIds, replaceUserScopes } from "../src/lib/users";
import {
  approveNews,
  createNews,
  publishNews,
  requestNewsChanges,
  submitNews,
  unpublishNews,
} from "../src/lib/content/news";
import {
  approvePartner,
  createPartner,
  publishPartner,
  submitPartner,
  unpublishPartner,
} from "../src/lib/content/partners";
import {
  approveAlert,
  createAlert,
  publishAlert,
  submitAlert,
  unpublishAlert,
} from "../src/lib/content/alerts";
import { addComment, listCommentsForItem } from "../src/lib/content/comments";
import {
  confirmReviewOwner,
  escalateItem,
  proposeReviewOwner,
} from "../src/lib/content/delegation";
import {
  confirmPostReview,
  emergencyPublish,
  unpublishPostReview,
} from "../src/lib/content/emergency";
import { clearAway, setAway, refreshUserFromDb } from "../src/lib/content/ooo";
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
  const types = [
    "news",
    "event",
    "publication",
    "partner",
    "alert",
  ] as const;
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

  console.log("Comments: request changes appends thread + author reply…");
  const commentDraft = await createNews(editor, {
    orgUnitId,
    titleAr: `Smoke comments ${Date.now()}`,
    labelAr: "خبر",
    enStatus: "pending",
  });
  await submitNews(editor, commentDraft.id, true);
  await requestNewsChanges(reviewer, commentDraft.id, "Please fix the title");
  const afterRequest = await listCommentsForItem(commentDraft.id);
  if (
    afterRequest.length < 1 ||
    afterRequest[afterRequest.length - 1]?.kind !== "changes_requested" ||
    !afterRequest[afterRequest.length - 1]?.body.includes("Please fix")
  ) {
    throw new Error("Expected changes_requested comment after requestNewsChanges");
  }
  await addComment(editor, commentDraft.id, "Will fix and resubmit");
  const afterReply = await listCommentsForItem(commentDraft.id);
  if (afterReply.length < afterRequest.length + 1) {
    throw new Error("Expected author reply in comment thread");
  }
  let otherEditorBlocked = false;
  const otherEditor = await ensureUser({
    email: "smoke.editor2@crsic.dz",
    password: editorPass,
    displayName: "Smoke Editor 2",
    role: "editor",
  });
  try {
    await addComment(otherEditor, commentDraft.id, "Should not post");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Only the author") || msg.includes("Forbidden")) otherEditorBlocked = true;
    else throw err;
  }
  if (!otherEditorBlocked) {
    throw new Error("Non-author editor was able to comment — expected block");
  }

  console.log("Phase 2 #2: review owner propose/confirm + escalate + OOO…");
  const saEmail = (process.env.SMOKE_SA_EMAIL || "f.chettih@crsic.dz").trim().toLowerCase();
  const saPass = process.env.SMOKE_SA_PASSWORD;
  const saRow = await query<{
    id: string;
    email: string;
    display_name: string;
    role: "super_admin" | "editor" | "reviewer";
    password_hash: string;
  }>(
    saPass
      ? `SELECT id, email, display_name, role, password_hash FROM users
         WHERE email = $1 AND role = 'super_admin' AND is_active = TRUE LIMIT 1`
      : `SELECT id, email, display_name, role, password_hash FROM users
         WHERE role = 'super_admin' AND is_active = TRUE LIMIT 1`,
    saPass ? [saEmail] : [],
  );
  const sa = saRow.rows[0];
  if (!sa) throw new Error("Need an active Super Admin for smoke confirm");
  if (saPass) {
    const ok = await verifyPassword(saPass, sa.password_hash);
    if (!ok) throw new Error(`Super Admin password check failed for ${sa.email}`);
    console.log(`Super Admin credential OK: ${sa.email}`);
  } else {
    console.log(`Super Admin (DB session only, no password check): ${sa.email}`);
  }
  const saUser: SessionUser = {
    id: sa.id,
    email: sa.email,
    displayName: sa.display_name,
    role: "super_admin",
  };

  const delDraft = await createNews(editor, {
    orgUnitId,
    titleAr: `Smoke delegate ${Date.now()}`,
    labelAr: "خبر",
    enStatus: "pending",
  });
  await submitNews(editor, delDraft.id, true);
  await proposeReviewOwner(reviewer, delDraft.id, reviewer.id);
  const pending = await query<{ review_owner_proposed_id: string | null }>(
    `SELECT review_owner_proposed_id FROM content_items WHERE id = $1`,
    [delDraft.id],
  );
  if (!pending.rows[0]?.review_owner_proposed_id) {
    throw new Error("Expected pending review owner proposal");
  }
  await confirmReviewOwner(saUser, delDraft.id, true);
  const owned = await query<{ review_owner_id: string | null }>(
    `SELECT review_owner_id FROM content_items WHERE id = $1`,
    [delDraft.id],
  );
  if (owned.rows[0]?.review_owner_id !== reviewer.id) {
    throw new Error("Expected confirmed review_owner_id");
  }

  await escalateItem(editor, delDraft.id, "Smoke escalate note");
  const escComments = await listCommentsForItem(delDraft.id);
  if (!escComments.some((c) => c.body.includes("Escalation: Smoke escalate note"))) {
    throw new Error("Expected escalation comment");
  }

  await setAway(reviewer, reviewer.id, {
    until: new Date(Date.now() + 86400000),
    elevateEditorId: otherEditor.id,
  });
  const elevated = await refreshUserFromDb(otherEditor.id);
  if (elevated?.role !== "reviewer") {
    throw new Error("Expected elevated Editor to become Reviewer while Away");
  }
  let awayBlocked = false;
  try {
    await approveNews(reviewer, delDraft.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Away")) awayBlocked = true;
    else throw err;
  }
  if (!awayBlocked) throw new Error("Away Reviewer should be frozen from approve");
  await clearAway(reviewer, reviewer.id);
  const reverted = await refreshUserFromDb(otherEditor.id);
  if (reverted?.role !== "editor") {
    throw new Error("Expected elevated user to revert to Editor after clear Away");
  }

  console.log("Phase 2 #3: emergency publish + post-review…");
  const emergSnap = snapshotNewsJson();
  const emergDraft = await createNews(editor, {
    orgUnitId,
    titleAr: `Smoke emergency ${Date.now()}`,
    labelAr: "خبر",
    enStatus: "pending",
  });
  await emergencyPublish(saUser, emergDraft.id, "Smoke emergency reason");
  const emergRow = await query<{
    status: string;
    needs_post_review: boolean;
    emergency_published_by: string | null;
  }>(`SELECT status, needs_post_review, emergency_published_by FROM content_items WHERE id = $1`, [
    emergDraft.id,
  ]);
  if (
    emergRow.rows[0]?.status !== "published" ||
    !emergRow.rows[0]?.needs_post_review ||
    emergRow.rows[0]?.emergency_published_by !== saUser.id
  ) {
    throw new Error("Expected emergency published + needs_post_review");
  }
  const emergJson = JSON.parse(readFileSync(newsJsonPath(), "utf8")) as {
    news: Array<{ title: string }>;
  };
  if (!emergJson.news.some((n) => n.title.includes("Smoke emergency"))) {
    throw new Error("Emergency item missing from news.json");
  }
  const emergComments = await listCommentsForItem(emergDraft.id);
  if (!emergComments.some((c) => c.body.includes("Emergency publish: Smoke emergency reason"))) {
    throw new Error("Expected emergency publish comment");
  }
  let selfConfirmBlocked = false;
  try {
    await confirmPostReview(saUser, emergDraft.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("cannot Confirm OK")) selfConfirmBlocked = true;
    else throw err;
  }
  if (!selfConfirmBlocked) {
    throw new Error("Bypass actor should not Confirm OK");
  }
  await confirmPostReview(reviewer, emergDraft.id);
  const cleared = await query<{ needs_post_review: boolean }>(
    `SELECT needs_post_review FROM content_items WHERE id = $1`,
    [emergDraft.id],
  );
  if (cleared.rows[0]?.needs_post_review) {
    throw new Error("Expected needs_post_review cleared after Confirm OK");
  }
  // Second emergency → unpublish rollback path
  const emerg2 = await createNews(editor, {
    orgUnitId,
    titleAr: `Smoke emergency unpub ${Date.now()}`,
    labelAr: "خبر",
    enStatus: "pending",
  });
  await emergencyPublish(saUser, emerg2.id, "Will unpublish");
  await unpublishPostReview(saUser, emerg2.id);
  const unpubRow = await query<{ status: string; needs_post_review: boolean }>(
    `SELECT status, needs_post_review FROM content_items WHERE id = $1`,
    [emerg2.id],
  );
  if (unpubRow.rows[0]?.status !== "unpublished" || unpubRow.rows[0]?.needs_post_review) {
    throw new Error("Expected unpublished + flag cleared after post-review unpublish");
  }
  restoreNewsSnapshot(emergSnap);

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

  console.log("Phase 3: partner publish…");
  const partnersPath = join(process.cwd(), "..", "data", "partners.json");
  const partnersSnap = `${partnersPath}.smoke-snap`;
  copyFileSync(partnersPath, partnersSnap);
  const partner = await createPartner(editor, {
    orgUnitId,
    titleAr: `Smoke partner ${Date.now()}`,
    labelAr: "الجزائر",
    partnerScope: "nat",
    partnerDate: "يوليو 2026",
    partnerEmoji: "🏛️",
  });
  await submitPartner(editor, partner.id, true);
  await approvePartner(reviewer, partner.id);
  await publishPartner(reviewer, partner.id);
  const partnersJson = JSON.parse(readFileSync(partnersPath, "utf8")) as {
    nat: Array<{ name: string }>;
  };
  if (!partnersJson.nat.some((p) => p.name.includes("Smoke partner"))) {
    throw new Error("Published partners.json missing smoke partner");
  }
  await unpublishPartner(reviewer, partner.id);
  copyFileSync(partnersSnap, partnersPath);

  console.log("Phase 3: alert publish…");
  const alertsPath = join(process.cwd(), "..", "data", "alerts.json");
  const alertsSnap = `${alertsPath}.smoke-snap`;
  copyFileSync(alertsPath, alertsSnap);
  const alert = await createAlert(editor, {
    orgUnitId,
    titleAr: `Smoke alert ${Date.now()}`,
    titleEn: "Smoke alert EN",
  });
  await submitAlert(editor, alert.id, true);
  await approveAlert(reviewer, alert.id);
  await publishAlert(reviewer, alert.id);
  const alertsJson = JSON.parse(readFileSync(alertsPath, "utf8")) as {
    items: Array<{ message_ar: string }>;
  };
  if (!alertsJson.items.some((a) => a.message_ar.includes("Smoke alert"))) {
    throw new Error("Published alerts.json missing smoke alert");
  }
  await unpublishAlert(reviewer, alert.id);
  copyFileSync(alertsSnap, alertsPath);

  const audits = await listAuditLog({ limit: 80 });
  const actions = new Set(audits.map((a) => a.action));
  for (const need of [
    "news.create",
    "news.submit",
    "news.approve",
    "news.publish",
    "news.unpublish",
    "partner.publish",
    "alert.publish",
  ]) {
    if (!actions.has(need)) {
      throw new Error(`Missing audit action ${need}`);
    }
  }

  console.log("SMOKE PASS");
  console.log(`Editor: ${editor.email} / (SMOKE_EDITOR_PASSWORD or SmokeEditor1!)`);
  console.log(`Reviewer: ${reviewer.email} / (SMOKE_REVIEWER_PASSWORD or SmokeReviewer1!)`);
  console.log(`Super Admin: ${saUser.email}${saPass ? " (password verified)" : ""}`);
}

main().catch((err) => {
  console.error("SMOKE FAIL", err);
  process.exit(1);
});
