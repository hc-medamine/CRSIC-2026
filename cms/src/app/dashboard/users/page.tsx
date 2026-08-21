import Link from "next/link";
import { cookies } from "next/headers";
import { requireSuperAdmin, listOrgUnits, listUsers } from "@/lib/users";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { AdminPageShell } from "@/app/dashboard/desk-ui";
import { UsersManager } from "./users-manager";

export default async function UsersPage() {
  await requireSuperAdmin();
  const [users, orgUnits] = await Promise.all([listUsers(), listOrgUnits()]);
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);

  return (
    <AdminPageShell
      breadcrumbs={[
        { href: "/dashboard", label: t("home", lang) },
        { label: t("users", lang) },
      ]}
      title={t("users", lang)}
      subtitle={
        <>
          {t("pageDescUsers", lang)}{" "}
          <Link href="/dashboard/org-units" className="font-medium text-crs-primary hover:underline">
            {t("usersOrgUnitsLink", lang)}
          </Link>
          .
        </>
      }
    >
      <UsersManager initialUsers={users} orgUnits={orgUnits} />
    </AdminPageShell>
  );
}
