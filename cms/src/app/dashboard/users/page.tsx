import Link from "next/link";
import { requireSuperAdmin, listOrgUnits, listUsers } from "@/lib/users";
import { UsersManager } from "./users-manager";

export default async function UsersPage() {
  await requireSuperAdmin();
  const [users, orgUnits] = await Promise.all([listUsers(), listOrgUnits()]);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-12 font-sans">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-zinc-500">CRSIC CMS · Step 1</p>
          <h1 className="text-2xl font-semibold text-zinc-900">User management</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Super Admin only. Create users, assign exclusive Reviewer orgs, deactivate, reset
            passwords, or hard-delete. Manage organisation units on{" "}
            <Link href="/dashboard/org-units" className="underline">
              Org scopes
            </Link>
            .
          </p>
        </div>
        <Link href="/dashboard" className="text-sm underline">
          ← Home
        </Link>
      </header>

      <UsersManager initialUsers={users} orgUnits={orgUnits} />
    </main>
  );
}
