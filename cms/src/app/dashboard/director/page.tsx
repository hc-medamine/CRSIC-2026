import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { requireUser } from "@/lib/auth/session";
import { canManageDirector, getSiteDirector } from "@/lib/content/director";
import { DirectorEditorForm } from "./director-form";

export default async function DirectorPage() {
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);
  const user = await requireUser();
  if (!(await canManageDirector(user))) redirect("/dashboard");

  const row = await getSiteDirector();
  if (!row) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8">
        <p className="text-sm text-red-700">{t("directorMissingRow", lang)}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8 font-sans lg:px-10">
      <header className="flex items-center justify-between border-b border-crs-border pb-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-crs-muted">{t("directorWord", lang)}</p>
          <h1 className="text-3xl font-semibold tracking-tight text-crs-ink">
            {t("directorWordTitle", lang)}
          </h1>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex min-h-11 items-center text-sm text-crs-primary hover:underline"
        >
          {t("backToList", lang)}
        </Link>
      </header>

      <DirectorEditorForm
        initial={{
          quoteAr: row.quote_ar,
          quoteEn: row.quote_en,
          nameAr: row.name_ar,
          nameEn: row.name_en,
          roleAr: row.role_ar,
          roleEn: row.role_en,
          portraitPath: row.portrait_path ?? "",
          portraitAltAr: row.portrait_alt_ar ?? "",
          portraitAltEn: row.portrait_alt_en ?? "",
          publishedAt: row.published_at ? row.published_at.toISOString() : null,
          updatedAt: row.updated_at.toISOString(),
        }}
      />
    </main>
  );
}
