import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { listResearchGroupsForUser } from "@/lib/content/researchGroups";
import { canAccessContentType } from "@/lib/content/permissions";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { ContentListPage } from "@/app/dashboard/content-list-page";

export default async function ResearchGroupsListPage() {
  const user = await requireUser();
  if (!(await canAccessContentType(user, "research_group"))) redirect("/dashboard");
  const items = await listResearchGroupsForUser(user);
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);

  return (
    <ContentListPage
      breadcrumbs={[
        { href: "/dashboard", label: t("home", lang) },
        { label: t("researchGroups", lang) },
      ]}
      title={t("researchGroups", lang)}
      subtitle="Draft → review → publish"
      newHref="/dashboard/research-groups/new"
      newLabel="New research group"
      emptyLabel="No research groups yet."
      items={items.map((item) => ({
        id: item.id,
        href: `/dashboard/research-groups/${item.id}`,
        title: item.title_ar || "(untitled)",
        status: item.status,
        enStatus: item.en_status,
        updatedAt: item.updated_at,
        meta: item.org_unit_id,
      }))}
    />
  );
}
