import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { requireUser } from "@/lib/auth/session";
import {
  canAccessFeaturedNews,
  canPublishFeaturedNews,
  getSiteFeaturedNews,
  isUsingFallback,
  listLiveNewsForFeatured,
} from "@/lib/content/featuredNews";
import { EditPageShell } from "@/app/dashboard/content-list-page";
import { FeaturedNewsForm } from "./featured-news-form";

export default async function FeaturedNewsPage() {
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);
  const user = await requireUser();
  if (!(await canAccessFeaturedNews(user))) redirect("/dashboard");

  const [row, liveNews] = await Promise.all([
    getSiteFeaturedNews(),
    listLiveNewsForFeatured(user),
  ]);
  if (!row) {
    return (
      <EditPageShell
        breadcrumbs={[
          { href: "/dashboard", label: t("home", lang) },
          { href: "/dashboard/news", label: t("news", lang) },
          { label: t("featuredNews", lang) },
        ]}
        title={t("featuredNewsTitle", lang)}
      >
        <p className="text-sm text-red-700">{t("featuredNewsMissingRow", lang)}</p>
      </EditPageShell>
    );
  }

  return (
    <EditPageShell
      breadcrumbs={[
        { href: "/dashboard", label: t("home", lang) },
        { href: "/dashboard/news", label: t("news", lang) },
        { label: t("featuredNews", lang) },
      ]}
      title={t("featuredNewsTitle", lang)}
    >
      <FeaturedNewsForm
        initial={{
          draftIds: row.draft_ids || [],
          liveIds: row.live_ids || [],
          publishedAt: row.published_at ? row.published_at.toISOString() : null,
          updatedAt: row.updated_at.toISOString(),
          usingFallback: isUsingFallback(row, (row.live_ids || []).length),
        }}
        liveNews={liveNews}
        canPublish={canPublishFeaturedNews(user)}
      />
    </EditPageShell>
  );
}
