import { cookies } from "next/headers";
import {
  listAssignedEditors,
  listEditorContentTypeClaims,
  listOrgUnits,
  requireReviewerOrSuperAdmin,
} from "@/lib/users";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { AdminPageShell } from "@/app/dashboard/desk-ui";
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
    <AdminPageShell
      breadcrumbs={[
        { href: "/dashboard", label: t("home", lang) },
        { label: t("editors", lang) },
      ]}
      title={t("editors", lang)}
      subtitle={t("pageDescEditors", lang)}
    >
      <EditorsScopeManager
        initialEditors={editors}
        initialOrgUnits={orgUnits}
        initialClaims={claims}
        actorRole={user.role === "super_admin" ? "super_admin" : "reviewer"}
      />
    </AdminPageShell>
  );
}
