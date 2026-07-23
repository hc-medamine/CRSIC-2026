import Link from "next/link";
import { cookies } from "next/headers";
import { requireSuperAdmin, listOrgUnits, listUsers } from "@/lib/users";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { PageBreadcrumb } from "@/app/dashboard/ui-bits";
import { UsersManager } from "./users-manager";

export default async function UsersPage() {
  await requireSuperAdmin();
  const [users, orgUnits] = await Promise.all([listUsers(), listOrgUnits()]);
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 font-sans lg:px-10">
      <PageBreadcrumb
        items={[
          { href: "/dashboard", label: t("home", lang) },
          { label: t("users", lang) },
        ]}
      />
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-crs-ink">{t("users", lang)}</h1>
        <p className="mt-1 text-sm text-crs-muted">
          Super Admin only. Manage organisation units on{" "}
          <Link href="/dashboard/org-units" className="font-medium text-crs-primary hover:underline">
            Org scopes
          </Link>
          .
        </p>
      </header>

      <UsersManager initialUsers={users} orgUnits={orgUnits} />
    </main>
  );
}
