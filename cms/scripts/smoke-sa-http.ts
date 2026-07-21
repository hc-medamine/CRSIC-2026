/**
 * HTTP smoke: Super Admin login + pending review-owner confirm via cookies.
 *
 * Env:
 *   SMOKE_BASE_URL (default http://localhost:3000)
 *   SMOKE_SA_EMAIL (default f.chettih@crsic.dz)
 *   SMOKE_SA_PASSWORD (required)
 *   SMOKE_REVIEWER_PASSWORD / SMOKE_EDITOR_PASSWORD — smoke users
 */
import { query } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";
import type { SessionUser } from "../src/lib/auth/session";
import { allOrgUnitIds, replaceUserScopes } from "../src/lib/users";
import { createNews, submitNews } from "../src/lib/content/news";
import { proposeReviewOwner } from "../src/lib/content/delegation";

const base = (process.env.SMOKE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const saEmail = (process.env.SMOKE_SA_EMAIL || "f.chettih@crsic.dz").trim().toLowerCase();
const saPass = process.env.SMOKE_SA_PASSWORD;
const editorPass = process.env.SMOKE_EDITOR_PASSWORD || "SmokeEditor1!";
const reviewerPass = process.env.SMOKE_REVIEWER_PASSWORD || "SmokeReviewer1!";

function cookieHeader(res: Response): string {
  const anyHeaders = res.headers as Headers & { getSetCookie?: () => string[] };
  const parts =
    typeof anyHeaders.getSetCookie === "function"
      ? anyHeaders.getSetCookie()
      : ([res.headers.get("set-cookie")].filter(Boolean) as string[]);
  return parts
    .map((c) => c.split(";")[0])
    .filter(Boolean)
    .join("; ");
}

async function ensureUser(opts: {
  email: string;
  password: string;
  displayName: string;
  role: "editor" | "reviewer";
}): Promise<SessionUser> {
  const existing = await query<{ id: string }>(`SELECT id FROM users WHERE email = $1`, [
    opts.email,
  ]);
  const passwordHash = await hashPassword(opts.password);
  let id: string;
  if (existing.rows[0]) {
    id = existing.rows[0].id;
    await query(
      `UPDATE users SET password_hash = $2, role = $3, is_active = TRUE, display_name = $4, updated_at = NOW()
       WHERE id = $1`,
      [id, passwordHash, opts.role, opts.displayName],
    );
  } else {
    const inserted = await query<{ id: string }>(
      `INSERT INTO users (email, password_hash, display_name, role)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [opts.email, passwordHash, opts.displayName, opts.role],
    );
    id = inserted.rows[0].id;
  }
  const orgs = await allOrgUnitIds();
  await replaceUserScopes(id, orgs, ["news", "event", "publication"]);
  return { id, email: opts.email, displayName: opts.displayName, role: opts.role };
}

async function main() {
  if (!saPass) throw new Error("Set SMOKE_SA_PASSWORD");

  console.log("Seeding pending review-owner proposal…");
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
  if (!orgUnitId) throw new Error("No org units");
  const draft = await createNews(editor, {
    orgUnitId,
    titleAr: `SA HTTP smoke ${Date.now()}`,
    labelAr: "خبر",
    enStatus: "pending",
  });
  await submitNews(editor, draft.id, true);
  await proposeReviewOwner(reviewer, draft.id, reviewer.id);
  console.log(`Pending proposal on ${draft.id}`);

  console.log(`Logging in as Super Admin ${saEmail}…`);
  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: saEmail, password: saPass }),
  });
  const loginBody = (await loginRes.json()) as {
    ok?: boolean;
    error?: string;
    user?: { email: string; role: string };
  };
  if (!loginRes.ok || !loginBody.ok) {
    throw new Error(`SA login failed: ${loginBody.error ?? loginRes.status}`);
  }
  if (loginBody.user?.role !== "super_admin") {
    throw new Error(`Expected super_admin, got ${loginBody.user?.role}`);
  }
  const cookie = cookieHeader(loginRes);
  if (!cookie) throw new Error("No session cookie from login");
  console.log(`Login OK: ${loginBody.user.email} (${loginBody.user.role})`);

  const pendingRes = await fetch(`${base}/api/content/review-owner?kind=pending`, {
    headers: { Cookie: cookie },
  });
  const pendingBody = (await pendingRes.json()) as {
    ok?: boolean;
    proposals?: Array<{ id: string; title: string }>;
    error?: string;
  };
  if (!pendingRes.ok || !pendingBody.ok) {
    throw new Error(`Pending list failed: ${pendingBody.error ?? pendingRes.status}`);
  }
  const hit = pendingBody.proposals?.find((p) => p.id === draft.id);
  if (!hit) {
    throw new Error("Seeded proposal not in SA pending list");
  }
  console.log(`Pending queue includes: ${hit.title}`);

  const confirmRes = await fetch(`${base}/api/content/review-owner`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ action: "confirm", contentItemId: draft.id }),
  });
  const confirmBody = (await confirmRes.json()) as { ok?: boolean; error?: string };
  if (!confirmRes.ok || !confirmBody.ok) {
    throw new Error(`Confirm failed: ${confirmBody.error ?? confirmRes.status}`);
  }

  const owned = await query<{ review_owner_id: string | null }>(
    `SELECT review_owner_id FROM content_items WHERE id = $1`,
    [draft.id],
  );
  if (owned.rows[0]?.review_owner_id !== reviewer.id) {
    throw new Error("Expected review_owner_id after SA HTTP confirm");
  }

  console.log("SA HTTP SMOKE PASS");
}

main().catch((err) => {
  console.error("SA HTTP SMOKE FAIL", err);
  process.exit(1);
});
