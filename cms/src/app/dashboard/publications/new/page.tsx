import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { requireUser } from "@/lib/auth/session";
import { canAccessContentType } from "@/lib/content/permissions";
import { listSelectableOrgUnits } from "@/lib/users";
import { PublicationEditorForm } from "../publication-form";

export default async function NewPublicationPage() {
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);
  const user = await requireUser();
  if (!(await canAccessContentType(user, "publication"))) redirect("/dashboard");
  const orgs = await listSelectableOrgUnits(user, "publication");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8 font-sans lg:px-10">
      <header className="flex items-center justify-between border-b border-crs-border pb-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-crs-muted">{t("publications", lang)}</p>
          <h1 className="text-3xl font-semibold tracking-tight text-crs-ink">{t("createPublication", lang)}</h1>
        </div>
        <Link href="/dashboard/publications" className="inline-flex min-h-11 items-center text-sm text-crs-primary hover:underline">{t("backToList", lang)}</Link>
      </header>
      <PublicationEditorForm mode="create" orgUnits={orgs} />
    </main>
  );
}
