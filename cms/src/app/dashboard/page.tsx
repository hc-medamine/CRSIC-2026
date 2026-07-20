import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { LogoutButton } from "./logout-button";

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-12 font-sans">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-zinc-500">CRSIC CMS</p>
          <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
        </div>
        <LogoutButton />
      </header>

      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-zinc-900">Signed in</h2>
        <dl className="mt-4 grid gap-2 text-sm text-zinc-700">
          <div>
            <dt className="inline font-medium">Display name: </dt>
            <dd className="inline">{user.displayName}</dd>
          </div>
          <div>
            <dt className="inline font-medium">Email: </dt>
            <dd className="inline">{user.email}</dd>
          </div>
          <div>
            <dt className="inline font-medium">Role: </dt>
            <dd className="inline">{user.role}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-zinc-500">Session idle timeout is 30 minutes (PRD).</p>
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          <li>
            <Link className="font-medium underline" href="/dashboard/profile">
              My profile →
            </Link>
          </li>
          {user.role === "super_admin" ? (
            <li>
              <Link className="font-medium underline" href="/dashboard/users">
                User management →
              </Link>
            </li>
          ) : null}
        </ul>
      </section>
    </main>
  );
}
