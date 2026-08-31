import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { requireUser } from "@/lib/auth/session";
import { canManageSitePages, getSitePages } from "@/lib/content/sitePages";
import { EditPageShell } from "@/app/dashboard/content-list-page";
import { SitePagesEditorForm } from "./site-pages-form";

export default async function SitePagesPage() {
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);
  const user = await requireUser();
  if (!(await canManageSitePages(user))) redirect("/dashboard");

  const row = await getSitePages();
  if (!row) {
    return (
      <EditPageShell
        breadcrumbs={[
          { href: "/dashboard", label: t("home", lang) },
          { label: t("sitePages", lang) },
        ]}
        title={t("sitePagesTitle", lang)}
      >
        <p className="text-sm text-red-700">{t("sitePagesMissingRow", lang)}</p>
      </EditPageShell>
    );
  }

  return (
    <EditPageShell
      breadcrumbs={[
        { href: "/dashboard", label: t("home", lang) },
        { label: t("sitePages", lang) },
      ]}
      title={t("sitePagesTitle", lang)}
    >
      <SitePagesEditorForm
        initial={{
          fieldsAr: row.fields_ar,
          fieldsEn: row.fields_en,
          email: row.email,
          phone: row.phone,
          webmailUrl: row.webmail_url,
          webmailText: row.webmail_text,
          publishedAt: row.published_at ? row.published_at.toISOString() : null,
          updatedAt: row.updated_at.toISOString(),
        }}
      />
    </EditPageShell>
  );
}
