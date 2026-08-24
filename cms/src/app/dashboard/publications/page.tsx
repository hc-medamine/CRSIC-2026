import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { listPublicationsForUser } from "@/lib/content/publications";
import { canAccessContentType, listBulkChrome } from "@/lib/content/permissions";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { ContentListFilters } from "@/app/dashboard/content-list-filters";
import { ContentListPage } from "@/app/dashboard/content-list-page";

export default async function PublicationsListPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const user = await requireUser();
  if (!(await canAccessContentType(user, "publication"))) redirect("/dashboard");
  const bulkChrome = listBulkChrome(user);
  const params = (await searchParams) ?? {};
  const q = (params.q ?? "").trim();
  const statusFilter = (params.status ?? "").trim();
  const listed = await listPublicationsForUser(user, {
    page: params.page,
    q,
    status: statusFilter,
    slice: "window",
  });
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);

  return (
    <ContentListPage
      key={`${q}|${statusFilter}`}
      breadcrumbs={[
        { href: "/dashboard", label: t("home", lang) },
        { label: t("publications", lang) },
      ]}
      title={t("publications", lang)}
      subtitle={t("pageDescPublications", lang)}
      newHref="/dashboard/publications/new"
      newLabel={t("newPublication", lang)}
      emptyLabel={t("emptyPublications", lang)}
      listHref="/dashboard/publications"
      filtersActive={Boolean(q || statusFilter)}
      toolbar={
        <ContentListFilters
          q={params.q ?? ""}
          status={statusFilter}
          placeholder={t("searchPublications", lang)}
        />
      }
      loadMore={{
        apiPath: "/api/publications",
        itemHrefBase: "/dashboard/publications",
        page: listed.page,
        hasMore: listed.hasMore,
        q,
        status: statusFilter,
      }}
      bulk={
        bulkChrome
          ? { apiPath: "/api/publications/bulk", kind: "publication", ...bulkChrome }
          : undefined
      }
      items={listed.items.map((item) => ({
        id: item.id,
        href: `/dashboard/publications/${item.id}`,
        title: item.title_ar || t("untitled", lang),
        status: item.status,
        enStatus: item.en_status,
        updatedAt: item.updated_at,
      }))}
    />
  );
}
