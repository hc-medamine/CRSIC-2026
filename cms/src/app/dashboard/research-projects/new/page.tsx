import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { canAccessContentType } from "@/lib/content/permissions";
import { listSelectableOrgUnits } from "@/lib/users";
import { ResearchProjectForm } from "../project-form";

export default async function NewResearchProjectPage() {
  const user = await requireUser();
  if (!(await canAccessContentType(user, "research_project"))) redirect("/dashboard");
  const orgs = await listSelectableOrgUnits(user, "research_project");

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-12 font-sans">
      <header className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-zinc-500">Research projects</p>
          <h1 className="text-2xl font-semibold">Create research project</h1>
        </div>
        <Link href="/dashboard/research-projects" className="text-sm underline">
          ← Back
        </Link>
      </header>
      <ResearchProjectForm mode="create" orgUnits={orgs} />
    </main>
  );
}
