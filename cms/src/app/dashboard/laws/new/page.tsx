import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { requireUser } from "@/lib/auth/session";
import { canAccessContentType } from "@/lib/content/permissions";
import { listSelectableOrgUnits } from "@/lib/users";
import { EditPageShell } from "@/app/dashboard/content-list-page";
import { LawEditorForm } from "../law-form";

export default async function NewLawPage() {
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);
  const user = await requireUser();
  if (!(await canAccessContentType(user, "law"))) redirect("/dashboard");
  const orgs = await listSelectableOrgUnits(user, "law");

  return (
    <EditPageShell
      breadcrumbs={[
        { href: "/dashboard", label: t("home", lang) },
        { href: "/dashboard/laws", label: t("laws", lang) },
        { label: t("breadcrumbNew", lang) },
      ]}
      title={t("createLaw", lang)}
    >
      <LawEditorForm mode="create" orgUnits={orgs} />
    </EditPageShell>
  );
}
