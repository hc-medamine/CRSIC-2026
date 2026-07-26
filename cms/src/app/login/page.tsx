import { LoginForm } from "./login-form";
import { query } from "@/lib/db";
import type { LoginBubble } from "./login-form";
import { cookies } from "next/headers";
import {
  CMS_LANG_COOKIE,
  normalizeLang,
  localizedDisplayName,
  roleLabel,
  t,
  type CmsLang,
} from "@/lib/i18n/labels";
import { LoginLangToggle } from "./login-lang-toggle";

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

async function loginBubbles(lang: CmsLang): Promise<LoginBubble[]> {
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
      name_ar: string | null;
      name_en: string | null;
      role: "super_admin" | "reviewer";
    }>(
      `SELECT email, display_name, name_ar, name_en, role
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
      const name =
        localizedDisplayName(
          { displayName: row.display_name, nameAr: row.name_ar, nameEn: row.name_en },
          lang,
        ) || row.email;
      bubbles.push({
        label: `${roleLabel(row.role, lang)} · ${name}`,
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
      bubbles.push({
        label: `${roleLabel("super_admin", lang)} · ${
          lang === "ar" ? "فاطمة الزهرة شتيح" : "Fatima El Zahra Chettih"
        }`,
        email: saEmail,
        password: saPass,
      });
    }
    const reviewerEmail =
      env("CMS_LOGIN_BUBBLE_REVIEWER_EMAIL") || "f.boufatah@crsic.dz";
    const reviewerPass = passwordForUser(reviewerEmail, "reviewer", sharedEditorPassword);
    if (reviewerPass) {
      bubbles.push({
        label: `${roleLabel("reviewer", lang)} · ${
          lang === "ar" ? "ف. بوفاتح" : "F. Boufatah"
        }`,
        email: reviewerEmail,
        password: reviewerPass,
      });
    }
  }

  const envEditorEmails = editorEmailsFromEnv();
  if (envEditorEmails.length > 0 && sharedEditorPassword) {
    const nameByEmail = new Map<
      string,
      { displayName: string; nameAr: string | null; nameEn: string | null }
    >();
    try {
      const eds = await query<{
        email: string;
        display_name: string;
        name_ar: string | null;
        name_en: string | null;
      }>(
        `SELECT email, display_name, name_ar, name_en FROM users
         WHERE is_active = TRUE AND role = 'editor'
           AND email = ANY($1::text[])`,
        [envEditorEmails],
      );
      for (const row of eds.rows) {
        nameByEmail.set(row.email.toLowerCase(), {
          displayName: row.display_name?.trim() || row.email,
          nameAr: row.name_ar,
          nameEn: row.name_en,
        });
      }
    } catch {
      /* labels fall back to email local-part */
    }

    for (const email of envEditorEmails) {
      const password = passwordForUser(email, "editor", sharedEditorPassword);
      if (!password) continue;
      const person = nameByEmail.get(email);
      const name = person
        ? localizedDisplayName(person, lang) || email.split("@")[0] || email
        : email.split("@")[0] || email;
      bubbles.push({
        label: `${roleLabel("editor", lang)} · ${name}`,
        email,
        password,
      });
    }
    return bubbles;
  }

  try {
    const eds = await query<{
      email: string;
      display_name: string;
      name_ar: string | null;
      name_en: string | null;
    }>(
      `SELECT email, display_name, name_ar, name_en FROM users
       WHERE is_active = TRUE AND role = 'editor' AND email NOT ILIKE 'smoke.%'
       ORDER BY display_name ASC, email ASC`,
    );
    for (const row of eds.rows) {
      const password = passwordForUser(row.email, "editor", sharedEditorPassword);
      if (!password) continue;
      const name =
        localizedDisplayName(
          { displayName: row.display_name, nameAr: row.name_ar, nameEn: row.name_en },
          lang,
        ) || row.email;
      bubbles.push({
        label: `${roleLabel("editor", lang)} · ${name}`,
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
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);
  const dir = lang === "ar" ? "rtl" : "ltr";
  const bubbles = await loginBubbles(lang);

  return (
    <main
      dir={dir}
      lang={lang}
      className={`relative flex min-h-screen flex-col justify-center overflow-hidden px-6 py-16 ${
        lang === "ar" ? "font-[family-name:var(--font-tajawal)]" : "font-sans"
      }`}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 20% 20%, rgba(45,106,79,0.12), transparent 55%), radial-gradient(ellipse 70% 50% at 90% 80%, rgba(201,168,76,0.14), transparent 50%), linear-gradient(160deg, #f7f6f2 0%, #ebe8e0 100%)",
        }}
        aria-hidden
      />
      <div className="absolute end-6 top-6 z-10">
        <LoginLangToggle lang={lang} />
      </div>
      <div className="relative mx-auto w-full max-w-md">
        <div className="rounded-3xl border border-crs-border/80 bg-crs-surface/95 p-8 shadow-[0_20px_50px_rgba(26,46,38,0.08)] backdrop-blur">
          <div className="mb-6 flex flex-col items-center text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/crsic_logo.png"
              alt="CRSIC"
              width={96}
              height={96}
              className="h-24 w-24 object-contain"
            />
            <p className="mt-4 text-lg font-semibold tracking-tight text-crs-ink">CRSIC</p>
            <p className="text-[11px] uppercase tracking-[0.14em] text-crs-muted">
              {t("loginSubtitle", lang)}
            </p>
            <h1 className="mt-5 text-2xl font-semibold text-crs-ink">{t("loginSignIn", lang)}</h1>
            <p className="mt-1.5 text-sm text-crs-muted">{t("loginWelcome", lang)}</p>
          </div>
          <LoginForm bubbles={bubbles} initialLang={lang} />
        </div>
        <p className="mt-6 text-center text-xs text-crs-muted">{t("loginFooter", lang)}</p>
      </div>
    </main>
  );
}
