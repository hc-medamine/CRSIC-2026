import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { canAccessContentType, getUserOrgIds } from "@/lib/content/permissions";
import { listOrgUnits } from "@/lib/users";
import { PartnerEditorForm } from "../partner-form";

export default async function NewPartnerPage() {
  const user = await requireUser();
  if (!(await canAccessContentType(user, "partner"))) redirect("/dashboard");
  const allOrgs = await listOrgUnits();
  const orgIds =
    user.role === "super_admin" || user.role === "reviewer"
      ? allOrgs.map((o) => o.id)
      : await getUserOrgIds(user.id);
  const orgs = allOrgs.filter((o) => orgIds.includes(o.id));

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-12 font-sans">
      <header className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-zinc-500">Partners</p>
          <h1 className="text-2xl font-semibold">Create partner</h1>
        </div>
        <Link href="/dashboard/partners" className="text-sm underline">
          ← Back
        </Link>
      </header>
      <PartnerEditorForm mode="create" orgUnits={orgs} />
    </main>
  );
}
