import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { listEventsForUser } from "@/lib/content/events";
import { canAccessContentType } from "@/lib/content/permissions";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { ContentListFilters } from "@/app/dashboard/content-list-filters";
import { ContentListPage } from "@/app/dashboard/content-list-page";

export default async function EventsListPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const user = await requireUser();
  if (!(await canAccessContentType(user, "event"))) redirect("/dashboard");
  const params = (await searchParams) ?? {};
  const q = (params.q ?? "").trim();
  const statusFilter = (params.status ?? "").trim();
  const listed = await listEventsForUser(user, {
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
        { label: t("events", lang) },
      ]}
      title={t("events", lang)}
      subtitle={t("pageDescEvents", lang)}
      newHref="/dashboard/events/new"
      newLabel={t("newEvent", lang)}
      emptyLabel={t("emptyEvents", lang)}
      listHref="/dashboard/events"
      filtersActive={Boolean(q || statusFilter)}
      toolbar={
        <ContentListFilters
          q={params.q ?? ""}
          status={statusFilter}
          placeholder={t("searchEvents", lang)}
        />
      }
      loadMore={{
        apiPath: "/api/events",
        itemHrefBase: "/dashboard/events",
        page: listed.page,
        hasMore: listed.hasMore,
        q,
        status: statusFilter,
      }}
      items={listed.items.map((item) => ({
        id: item.id,
        href: `/dashboard/events/${item.id}`,
        title: item.title_ar || t("untitled", lang),
        status: item.status,
        enStatus: item.en_status,
        updatedAt: item.updated_at,
      }))}
    />
  );
}
