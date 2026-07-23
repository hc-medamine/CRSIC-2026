import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { listPartnersForUser } from "@/lib/content/partners";
import { canAccessContentType } from "@/lib/content/permissions";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { ContentListPage } from "@/app/dashboard/content-list-page";

export default async function PartnersListPage() {
  const user = await requireUser();
  if (!(await canAccessContentType(user, "partner"))) redirect("/dashboard");
  const items = await listPartnersForUser(user);
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);

  return (
    <ContentListPage
      breadcrumbs={[
        { href: "/dashboard", label: t("home", lang) },
        { label: t("partners", lang) },
      ]}
      title={t("partners", lang)}
      subtitle="Draft → review → publish"
      newHref="/dashboard/partners/new"
      newLabel="New partner"
      emptyLabel="No partners yet."
      items={items.map((item) => ({
        id: item.id,
        href: `/dashboard/partners/${item.id}`,
        title: item.title_ar || "(untitled)",
        status: item.status,
        enStatus: item.en_status,
        updatedAt: item.updated_at,
        meta: `${item.partner_scope} · ${item.label_ar ?? ""} · ${item.partner_date ?? ""}`.trim(),
      }))}
    />
  );
}
