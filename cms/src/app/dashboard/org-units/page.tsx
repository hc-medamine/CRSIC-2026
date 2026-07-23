import Link from "next/link";
import { listOrgUnits, requireSuperAdmin } from "@/lib/users";
import { OrgUnitsManager } from "./org-units-manager";

export default async function OrgUnitsPage() {
  await requireSuperAdmin();
  const orgUnits = await listOrgUnits();

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-12 font-sans">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-zinc-500">CRSIC CMS</p>
          <h1 className="text-2xl font-semibold text-zinc-900">Org scopes</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Super Admin only. Type catalogs are fixed by org kind (centre-wide = SPA five;
            research dept = research_group + research_project). Manage group/project content under
            Research groups / Projects.
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/dashboard/users" className="underline">
            Users
          </Link>
          <Link href="/dashboard" className="underline">
            ← Home
          </Link>
        </div>
      </header>

      <OrgUnitsManager initialOrgUnits={orgUnits} />
    </main>
  );
}
