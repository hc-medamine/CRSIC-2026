import Link from "next/link";
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
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8">
        <p className="text-sm text-red-700">{t("featuredNewsMissingRow", lang)}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8 font-sans lg:px-10">
      <header className="flex items-center justify-between border-b border-crs-border pb-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-crs-muted">{t("featuredNews", lang)}</p>
          <h1 className="text-3xl font-semibold tracking-tight text-crs-ink">
            {t("featuredNewsTitle", lang)}
          </h1>
        </div>
        <Link
          href="/dashboard/news"
          className="inline-flex min-h-11 items-center text-sm text-crs-primary hover:underline"
        >
          {t("backToList", lang)}
        </Link>
      </header>

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
    </main>
  );
}
