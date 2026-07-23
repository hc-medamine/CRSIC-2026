import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { canAccessContentType } from "@/lib/content/permissions";
import { listSelectableOrgUnits } from "@/lib/users";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { EditPageShell } from "@/app/dashboard/content-list-page";
import { NewsEditorForm } from "../news-form";

export default async function NewNewsPage() {
  const user = await requireUser();
  if (!(await canAccessContentType(user, "news"))) redirect("/dashboard");

  const orgs = await listSelectableOrgUnits(user, "news");
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);

  return (
    <EditPageShell
      breadcrumbs={[
        { href: "/dashboard", label: t("home", lang) },
        { href: "/dashboard/news", label: t("news", lang) },
        { label: "New" },
      ]}
      title="Create news"
      subtitle="Arabic-first draft. Submit when ready for review."
    >
      <NewsEditorForm mode="create" orgUnits={orgs} />
    </EditPageShell>
  );
}
