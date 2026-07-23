import Link from "next/link";
import {
  listAssignedEditors,
  listEditorContentTypeClaims,
  listOrgUnits,
  requireReviewerOrSuperAdmin,
} from "@/lib/users";
import { EditorsScopeManager } from "./editors-scope-manager";

export default async function EditorsPage() {
  const user = await requireReviewerOrSuperAdmin();
  const [editors, orgUnits, claims] = await Promise.all([
    listAssignedEditors(user),
    listOrgUnits(),
    listEditorContentTypeClaims(),
  ]);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-12 font-sans">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-zinc-500">CRSIC CMS</p>
          <h1 className="text-2xl font-semibold text-zinc-900">Editors</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Light scope manager — content types for assigned Editors (globally exclusive, org
            catalog constrained).
          </p>
        </div>
        <Link href="/dashboard" className="text-sm underline">
          ← Dashboard
        </Link>
      </header>

      <EditorsScopeManager
        initialEditors={editors}
        initialOrgUnits={orgUnits}
        initialClaims={claims}
        actorRole={user.role === "super_admin" ? "super_admin" : "reviewer"}
      />
    </main>
  );
}
