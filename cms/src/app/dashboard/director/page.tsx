import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { requireUser } from "@/lib/auth/session";
import { canManageDirector, getSiteDirector } from "@/lib/content/director";
import { EditPageShell } from "@/app/dashboard/content-list-page";
import { DirectorEditorForm } from "./director-form";

export default async function DirectorPage() {
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);
  const user = await requireUser();
  if (!(await canManageDirector(user))) redirect("/dashboard");

  const row = await getSiteDirector();
  if (!row) {
    return (
      <EditPageShell
        breadcrumbs={[
          { href: "/dashboard", label: t("home", lang) },
          { label: t("directorWord", lang) },
        ]}
        title={t("directorWordTitle", lang)}
      >
        <p className="text-sm text-red-700">{t("directorMissingRow", lang)}</p>
      </EditPageShell>
    );
  }

  return (
    <EditPageShell
      breadcrumbs={[
        { href: "/dashboard", label: t("home", lang) },
        { label: t("directorWord", lang) },
      ]}
      title={t("directorWordTitle", lang)}
    >
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
    </EditPageShell>
  );
}
