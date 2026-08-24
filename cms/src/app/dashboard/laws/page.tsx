import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { listLawsForUser } from "@/lib/content/laws";
import { canAccessContentType, listBulkChrome } from "@/lib/content/permissions";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { ContentListPage } from "@/app/dashboard/content-list-page";

export default async function LawsListPage() {
  const user = await requireUser();
  if (!(await canAccessContentType(user, "law"))) redirect("/dashboard");
  const bulkChrome = listBulkChrome(user);
  const items = await listLawsForUser(user);
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);

  return (
    <ContentListPage
      breadcrumbs={[
        { href: "/dashboard", label: t("home", lang) },
        { label: t("laws", lang) },
      ]}
      title={t("laws", lang)}
      subtitle={t("pageDescLaws", lang)}
      newHref="/dashboard/laws/new"
      newLabel={t("newLaw", lang)}
      emptyLabel={t("emptyLaws", lang)}
      bulk={
        bulkChrome
          ? { apiPath: "/api/laws/bulk", kind: "law", ...bulkChrome }
          : undefined
      }
      items={items.map((item) => ({
        id: item.id,
        href: `/dashboard/laws/${item.id}`,
        title: item.title_ar || t("untitled", lang),
        status: item.status,
        enStatus: item.en_status,
        updatedAt: item.updated_at,
        meta: item.external_url ?? undefined,
      }))}
    />
  );
}
