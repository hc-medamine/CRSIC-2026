import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { listResearchGroupsForUser } from "@/lib/content/researchGroups";
import { canAccessContentType, listBulkChrome } from "@/lib/content/permissions";
import { listOrgUnits } from "@/lib/users";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { ContentListPage } from "@/app/dashboard/content-list-page";

export default async function ResearchGroupsListPage() {
  const user = await requireUser();
  if (!(await canAccessContentType(user, "research_group"))) redirect("/dashboard");
  const bulkChrome = listBulkChrome(user);
  const [items, orgUnits] = await Promise.all([listResearchGroupsForUser(user), listOrgUnits()]);
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);
  const orgNameById = new Map(
    orgUnits.map((o) => [o.id, lang === "ar" ? o.name_ar : o.name_en || o.name_ar]),
  );

  return (
    <ContentListPage
      breadcrumbs={[
        { href: "/dashboard", label: t("home", lang) },
        { label: t("researchGroups", lang) },
      ]}
      title={t("researchGroups", lang)}
      subtitle={t("pageDescResearchGroups", lang)}
      newHref="/dashboard/research-groups/new"
      newLabel={t("newResearchGroup", lang)}
      emptyLabel={t("emptyResearchGroups", lang)}
      bulk={
        bulkChrome
          ? {
              apiPath: "/api/research-groups/bulk",
              kind: "research_group",
              ...bulkChrome,
            }
          : undefined
      }
      items={items.map((item) => ({
        id: item.id,
        href: `/dashboard/research-groups/${item.id}`,
        title: item.title_ar || t("untitled", lang),
        status: item.status,
        enStatus: item.en_status,
        updatedAt: item.updated_at,
        meta: orgNameById.get(item.org_unit_id) || undefined,
      }))}
    />
  );
}
