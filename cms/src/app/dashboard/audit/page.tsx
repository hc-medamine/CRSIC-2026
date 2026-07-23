import Link from "next/link";
import { requireSuperAdmin } from "@/lib/users";
import { listAuditLog } from "@/lib/audit";

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

  const rows = await listAuditLog({
    action,
    actorEmail: actor,
    entityType,
    from,
    to,
    limit: 150,
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-12 font-sans">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-zinc-500">CRSIC CMS · Super Admin</p>
          <h1 className="text-2xl font-semibold text-zinc-900">Audit log</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Append-only record of auth, user admin, content lifecycle, uploads, and publish. Filters
            use indexed columns (action, actor, entity, date).
          </p>
        </div>
        <Link href="/dashboard" className="text-sm underline">
          ← Home
        </Link>
      </header>

      <form method="get" className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <label>
          <span className="font-medium">Action</span>
          <input
            name="action"
            defaultValue={action ?? ""}
            placeholder="e.g. auth.login.success"
            className="mt-1 block w-full rounded border px-3 py-2"
          />
        </label>
        <label>
          <span className="font-medium">Actor email</span>
          <input
            name="actor"
            defaultValue={actor ?? ""}
            placeholder="exact email"
            className="mt-1 block w-full rounded border px-3 py-2"
          />
        </label>
        <label>
          <span className="font-medium">Entity type</span>
          <input
            name="entityType"
            defaultValue={entityType ?? ""}
            placeholder="e.g. news, media, user"
            className="mt-1 block w-full rounded border px-3 py-2"
          />
        </label>
        <div className="grid grid-cols-2 gap-3 sm:col-span-2 lg:col-span-2">
          <label>
            <span className="font-medium">From</span>
            <input
              name="from"
              type="date"
              defaultValue={from ?? ""}
              className="mt-1 block w-full rounded border px-3 py-2"
            />
          </label>
          <label>
            <span className="font-medium">To</span>
            <input
              name="to"
              type="date"
              defaultValue={to ?? ""}
              className="mt-1 block w-full rounded border px-3 py-2"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-3">
          <button type="submit" className="rounded bg-zinc-900 px-3 py-2 text-white">
            Apply
          </button>
          {hasFilters(params) ? (
            <Link href="/dashboard/audit" className="underline">
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-zinc-500">
          No audit entries match these filters.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border border-zinc-200 bg-white shadow-sm">
          {rows.map((row) => (
            <li key={row.id} className="px-4 py-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <code className="text-xs font-semibold text-zinc-900">{row.action}</code>
                <time className="text-xs text-zinc-500">{row.created_at.toISOString()}</time>
              </div>
              <p className="mt-1 text-zinc-800">{row.summary}</p>
              <p className="mt-1 text-xs text-zinc-500">
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
