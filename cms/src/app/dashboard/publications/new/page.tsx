import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { requireUser } from "@/lib/auth/session";
import { canAccessContentType } from "@/lib/content/permissions";
import { listSelectableOrgUnits } from "@/lib/users";
import { EditPageShell } from "@/app/dashboard/content-list-page";
import { PublicationEditorForm } from "../publication-form";

export default async function NewPublicationPage() {
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);
  const user = await requireUser();
  if (!(await canAccessContentType(user, "publication"))) redirect("/dashboard");
  const orgs = await listSelectableOrgUnits(user, "publication");

  return (
    <EditPageShell
      breadcrumbs={[
        { href: "/dashboard", label: t("home", lang) },
        { href: "/dashboard/publications", label: t("publications", lang) },
        { label: t("breadcrumbNew", lang) },
      ]}
      title={t("createPublication", lang)}
    >
      <PublicationEditorForm mode="create" orgUnits={orgs} />
    </EditPageShell>
  );
}
