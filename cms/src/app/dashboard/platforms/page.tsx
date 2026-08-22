import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { listPlatformsForUser } from "@/lib/content/platforms";
import { canAccessContentType, canReview } from "@/lib/content/permissions";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { ContentListPage } from "@/app/dashboard/content-list-page";

export default async function PlatformsListPage() {
  const user = await requireUser();
  if (!(await canAccessContentType(user, "platform"))) redirect("/dashboard");
  const items = await listPlatformsForUser(user);
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);

  return (
    <ContentListPage
      breadcrumbs={[
        { href: "/dashboard", label: t("home", lang) },
        { label: t("platforms", lang) },
      ]}
      title={t("platforms", lang)}
      subtitle={t("pageDescPlatforms", lang)}
      newHref="/dashboard/platforms/new"
      newLabel={t("newPlatform", lang)}
      emptyLabel={t("emptyPlatforms", lang)}
      bulk={
        canReview(user)
          ? { apiPath: "/api/platforms/bulk", canRecycle: user.role === "super_admin", kind: "platform" }
          : undefined
      }
      items={items.map((item) => ({
        id: item.id,
        href: `/dashboard/platforms/${item.id}`,
        title: item.title_ar || t("untitled", lang),
        status: item.status,
        enStatus: item.en_status,
        updatedAt: item.updated_at,
        meta: item.platform_kind ?? undefined,
      }))}
    />
  );
}
