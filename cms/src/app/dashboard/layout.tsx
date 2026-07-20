import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { requireUser, type SessionUser } from "@/lib/auth/session";
import { countUnread } from "@/lib/notifications";
import { CMS_LANG_COOKIE, normalizeLang } from "@/lib/i18n/labels";
import { SessionTouch } from "./session-touch";
import { CmsChrome } from "./cms-chrome";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let user: SessionUser;
  try {
    user = await requireUser();
  } catch {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);
  const unread = await countUnread(user.id);

  return (
    <>
      <SessionTouch />
      <CmsChrome
        initialLang={lang}
        role={user.role}
        unread={unread}
        displayName={user.displayName}
        email={user.email}
      >
        {children}
      </CmsChrome>
    </>
  );
}
