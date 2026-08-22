import { cookies } from "next/headers";
import {
  listAssignedEditors,
  listEditorContentTypeClaims,
  listOrgUnits,
  requireReviewerOrSuperAdmin,
} from "@/lib/users";
import { previewAlign, serializeAlignPreview } from "@/lib/content/alignAuthorship";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { AdminPageShell } from "@/app/dashboard/desk-ui";
import { DesksClient } from "./desks-client";

export default async function EditorsPage() {
  const user = await requireReviewerOrSuperAdmin();
  const [editors, orgUnits, claims, align] = await Promise.all([
    listAssignedEditors(user),
    listOrgUnits(),
    listEditorContentTypeClaims(),
    previewAlign(user),
  ]);
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);

  return (
    <AdminPageShell
      breadcrumbs={[
        { href: "/dashboard", label: t("home", lang) },
        { label: t("desks", lang) },
      ]}
      title={t("desks", lang)}
      subtitle={t("pageDescDesks", lang)}
    >
      <DesksClient
        initialEditors={editors}
        initialOrgUnits={orgUnits}
        initialClaims={claims}
        actorRole={user.role === "super_admin" ? "super_admin" : "reviewer"}
        initialAlign={serializeAlignPreview(align)}
      />
    </AdminPageShell>
  );
}
