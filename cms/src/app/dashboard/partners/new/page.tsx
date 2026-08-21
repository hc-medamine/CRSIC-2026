import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { requireUser } from "@/lib/auth/session";
import { canAccessContentType } from "@/lib/content/permissions";
import { listSelectableOrgUnits } from "@/lib/users";
import { EditPageShell } from "@/app/dashboard/content-list-page";
import { PartnerEditorForm } from "../partner-form";

export default async function NewPartnerPage() {
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);
  const user = await requireUser();
  if (!(await canAccessContentType(user, "partner"))) redirect("/dashboard");
  const orgs = await listSelectableOrgUnits(user, "partner");

  return (
    <EditPageShell
      breadcrumbs={[
        { href: "/dashboard", label: t("home", lang) },
        { href: "/dashboard/partners", label: t("partners", lang) },
        { label: t("breadcrumbNew", lang) },
      ]}
      title={t("createPartner", lang)}
    >
      <PartnerEditorForm mode="create" orgUnits={orgs} />
    </EditPageShell>
  );
}
