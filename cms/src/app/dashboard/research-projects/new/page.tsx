import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { requireUser } from "@/lib/auth/session";
import { canAccessContentType } from "@/lib/content/permissions";
import { listSelectableOrgUnits } from "@/lib/users";
import { EditPageShell } from "@/app/dashboard/content-list-page";
import { ResearchProjectForm } from "../project-form";

export default async function NewResearchProjectPage() {
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);
  const user = await requireUser();
  if (!(await canAccessContentType(user, "research_project"))) redirect("/dashboard");
  const orgs = await listSelectableOrgUnits(user, "research_project");

  return (
    <EditPageShell
      breadcrumbs={[
        { href: "/dashboard", label: t("home", lang) },
        { href: "/dashboard/research-projects", label: t("researchProjects", lang) },
        { label: t("breadcrumbNew", lang) },
      ]}
      title={t("createResearchProject", lang)}
    >
      <ResearchProjectForm mode="create" orgUnits={orgs} />
    </EditPageShell>
  );
}
