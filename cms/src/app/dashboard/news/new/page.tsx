import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { canAccessContentType } from "@/lib/content/permissions";
import { listSelectableOrgUnits } from "@/lib/users";
import { NewsEditorForm } from "../news-form";

export default async function NewNewsPage() {
  const user = await requireUser();
  if (!(await canAccessContentType(user, "news"))) redirect("/dashboard");

  const orgs = await listSelectableOrgUnits(user, "news");

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-12 font-sans">
      <header className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-zinc-500">News</p>
          <h1 className="text-2xl font-semibold">Create news</h1>
        </div>
        <Link href="/dashboard/news" className="text-sm underline">
          ← Back
        </Link>
      </header>
      <NewsEditorForm mode="create" orgUnits={orgs} />
    </main>
  );
}
