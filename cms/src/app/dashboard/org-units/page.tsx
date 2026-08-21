import { cookies } from "next/headers";
import { listOrgUnits, requireSuperAdmin } from "@/lib/users";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { AdminPageShell } from "@/app/dashboard/desk-ui";
import { OrgUnitsManager } from "./org-units-manager";

export default async function OrgUnitsPage() {
  await requireSuperAdmin();
  const orgUnits = await listOrgUnits();
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);

  return (
    <AdminPageShell
      breadcrumbs={[
        { href: "/dashboard", label: t("home", lang) },
        { label: t("orgUnits", lang) },
      ]}
      title={t("orgUnits", lang)}
      subtitle={t("pageDescOrgUnits", lang)}
    >
      <OrgUnitsManager initialOrgUnits={orgUnits} />
    </AdminPageShell>
  );
}
