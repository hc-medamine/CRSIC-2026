import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { listAlertsForUser } from "@/lib/content/alerts";
import { canAccessContentType } from "@/lib/content/permissions";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { ContentListPage } from "@/app/dashboard/content-list-page";

export default async function AlertsListPage() {
  const user = await requireUser();
  if (!(await canAccessContentType(user, "alert"))) redirect("/dashboard");
  const items = await listAlertsForUser(user);
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);

  return (
    <ContentListPage
      breadcrumbs={[
        { href: "/dashboard", label: t("home", lang) },
        { label: t("alerts", lang) },
      ]}
      title={t("alerts", lang)}
      subtitle="At most one alert is live at a time"
      newHref="/dashboard/alerts/new"
      newLabel="New alert"
      emptyLabel="No alerts yet."
      items={items.map((item) => ({
        id: item.id,
        href: `/dashboard/alerts/${item.id}`,
        title: item.title_ar || "(untitled)",
        status: item.status,
        enStatus: item.en_status,
        updatedAt: item.updated_at,
        meta: item.alert_link_url ?? undefined,
      }))}
    />
  );
}
