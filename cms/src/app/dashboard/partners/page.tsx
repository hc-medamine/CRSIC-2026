import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { listPartnersForUser } from "@/lib/content/partners";
import { canAccessContentType } from "@/lib/content/permissions";
import { EnStatusBadge } from "@/app/dashboard/en-status-badge";

export default async function PartnersListPage() {
  const user = await requireUser();
  if (!(await canAccessContentType(user, "partner"))) redirect("/dashboard");
  const items = await listPartnersForUser(user);

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-12 font-sans">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-zinc-500">CRSIC CMS · Step 5</p>
          <h1 className="text-2xl font-semibold text-zinc-900">Partners</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Draft → review → publish to public partners.json (intl / nat).
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/dashboard/partners/new" className="rounded bg-zinc-900 px-3 py-1.5 text-white">
            New partner
          </Link>
          <Link href="/dashboard" className="underline">
            ← Home
          </Link>
        </div>
      </header>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-zinc-500">No partners yet.</p>
      ) : (
        <ul className="divide-y rounded-lg border border-zinc-200 bg-white shadow-sm">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <Link href={`/dashboard/partners/${item.id}`} className="font-medium underline">
                  {item.title_ar || "(untitled)"}
                </Link>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  <span>
                    {item.status} · {item.partner_scope} · {item.label_ar} · {item.partner_date}
                  </span>
                  <EnStatusBadge status={item.en_status} />
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
