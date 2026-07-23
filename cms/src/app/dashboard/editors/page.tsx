import { cookies } from "next/headers";
import {
  listAssignedEditors,
  listEditorContentTypeClaims,
  listOrgUnits,
  requireReviewerOrSuperAdmin,
} from "@/lib/users";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { PageBreadcrumb } from "@/app/dashboard/ui-bits";
import { EditorsScopeManager } from "./editors-scope-manager";

export default async function EditorsPage() {
  const user = await requireReviewerOrSuperAdmin();
  const [editors, orgUnits, claims] = await Promise.all([
    listAssignedEditors(user),
    listOrgUnits(),
    listEditorContentTypeClaims(),
  ]);
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 font-sans lg:px-10">
      <PageBreadcrumb
        items={[
          { href: "/dashboard", label: t("home", lang) },
          { label: t("editors", lang) },
        ]}
      />
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-crs-ink">{t("editors", lang)}</h1>
        <p className="mt-1 text-sm text-crs-muted">
          Content types for assigned Editors (globally exclusive, org catalog constrained).
        </p>
      </header>

      <EditorsScopeManager
        initialEditors={editors}
        initialOrgUnits={orgUnits}
        initialClaims={claims}
        actorRole={user.role === "super_admin" ? "super_admin" : "reviewer"}
      />
    </main>
  );
}
