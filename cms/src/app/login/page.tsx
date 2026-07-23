import { query } from "@/lib/db";
import { LoginForm, type LoginBubble } from "./login-form";

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

/** Collect EDITOR1_EMAIL, EDITOR2_EMAIL, … from env (order preserved). */
function editorEmailsFromEnv(): string[] {
  const found: { n: number; email: string }[] = [];
  for (const [key, raw] of Object.entries(process.env)) {
    const m = /^EDITOR(\d+)_EMAIL$/i.exec(key);
    if (!m) continue;
    const email = (raw ?? "").trim().toLowerCase();
    if (!email) continue;
    found.push({ n: Number(m[1]), email });
  }
  found.sort((a, b) => a.n - b.n);
  return found.map((f) => f.email);
}

function passwordForUser(email: string, role: string, sharedEditorPassword: string): string {
  const e = email.trim().toLowerCase();
  const local = e.split("@")[0]?.replace(/\./g, "_").toUpperCase() ?? "";

  if (role === "super_admin") {
    return (
      env("CMS_LOGIN_BUBBLE_SA_PASSWORD") ||
      env("SEED_SUPER_ADMIN_PASSWORD") ||
      env(`CMS_LOGIN_BUBBLE_PW_${local}`)
    );
  }
  if (role === "reviewer") {
    return env("CMS_LOGIN_BUBBLE_REVIEWER_PASSWORD") || env(`CMS_LOGIN_BUBBLE_PW_${local}`);
  }
  // All editors share CMS_LOGIN_BUBBLE_EDITOR_PASSWORD (per-user override optional).
  return (
    env(`CMS_LOGIN_BUBBLE_PW_${local}`) ||
    sharedEditorPassword ||
    env("CMS_LOGIN_BUBBLE_EDITOR2_PASSWORD")
  );
}

function rolePrefix(role: string): string {
  if (role === "super_admin") return "SA";
  if (role === "reviewer") return "Reviewer";
  return "Editor";
}

/** Dev/test only — never enable NEXT_PUBLIC_CMS_LOGIN_BUBBLES in production. */
async function loginBubbles(): Promise<LoginBubble[]> {
  const gated =
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_CMS_LOGIN_BUBBLES === "1";
  if (!gated) return [];

  const sharedEditorPassword = env("CMS_LOGIN_BUBBLE_EDITOR_PASSWORD");
  const bubbles: LoginBubble[] = [];

  // SA + Reviewer from DB (real accounts only).
  try {
    const result = await query<{
      email: string;
      display_name: string;
      role: "super_admin" | "reviewer";
    }>(
      `SELECT email, display_name, role
       FROM users
       WHERE is_active = TRUE
         AND role IN ('super_admin', 'reviewer')
         AND email NOT ILIKE 'smoke.%'
       ORDER BY
         CASE role WHEN 'super_admin' THEN 0 ELSE 1 END,
         display_name ASC,
         email ASC`,
    );
    for (const row of result.rows) {
      const password = passwordForUser(row.email, row.role, sharedEditorPassword);
      if (!password) continue;
      const name = row.display_name?.trim() || row.email;
      bubbles.push({
        label: `${rolePrefix(row.role)} · ${name}`,
        email: row.email,
        password,
      });
    }
  } catch {
    const saEmail =
      env("CMS_LOGIN_BUBBLE_SA_EMAIL") ||
      env("SEED_SUPER_ADMIN_EMAIL") ||
      "f.chettih@crsic.dz";
    const saPass = passwordForUser(saEmail, "super_admin", sharedEditorPassword);
    if (saPass) {
      bubbles.push({ label: "SA · F. Chettih", email: saEmail, password: saPass });
    }
    const reviewerEmail =
      env("CMS_LOGIN_BUBBLE_REVIEWER_EMAIL") || "f.boufatah@crsic.dz";
    const reviewerPass = passwordForUser(reviewerEmail, "reviewer", sharedEditorPassword);
    if (reviewerPass) {
      bubbles.push({
        label: "Reviewer · F. Boufatah",
        email: reviewerEmail,
        password: reviewerPass,
      });
    }
  }

  // Editors: prefer EDITOR1_EMAIL…EDITORN_EMAIL (shared password).
  const envEditorEmails = editorEmailsFromEnv();
  if (envEditorEmails.length > 0 && sharedEditorPassword) {
    const nameByEmail = new Map<string, string>();
    try {
      const eds = await query<{ email: string; display_name: string }>(
        `SELECT email, display_name FROM users
         WHERE is_active = TRUE AND role = 'editor'
           AND email = ANY($1::text[])`,
        [envEditorEmails],
      );
      for (const row of eds.rows) {
        nameByEmail.set(row.email.toLowerCase(), row.display_name?.trim() || row.email);
      }
    } catch {
      /* labels fall back to email local-part */
    }

    for (const email of envEditorEmails) {
      const password = passwordForUser(email, "editor", sharedEditorPassword);
      if (!password) continue;
      const name =
        nameByEmail.get(email) ||
        email.split("@")[0] ||
        email;
      bubbles.push({
        label: `Editor · ${name}`,
        email,
        password,
      });
    }
    return bubbles;
  }

  // Fallback: every active editor in DB with shared (or per-user) password.
  try {
    const eds = await query<{ email: string; display_name: string }>(
      `SELECT email, display_name FROM users
       WHERE is_active = TRUE AND role = 'editor' AND email NOT ILIKE 'smoke.%'
       ORDER BY display_name ASC, email ASC`,
    );
    for (const row of eds.rows) {
      const password = passwordForUser(row.email, "editor", sharedEditorPassword);
      if (!password) continue;
      bubbles.push({
        label: `Editor · ${row.display_name?.trim() || row.email}`,
        email: row.email,
        password,
      });
    }
  } catch {
    /* ignore */
  }

  return bubbles;
}

export default async function LoginPage() {
  const bubbles = await loginBubbles();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-16 font-sans">
      <div>
        <p className="text-sm uppercase tracking-wide text-zinc-500">CRSIC CMS</p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Sign in</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Use your institutional email. No email is sent by this app.
        </p>
      </div>

      <LoginForm bubbles={bubbles} />
    </main>
  );
}
