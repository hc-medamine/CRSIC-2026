import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { listResearchProjectsForUser } from "@/lib/content/researchProjects";
import { canAccessContentType } from "@/lib/content/permissions";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { ContentListPage } from "@/app/dashboard/content-list-page";

export default async function ResearchProjectsListPage() {
  const user = await requireUser();
  if (!(await canAccessContentType(user, "research_project"))) redirect("/dashboard");
  const items = await listResearchProjectsForUser(user);
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);

  return (
    <ContentListPage
      breadcrumbs={[
        { href: "/dashboard", label: t("home", lang) },
        { label: t("researchProjects", lang) },
      ]}
      title={t("researchProjects", lang)}
      subtitle="Draft → review → publish"
      newHref="/dashboard/research-projects/new"
      newLabel="New research project"
      emptyLabel="No research projects yet."
      items={items.map((item) => ({
        id: item.id,
        href: `/dashboard/research-projects/${item.id}`,
        title: item.title_ar || "(untitled)",
        status: item.status,
        enStatus: item.en_status,
        updatedAt: item.updated_at,
        meta: item.org_unit_id,
      }))}
    />
  );
}
