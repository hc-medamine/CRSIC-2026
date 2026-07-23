import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/session";
import { countUnread, listNotificationsForUser } from "@/lib/notifications";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { PageBreadcrumb } from "@/app/dashboard/ui-bits";
import { NotificationsClient } from "./notifications-client";

export default async function NotificationsPage() {
  const user = await requireUser();
  const [items, unread] = await Promise.all([
    listNotificationsForUser(user.id),
    countUnread(user.id),
  ]);
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-8 font-sans lg:px-10">
      <PageBreadcrumb
        items={[
          { href: "/dashboard", label: t("home", lang) },
          { label: t("notifications", lang) },
        ]}
      />
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-crs-ink">
          {t("notifications", lang)}
        </h1>
        <p className="mt-1 text-sm text-crs-muted">In-app only (no email).</p>
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
