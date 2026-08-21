import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { requireUser } from "@/lib/auth/session";
import { canAccessContentType } from "@/lib/content/permissions";
import { listSelectableOrgUnits } from "@/lib/users";
import { EditPageShell } from "@/app/dashboard/content-list-page";
import { AlertEditorForm } from "../alert-form";

export default async function NewAlertPage() {
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);
  const user = await requireUser();
  if (!(await canAccessContentType(user, "alert"))) redirect("/dashboard");
  const orgs = await listSelectableOrgUnits(user, "alert");

  return (
    <EditPageShell
      breadcrumbs={[
        { href: "/dashboard", label: t("home", lang) },
        { href: "/dashboard/alerts", label: t("alerts", lang) },
        { label: t("breadcrumbNew", lang) },
      ]}
      title={t("createAlert", lang)}
    >
      <AlertEditorForm mode="create" orgUnits={orgs} />
    </EditPageShell>
  );
}
