import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/session";
import { countUnread, listNotificationsForUser } from "@/lib/notifications";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { AdminPageShell } from "@/app/dashboard/desk-ui";
import { NOTIFICATIONS_FETCH_LIMIT } from "@/lib/cms-limits";
import { NotificationsClient } from "./notifications-client";

export default async function NotificationsPage() {
  const user = await requireUser();
  const [items, unread] = await Promise.all([
    listNotificationsForUser(user.id, NOTIFICATIONS_FETCH_LIMIT),
    countUnread(user.id),
  ]);
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);

  return (
    <AdminPageShell
      breadcrumbs={[
        { href: "/dashboard", label: t("home", lang) },
        { label: t("notifications", lang) },
      ]}
      title={t("notifications", lang)}
      subtitle={t("notificationsHint", lang)}
      wide={false}
    >
      <NotificationsClient
        fetchLimit={NOTIFICATIONS_FETCH_LIMIT}
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
    </AdminPageShell>
  );
}
