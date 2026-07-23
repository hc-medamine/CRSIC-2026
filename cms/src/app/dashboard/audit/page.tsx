import { cookies } from "next/headers";
import Link from "next/link";
import { requireSuperAdmin } from "@/lib/users";
import { listAuditLog } from "@/lib/audit";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { PageBreadcrumb } from "@/app/dashboard/ui-bits";

type Props = {
  searchParams: Promise<{
    action?: string;
    actor?: string;
    entityType?: string;
    from?: string;
    to?: string;
  }>;
};

function hasFilters(p: {
  action?: string;
  actor?: string;
  entityType?: string;
  from?: string;
  to?: string;
}): boolean {
  return Boolean(
    p.action?.trim() ||
      p.actor?.trim() ||
      p.entityType?.trim() ||
      p.from?.trim() ||
      p.to?.trim(),
  );
}

export default async function AuditLogPage({ searchParams }: Props) {
  await requireSuperAdmin();
  const params = await searchParams;
  const action = params.action?.trim() || undefined;
  const actor = params.actor?.trim() || undefined;
  const entityType = params.entityType?.trim() || undefined;
  const from = params.from?.trim() || undefined;
  const to = params.to?.trim() || undefined;
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);

  const rows = await listAuditLog({
    action,
    actorEmail: actor,
    entityType,
    from,
    to,
    limit: 150,
  });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 font-sans lg:px-10">
      <PageBreadcrumb
        items={[
          { href: "/dashboard", label: t("home", lang) },
          { label: t("audit", lang) },
        ]}
      />
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-crs-ink">{t("audit", lang)}</h1>
        <p className="mt-1 text-sm text-crs-muted">
          Append-only record of auth, user admin, content lifecycle, uploads, and publish.
        </p>
      </header>

      <form method="get" className="grid gap-3 rounded-2xl border border-crs-border bg-crs-surface p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <label>
          <span className="font-medium">Action</span>
          <input
            name="action"
            defaultValue={action ?? ""}
            placeholder="e.g. auth.login.success"
            className="mt-1 block w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
          />
        </label>
        <label>
          <span className="font-medium">Actor email</span>
          <input
            name="actor"
            defaultValue={actor ?? ""}
            placeholder="exact email"
            className="mt-1 block w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
          />
        </label>
        <label>
          <span className="font-medium">Entity type</span>
          <input
            name="entityType"
            defaultValue={entityType ?? ""}
            placeholder="e.g. news, media, user"
            className="mt-1 block w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
          />
        </label>
        <div className="grid grid-cols-2 gap-3 sm:col-span-2 lg:col-span-2">
          <label>
            <span className="font-medium">From</span>
            <input
              name="from"
              type="date"
              defaultValue={from ?? ""}
              className="mt-1 block w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
            />
          </label>
          <label>
            <span className="font-medium">To</span>
            <input
              name="to"
              type="date"
              defaultValue={to ?? ""}
              className="mt-1 block w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-3">
          <button type="submit" className="rounded-lg bg-crs-primary hover:bg-crs-secondary px-3 py-2 text-white">
            Apply
          </button>
          {hasFilters(params) ? (
            <Link href="/dashboard/audit" className="inline-flex min-h-11 items-center text-sm text-crs-primary hover:underline">
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-crs-border p-6 text-sm text-crs-muted">
          No audit entries match these filters.
        </p>
      ) : (
        <ul className="divide-y rounded-2xl border border-crs-border bg-crs-surface shadow-sm">
          {rows.map((row) => (
            <li key={row.id} className="px-4 py-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <code className="text-xs font-semibold text-crs-ink">{row.action}</code>
                <time className="text-xs text-crs-muted">{row.created_at.toISOString()}</time>
              </div>
              <p className="mt-1 text-crs-ink">{row.summary}</p>
              <p className="mt-1 text-xs text-crs-muted">
                {row.actor_email ?? "(no actor)"}
                {row.entity_type ? ` · ${row.entity_type}` : ""}
                {row.entity_id ? `:${row.entity_id.slice(0, 8)}` : ""}
                {row.ip ? ` · ${row.ip}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
