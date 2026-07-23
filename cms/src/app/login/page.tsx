import { LoginForm } from "./login-form";
import { query } from "@/lib/db";
import type { LoginBubble } from "./login-form";

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

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

async function loginBubbles(): Promise<LoginBubble[]> {
  const gated =
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_CMS_LOGIN_BUBBLES === "1";
  if (!gated) return [];

  const sharedEditorPassword = env("CMS_LOGIN_BUBBLE_EDITOR_PASSWORD");
  const bubbles: LoginBubble[] = [];

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
      const name = nameByEmail.get(email) || email.split("@")[0] || email;
      bubbles.push({
        label: `Editor · ${name}`,
        email,
        password,
      });
    }
    return bubbles;
  }

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
    <main className="relative flex min-h-screen flex-col justify-center overflow-hidden px-6 py-16 font-sans">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 20% 20%, rgba(45,106,79,0.12), transparent 55%), radial-gradient(ellipse 70% 50% at 90% 80%, rgba(201,168,76,0.14), transparent 50%), linear-gradient(160deg, #f7f6f2 0%, #ebe8e0 100%)",
        }}
        aria-hidden
      />
      <div className="relative mx-auto w-full max-w-md">
        <div className="rounded-3xl border border-crs-border/80 bg-crs-surface/95 p-8 shadow-[0_20px_50px_rgba(26,46,38,0.08)] backdrop-blur">
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-crs-primary text-lg font-bold text-white shadow-sm">
              C
            </span>
            <p className="mt-3 text-base font-semibold tracking-tight text-crs-ink">CRSIC</p>
            <p className="text-[11px] uppercase tracking-[0.14em] text-crs-muted">
              Centre CMS
            </p>
            <h1 className="mt-5 text-2xl font-semibold text-crs-ink">Sign in</h1>
            <p className="mt-1.5 text-sm text-crs-muted">
              Welcome back. Use your institutional email.
            </p>
          </div>
          <LoginForm bubbles={bubbles} />
        </div>
        <p className="mt-6 text-center text-xs text-crs-muted">
          No email is sent by this app. Contact your Super Admin for access.
        </p>
      </div>
    </main>
  );
}
