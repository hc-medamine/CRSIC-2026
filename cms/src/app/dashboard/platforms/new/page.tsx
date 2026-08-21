import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { requireUser } from "@/lib/auth/session";
import { canAccessContentType } from "@/lib/content/permissions";
import { listSelectableOrgUnits } from "@/lib/users";
import { EditPageShell } from "@/app/dashboard/content-list-page";
import { PlatformEditorForm } from "../platform-form";

export default async function NewPlatformPage() {
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);
  const user = await requireUser();
  if (!(await canAccessContentType(user, "platform"))) redirect("/dashboard");
  const orgs = await listSelectableOrgUnits(user, "platform");

  return (
    <EditPageShell
      breadcrumbs={[
        { href: "/dashboard", label: t("home", lang) },
        { href: "/dashboard/platforms", label: t("platforms", lang) },
        { label: t("breadcrumbNew", lang) },
      ]}
      title={t("createPlatform", lang)}
    >
      <PlatformEditorForm mode="create" orgUnits={orgs} />
    </EditPageShell>
  );
}
