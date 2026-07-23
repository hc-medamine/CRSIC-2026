import { cookies } from "next/headers";
import { listOrgUnits, requireSuperAdmin } from "@/lib/users";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { PageBreadcrumb } from "@/app/dashboard/ui-bits";
import { OrgUnitsManager } from "./org-units-manager";

export default async function OrgUnitsPage() {
  await requireSuperAdmin();
  const orgUnits = await listOrgUnits();
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 font-sans lg:px-10">
      <PageBreadcrumb
        items={[
          { href: "/dashboard", label: t("home", lang) },
          { label: t("orgUnits", lang) },
        ]}
      />
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-crs-ink">{t("orgUnits", lang)}</h1>
        <p className="mt-1 text-sm text-crs-muted">
          Super Admin only. Type catalogs are fixed by org kind.
        </p>
      </header>

      <OrgUnitsManager initialOrgUnits={orgUnits} />
    </main>
  );
}
