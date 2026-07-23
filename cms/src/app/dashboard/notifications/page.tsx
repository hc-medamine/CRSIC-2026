import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { countUnread, listNotificationsForUser } from "@/lib/notifications";
import { NotificationsClient } from "./notifications-client";

export default async function NotificationsPage() {
  const user = await requireUser();
  const [items, unread] = await Promise.all([
    listNotificationsForUser(user.id),
    countUnread(user.id),
  ]);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-12 font-sans">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-zinc-500">CRSIC CMS · Step 3</p>
          <h1 className="text-2xl font-semibold text-zinc-900">Notifications</h1>
          <p className="mt-1 text-sm text-zinc-600">
            In-app only (no email). Workflow events will appear here when content review ships.
          </p>
        </div>
        <Link href="/dashboard" className="text-sm underline">
          ← Home
        </Link>
      </header>

      <NotificationsClient
        initialUnread={unread}
        initialItems={items.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          linkPath: n.link_path,
          readAt: n.read_at?.toISOString() ?? null,
          createdAt: n.created_at.toISOString(),
        }))}
      />
    </main>
  );
}
