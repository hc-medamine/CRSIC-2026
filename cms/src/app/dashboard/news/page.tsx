import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { listNewsForUser } from "@/lib/content/news";
import { canAccessContentType } from "@/lib/content/permissions";
import { redirect } from "next/navigation";
import { EnStatusBadge } from "@/app/dashboard/en-status-badge";

export default async function NewsListPage() {
  const user = await requireUser();
  if (!(await canAccessContentType(user, "news"))) {
    redirect("/dashboard");
  }
  const items = await listNewsForUser(user);

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-12 font-sans">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-zinc-500">CRSIC CMS · Step 4</p>
          <h1 className="text-2xl font-semibold text-zinc-900">News</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Draft → submit → review → publish (P1 writes Arabic title/label/image to public news.json).
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/dashboard/news/new" className="rounded bg-zinc-900 px-3 py-1.5 text-white">
            New news
          </Link>
          <Link href="/dashboard" className="underline">
            ← Dashboard
          </Link>
        </div>
      </header>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-zinc-500">
          No news items yet.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border border-zinc-200 bg-white shadow-sm">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <Link href={`/dashboard/news/${item.id}`} className="font-medium underline">
                  {item.title_ar || "(untitled)"}
                </Link>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  <span>
                    {item.status} · {item.org_unit_id}
                  </span>
                  <EnStatusBadge status={item.en_status} />
                </p>
              </div>
              <span className="text-xs text-zinc-400">
                {item.updated_at.toISOString().slice(0, 16).replace("T", " ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
