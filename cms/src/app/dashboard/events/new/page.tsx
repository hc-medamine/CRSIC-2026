import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { canAccessContentType } from "@/lib/content/permissions";
import { listSelectableOrgUnits } from "@/lib/users";
import { EventEditorForm } from "../event-form";

export default async function NewEventPage() {
  const user = await requireUser();
  if (!(await canAccessContentType(user, "event"))) redirect("/dashboard");
  const orgs = await listSelectableOrgUnits(user, "event");

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-12 font-sans">
      <header className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-zinc-500">Events</p>
          <h1 className="text-2xl font-semibold">Create event</h1>
        </div>
        <Link href="/dashboard/events" className="text-sm underline">
          ← Back
        </Link>
      </header>
      <EventEditorForm mode="create" orgUnits={orgs} />
    </main>
  );
}
