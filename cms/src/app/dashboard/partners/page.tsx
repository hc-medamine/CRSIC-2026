import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { listPartnersForUser } from "@/lib/content/partners";
import { canAccessContentType, listBulkChrome } from "@/lib/content/permissions";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { ContentListPage } from "@/app/dashboard/content-list-page";

export default async function PartnersListPage() {
  const user = await requireUser();
  if (!(await canAccessContentType(user, "partner"))) redirect("/dashboard");
  const bulkChrome = listBulkChrome(user);
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
      subtitle={t("pageDescPartners", lang)}
      newHref="/dashboard/partners/new"
      newLabel={t("newPartner", lang)}
      emptyLabel={t("emptyPartners", lang)}
      bulk={
        bulkChrome
          ? { apiPath: "/api/partners/bulk", kind: "partner", ...bulkChrome }
          : undefined
      }
      items={items.map((item) => {
        const scope =
          item.partner_scope === "intl"
            ? t("fieldScopeInternational", lang)
            : item.partner_scope === "nat"
              ? t("fieldScopeNational", lang)
              : "";
        const meta = [scope, item.label_ar ?? "", item.partner_date ?? ""]
          .filter(Boolean)
          .join(" · ");
        return {
          id: item.id,
          href: `/dashboard/partners/${item.id}`,
          title: item.title_ar || t("untitled", lang),
          status: item.status,
          enStatus: item.en_status,
          updatedAt: item.updated_at,
          meta: meta || undefined,
        };
      })}
    />
  );
}
