import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { canAccessContentType } from "@/lib/content/permissions";
import { listSelectableOrgUnits } from "@/lib/users";
import { PublicationEditorForm } from "../publication-form";

export default async function NewPublicationPage() {
  const user = await requireUser();
  if (!(await canAccessContentType(user, "publication"))) redirect("/dashboard");
  const orgs = await listSelectableOrgUnits(user, "publication");

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-12 font-sans">
      <header className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-zinc-500">Publications</p>
          <h1 className="text-2xl font-semibold">Create publication</h1>
        </div>
        <Link href="/dashboard/publications" className="text-sm underline">
          ← Back
        </Link>
      </header>
      <PublicationEditorForm mode="create" orgUnits={orgs} />
    </main>
  );
}
