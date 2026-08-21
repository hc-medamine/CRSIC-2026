import { LoginDevBubbles, LoginForm } from "./login-form";
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
  const numbered: { n: number; email: string }[] = [];
  const extra: string[] = [];
  for (const [key, raw] of Object.entries(process.env)) {
    const email = (raw ?? "").trim().toLowerCase();
    if (!email) continue;
    const numberedMatch = /^EDITOR(\d+)_EMAIL$/i.exec(key);
    if (numberedMatch) {
      numbered.push({ n: Number(numberedMatch[1]), email });
      continue;
    }
    if (/^EDITOR_EMAIL$/i.test(key)) extra.push(email);
    if (/^EDITOR_EMAILS$/i.test(key)) {
      extra.push(...email.split(/[,;\s]+/).filter(Boolean));
    }
  }
  numbered.sort((a, b) => a.n - b.n);
  return [...new Set([...numbered.map((row) => row.email), ...extra])];
}

function passwordForUser(email: string, role: string, sharedEditorPassword: string): string {
  const e = email.trim().toLowerCase();
  const local = e.split("@")[0]?.replace(/\./g, "_").toUpperCase() ?? "";
  const localSeed =
    env("SEED_SUPER_ADMIN_PASSWORD") || env("CMS_LOGIN_BUBBLE_SA_PASSWORD");

  if (role === "super_admin") {
    return (
      env("CMS_LOGIN_BUBBLE_SA_PASSWORD") ||
      env("SEED_SUPER_ADMIN_PASSWORD") ||
      env(`CMS_LOGIN_BUBBLE_PW_${local}`)
    );
  }
  if (role === "reviewer") {
    return (
      env("CMS_LOGIN_BUBBLE_REVIEWER_PASSWORD") ||
      env(`CMS_LOGIN_BUBBLE_PW_${local}`) ||
      localSeed
    );
  }
  return (
    env(`CMS_LOGIN_BUBBLE_PW_${local}`) ||
    sharedEditorPassword ||
    env("CMS_LOGIN_BUBBLE_EDITOR2_PASSWORD") ||
    localSeed
  );
}

/** One-click accounts in local `next dev` only. Set NEXT_PUBLIC_CMS_LOGIN_BUBBLES=0 to hide. */
function loginBubblesEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const flag = env("NEXT_PUBLIC_CMS_LOGIN_BUBBLES").toLowerCase();
  if (flag === "0" || flag === "false" || flag === "off") return false;
  return true;
}

async function loginBubbles(lang: CmsLang): Promise<LoginBubble[]> {
  if (!loginBubblesEnabled()) return [];

  const sharedEditorPassword = env("CMS_LOGIN_BUBBLE_EDITOR_PASSWORD");
  const bubbles: LoginBubble[] = [];

  try {
    const result = await query<{
      email: string;
      display_name: string;
      name_ar: string | null;
      name_en: string | null;
      role: "super_admin" | "reviewer" | "editor";
    }>(
      `SELECT email, display_name, name_ar, name_en, role
       FROM users
       WHERE is_active = TRUE
         AND role IN ('super_admin', 'reviewer', 'editor')
         AND email NOT ILIKE 'smoke.%'
       ORDER BY
         CASE role
           WHEN 'super_admin' THEN 0
           WHEN 'reviewer' THEN 1
           ELSE 2
         END,
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
        role: row.role,
      });
    }
    if (bubbles.length > 0) return bubbles;
  } catch {
    /* fall through to env-only list */
  }

  const saEmail =
    env("CMS_LOGIN_BUBBLE_SA_EMAIL") || env("SEED_SUPER_ADMIN_EMAIL") || "f.chettih@crsic.dz";
  const saPass = passwordForUser(saEmail, "super_admin", sharedEditorPassword);
  if (saPass) {
    bubbles.push({
      label: `${roleLabel("super_admin", lang)} · ${
        lang === "ar" ? "فاطمة الزهرة شتيح" : "Fatima El Zahra Chettih"
      }`,
      email: saEmail,
      password: saPass,
      role: "super_admin",
    });
  }
  const reviewerEmail =
    env("CMS_LOGIN_BUBBLE_REVIEWER_EMAIL") || env("REVIEW_EMAIL") || "f.boufatah@crsic.dz";
  const reviewerPass = passwordForUser(reviewerEmail, "reviewer", sharedEditorPassword);
  if (reviewerPass) {
    bubbles.push({
      label: `${roleLabel("reviewer", lang)} · ${lang === "ar" ? "ف. بوفاتح" : "F. Boufatah"}`,
      email: reviewerEmail,
      password: reviewerPass,
      role: "reviewer",
    });
  }
  for (const email of editorEmailsFromEnv()) {
    const password = passwordForUser(email, "editor", sharedEditorPassword);
    if (!password) continue;
    bubbles.push({
      label: `${roleLabel("editor", lang)} · ${email.split("@")[0] || email}`,
      email,
      password,
      role: "editor",
    });
  }
  return bubbles;
}

export default async function LoginPage() {
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);
  const dir = lang === "ar" ? "rtl" : "ltr";
  const bubbles = await loginBubbles(lang);

  return (
    <>
      <main
        dir={dir}
        lang={lang}
        className={`cms-desk-bg relative flex min-h-screen flex-col justify-center overflow-hidden px-6 py-16 ${
          lang === "ar" ? "font-[family-name:var(--font-tajawal)]" : "font-sans"
        }`}
      >
      <div className="absolute end-6 top-6 z-10">
        <LoginLangToggle lang={lang} />
      </div>
      <div className="relative mx-auto w-full max-w-md">
        <div className="rounded-2xl border border-crs-border bg-crs-surface/95 p-8 shadow-[var(--crs-shadow-lift)]">
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
          <LoginForm initialLang={lang} />
        </div>
        <LoginDevBubbles bubbles={bubbles} lang={lang} enabled={loginBubblesEnabled()} />
        <p className="mt-6 text-center text-xs text-crs-muted">{t("loginFooter", lang)}</p>
      </div>
      </main>
    </>
  );
}
