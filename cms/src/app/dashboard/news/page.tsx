import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { listNewsForUser } from "@/lib/content/news";
import { canAccessContentType } from "@/lib/content/permissions";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { ContentListFilters } from "@/app/dashboard/content-list-filters";
import { ContentListPage } from "@/app/dashboard/content-list-page";

export default async function NewsListPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const user = await requireUser();
  if (!(await canAccessContentType(user, "news"))) {
    redirect("/dashboard");
  }
  const params = (await searchParams) ?? {};
  const q = (params.q ?? "").trim();
  const statusFilter = (params.status ?? "").trim();
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);

  const listed = await listNewsForUser(user, {
    page: params.page,
    q,
    status: statusFilter,
    slice: "window",
  });

  return (
    <ContentListPage
      key={`${q}|${statusFilter}`}
      breadcrumbs={[
        { href: "/dashboard", label: t("home", lang) },
        { label: t("news", lang) },
      ]}
      title={t("news", lang)}
      subtitle={t("pageDescNews", lang)}
      newHref="/dashboard/news/new"
      newLabel={t("newArticle", lang)}
      emptyLabel={t("emptyNews", lang)}
      listHref="/dashboard/news"
      filtersActive={Boolean(q || statusFilter)}
      toolbar={
        <ContentListFilters
          q={params.q ?? ""}
          status={statusFilter}
          placeholder={t("searchNews", lang)}
        />
      }
      loadMore={{
        apiPath: "/api/news",
        itemHrefBase: "/dashboard/news",
        page: listed.page,
        hasMore: listed.hasMore,
        q,
        status: statusFilter,
      }}
      items={listed.items.map((item) => ({
        id: item.id,
        href: `/dashboard/news/${item.id}`,
        title: item.title_ar || t("untitled", lang),
        status: item.status,
        enStatus: item.en_status,
        updatedAt: item.updated_at,
      }))}
    />
  );
}
