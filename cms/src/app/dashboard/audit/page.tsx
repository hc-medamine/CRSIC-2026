import Link from "next/link";
import { requireSuperAdmin } from "@/lib/users";
import { listAuditLog } from "@/lib/audit";

type Props = { searchParams: Promise<{ action?: string }> };

export default async function AuditLogPage({ searchParams }: Props) {
  await requireSuperAdmin();
  const { action } = await searchParams;
  const rows = await listAuditLog({ action: action || undefined, limit: 150 });

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-12 font-sans">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-zinc-500">CRSIC CMS · Super Admin</p>
          <h1 className="text-2xl font-semibold text-zinc-900">Audit log</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Append-only record of auth, user admin, content lifecycle, uploads, and publish.
          </p>
        </div>
        <Link href="/dashboard" className="text-sm underline">
          ← Dashboard
        </Link>
      </header>

      <form className="flex flex-wrap items-end gap-2 text-sm">
        <label>
          <span className="font-medium">Filter action</span>
          <input
            name="action"
            defaultValue={action ?? ""}
            placeholder="e.g. auth.login.success"
            className="mt-1 block w-64 rounded border px-3 py-2"
          />
        </label>
        <button type="submit" className="rounded bg-zinc-900 px-3 py-2 text-white">
          Apply
        </button>
        {action ? (
          <Link href="/dashboard/audit" className="underline">
            Clear
          </Link>
        ) : null}
      </form>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-zinc-500">
          No audit entries yet.
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
