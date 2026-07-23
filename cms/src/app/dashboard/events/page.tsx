import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { listEventsForUser } from "@/lib/content/events";
import { canAccessContentType } from "@/lib/content/permissions";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { EnStatusBadge } from "@/app/dashboard/en-status-badge";
import { ContentListFilters, filterContentItems } from "@/app/dashboard/content-list-filters";
import { IconPlus } from "@/app/dashboard/cms-icons";
import { PageBreadcrumb, StatusPill } from "@/app/dashboard/ui-bits";

export default async function EventsListPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; status?: string }>;
}) {
  const user = await requireUser();
  if (!(await canAccessContentType(user, "event"))) redirect("/dashboard");
  const params = (await searchParams) ?? {};
  const q = (params.q ?? "").trim();
  const statusFilter = (params.status ?? "").trim();
  const items = filterContentItems(await listEventsForUser(user), q, statusFilter);
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 font-sans lg:px-10">
      <PageBreadcrumb
        items={[
          { href: "/dashboard", label: t("home", lang) },
          { label: t("events", lang) },
        ]}
      />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-crs-ink">{t("events", lang)}</h1>
          <p className="mt-1 text-sm text-crs-muted">Draft → review → publish</p>
        </div>
        <Link
          href="/dashboard/events/new"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-crs-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-crs-secondary"
        >
          <IconPlus className="h-4 w-4" />
          New event
        </Link>
      </header>

      <ContentListFilters q={params.q ?? ""} status={statusFilter} placeholder="Search events…" />

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-crs-border bg-crs-surface p-8 text-sm text-crs-muted">
          No events yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-crs-border bg-crs-surface shadow-[0_1px_3px_rgba(26,46,38,0.06)]">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-crs-border bg-crs-bg/80 text-xs uppercase tracking-wide text-crs-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">EN</th>
                <th className="px-4 py-3 font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-crs-border/70">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-crs-bg/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/events/${item.id}`}
                      className="font-medium text-crs-ink hover:text-crs-primary hover:underline"
                      dir="auto"
                    >
                      {item.title_ar || "(untitled)"}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={item.status} />
                  </td>
                  <td className="px-4 py-3">
                    <EnStatusBadge status={item.en_status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-crs-muted">
                    {item.updated_at.toISOString().slice(0, 16).replace("T", " ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-crs-border/70 px-4 py-3 text-xs text-crs-muted">
            Showing {items.length} result{items.length === 1 ? "" : "s"}
          </div>
        </div>
      )}
    </main>
  );
}
