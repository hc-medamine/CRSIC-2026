import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { listResearchProjectsForUser } from "@/lib/content/researchProjects";
import { canAccessContentType, canReview } from "@/lib/content/permissions";
import { listOrgUnits } from "@/lib/users";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { ContentListPage } from "@/app/dashboard/content-list-page";

export default async function ResearchProjectsListPage() {
  const user = await requireUser();
  if (!(await canAccessContentType(user, "research_project"))) redirect("/dashboard");
  const [items, orgUnits] = await Promise.all([listResearchProjectsForUser(user), listOrgUnits()]);
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);
  const orgNameById = new Map(
    orgUnits.map((o) => [o.id, lang === "ar" ? o.name_ar : o.name_en || o.name_ar]),
  );

  return (
    <ContentListPage
      breadcrumbs={[
        { href: "/dashboard", label: t("home", lang) },
        { label: t("researchProjects", lang) },
      ]}
      title={t("researchProjects", lang)}
      subtitle={t("pageDescResearchProjects", lang)}
      newHref="/dashboard/research-projects/new"
      newLabel={t("newResearchProject", lang)}
      emptyLabel={t("emptyResearchProjects", lang)}
      bulk={
        canReview(user)
          ? {
              apiPath: "/api/research-projects/bulk",
              canRecycle: user.role === "super_admin",
              kind: "research_project",
            }
          : undefined
      }
      items={items.map((item) => ({
        id: item.id,
        href: `/dashboard/research-projects/${item.id}`,
        title: item.title_ar || t("untitled", lang),
        status: item.status,
        enStatus: item.en_status,
        updatedAt: item.updated_at,
        meta: orgNameById.get(item.org_unit_id) || undefined,
      }))}
    />
  );
}
