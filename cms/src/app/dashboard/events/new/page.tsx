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
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8 font-sans lg:px-10">
      <header className="flex items-center justify-between border-b border-crs-border pb-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-crs-muted">Events</p>
          <h1 className="text-3xl font-semibold tracking-tight text-crs-ink">Create event</h1>
        </div>
        <Link href="/dashboard/events" className="inline-flex min-h-11 items-center text-sm text-crs-primary hover:underline">
          Back
        </Link>
      </header>
      <EventEditorForm mode="create" orgUnits={orgs} />
    </main>
  );
}
